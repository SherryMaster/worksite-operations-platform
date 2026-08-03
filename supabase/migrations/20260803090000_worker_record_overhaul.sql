set session_replication_role = replica;

alter table public.document_types
  add column system_code text,
  add column expects_document_number boolean not null default false,
  add column is_repeatable boolean not null default false,
  add column metadata_fields jsonb not null default '[]'::jsonb;

alter table public.document_types
  add constraint document_types_system_code_format
  check (system_code is null or system_code ~ '^[A-Z][A-Z0-9_]{1,39}$'),
  add constraint document_types_metadata_fields_array
  check (jsonb_typeof(metadata_fields) = 'array');

create unique index document_types_system_code_unique
on public.document_types (system_code)
where system_code is not null;

update public.document_types
set
  system_code = case lower(btrim(name))
    when 'cnic' then 'CNIC'
    when 'passport' then 'PASSPORT'
    when 'work permit' then 'WORK_PERMIT'
    when 'other' then 'OTHER'
  end,
  expects_document_number = lower(btrim(name)) in (
    'cnic', 'passport', 'work permit'
  ),
  metadata_fields = case lower(btrim(name))
    when 'cnic' then '["issuingCountry"]'::jsonb
    when 'passport' then '["issuingCountry"]'::jsonb
    when 'work permit' then
      '["permitType","issuingAuthority","employerSponsor"]'::jsonb
    when 'other' then '["issuer","notes"]'::jsonb
    else '[]'::jsonb
  end
where lower(btrim(name)) in ('cnic', 'passport', 'work permit', 'other');

insert into public.document_types (
  name,
  system_code,
  expects_document_number,
  expects_issue_date,
  expects_expiry_date,
  metadata_fields,
  created_by,
  updated_by
)
select
  seed.name,
  seed.system_code,
  seed.expects_document_number,
  seed.expects_issue_date,
  seed.expects_expiry_date,
  seed.metadata_fields,
  application_users.id,
  application_users.id
from (
  values
    (
      'CNIC', 'CNIC', true, false, false,
      '["issuingCountry"]'::jsonb
    ),
    (
      'Passport', 'PASSPORT', true, true, true,
      '["issuingCountry"]'::jsonb
    ),
    (
      'Work Permit', 'WORK_PERMIT', true, true, true,
      '["permitType","issuingAuthority","employerSponsor"]'::jsonb
    ),
    (
      'CIDB Construction Personnel Registration',
      'CIDB_REGISTRATION',
      true,
      true,
      true,
      '["registrationCategory"]'::jsonb
    ),
    (
      'Safety/Health Induction Certificate',
      'SAFETY_CERTIFICATE',
      true,
      true,
      true,
      '["certificateType","provider"]'::jsonb
    ),
    (
      'FOMEMA/Medical Fitness Certificate',
      'MEDICAL_CERTIFICATE',
      true,
      true,
      true,
      '["providerClinic","examinationDate"]'::jsonb
    ),
    (
      'i-Kad / foreign-worker identity card',
      'IKAD',
      true,
      true,
      true,
      '["sectorCardType"]'::jsonb
    ),
    (
      'Employment Contract',
      'EMPLOYMENT_CONTRACT',
      false,
      true,
      true,
      '["employer","contractStartDate","contractEndDate"]'::jsonb
    ),
    (
      'Other', 'OTHER', false, false, false,
      '["issuer","notes"]'::jsonb
    )
) as seed(
  name,
  system_code,
  expects_document_number,
  expects_issue_date,
  expects_expiry_date,
  metadata_fields
)
cross join lateral (
  select id
  from public.application_users
  where role = 'CEO'::public.application_role
  order by created_at
  limit 1
) application_users
on conflict (lower(btrim(name))) do update
set
  system_code = excluded.system_code,
  expects_document_number = excluded.expects_document_number,
  expects_issue_date = excluded.expects_issue_date,
  expects_expiry_date = excluded.expects_expiry_date,
  metadata_fields = excluded.metadata_fields;

alter table public.worker_documents
  alter column bucket_id drop not null,
  alter column object_path drop not null,
  alter column original_filename drop not null,
  alter column mime_type drop not null,
  alter column byte_size drop not null,
  add column metadata jsonb not null default '{}'::jsonb,
  add column type_repeatable boolean not null default false,
  add column normalized_document_number text generated always as (
    nullif(regexp_replace(upper(document_number), '[^A-Z0-9]+', '', 'g'), '')
  ) stored;

do $$
declare constraint_name text;
begin
  select pg_constraint.conname into constraint_name
  from pg_constraint
  where pg_constraint.conrelid = 'public.worker_documents'::regclass
    and pg_constraint.contype = 'c'
    and pg_get_constraintdef(pg_constraint.oid) like '%file_kind%'
    and pg_get_constraintdef(pg_constraint.oid) like '%bucket_id%'
  limit 1;
  if constraint_name is not null then
    execute format(
      'alter table public.worker_documents drop constraint %I',
      constraint_name
    );
  end if;
end;
$$;

alter table public.worker_documents
  drop constraint if exists worker_documents_mime_type_check;

alter table public.worker_documents
  add constraint worker_documents_metadata_object
  check (jsonb_typeof(metadata) = 'object'),
  add constraint worker_documents_allowed_mime_type
  check (
    mime_type is null
    or mime_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  add constraint worker_documents_file_group
  check (
    (
      bucket_id is null
      and object_path is null
      and original_filename is null
      and mime_type is null
      and byte_size is null
    )
    or (
      bucket_id is not null
      and object_path is not null
      and original_filename is not null
      and mime_type is not null
      and byte_size is not null
    )
  ),
  add constraint worker_documents_kind_requirements
  check (
    (
      file_kind = 'PHOTO'
      and document_type_id is null
      and bucket_id = 'worker-photos'
      and mime_type in (
        'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
      )
    )
    or (
      file_kind = 'DOCUMENT'
      and document_type_id is not null
      and (bucket_id is null or bucket_id = 'worker-documents')
    )
  );

create or replace function private.sync_worker_document_type_configuration()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.file_kind = 'DOCUMENT' then
    select document_types.is_repeatable
    into new.type_repeatable
    from public.document_types
    where document_types.id = new.document_type_id;

    if not found then
      raise exception 'Document type not found';
    end if;
  else
    new.type_repeatable := false;
  end if;
  return new;
end;
$$;

create trigger worker_documents_sync_type_configuration
before insert or update of document_type_id, file_kind
on public.worker_documents
for each row execute function private.sync_worker_document_type_configuration();

create or replace function private.sync_documents_after_type_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.is_repeatable is distinct from old.is_repeatable then
    update public.worker_documents
    set type_repeatable = new.is_repeatable
    where document_type_id = new.id;
  end if;
  return new;
end;
$$;

create trigger document_types_sync_worker_documents
after update of is_repeatable on public.document_types
for each row execute function private.sync_documents_after_type_change();

update public.worker_documents as worker_documents
set type_repeatable = document_types.is_repeatable
from public.document_types
where document_types.id = worker_documents.document_type_id;

with ranked as (
  select
    id,
    first_value(id) over (
      partition by worker_id, document_type_id
      order by created_at desc, id desc
    ) as retained_id,
    row_number() over (
      partition by worker_id, document_type_id
      order by created_at desc, id desc
    ) as position
  from public.worker_documents
  where file_kind = 'DOCUMENT' and status = 'ACTIVE' and not type_repeatable
)
update public.worker_documents
set status = 'REPLACED', replaced_by_id = ranked.retained_id
from ranked
where worker_documents.id = ranked.id and ranked.position > 1;

create unique index worker_one_active_nonrepeatable_document
on public.worker_documents (worker_id, document_type_id)
where
  file_kind = 'DOCUMENT'
  and status = 'ACTIVE'
  and not type_repeatable;

create index worker_documents_normalized_identifier_idx
on public.worker_documents (document_type_id, normalized_document_number)
where status = 'ACTIVE' and normalized_document_number is not null;

update storage.buckets
set allowed_mime_types = case id
  when 'worker-photos' then array[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
  ]
  when 'worker-documents' then array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
  else allowed_mime_types
end,
file_size_limit = 10485760
where id in ('worker-photos', 'worker-documents');

insert into public.worker_documents (
  worker_id,
  file_kind,
  document_type_id,
  document_number,
  issue_date,
  expiry_date,
  uploaded_by
)
select
  workers.id,
  'DOCUMENT',
  document_types.id,
  legacy.document_number,
  legacy.issue_date,
  legacy.expiry_date,
  workers.created_by
from public.workers
cross join lateral (
  values
    ('CNIC', workers.cnic_number, null::date, null::date),
    ('PASSPORT', workers.passport_number, null::date, null::date),
    (
      'WORK_PERMIT',
      workers.work_permit_number,
      workers.work_permit_issue_date,
      workers.work_permit_expiry_date
    )
) as legacy(system_code, document_number, issue_date, expiry_date)
join public.document_types
  on document_types.system_code = legacy.system_code
where nullif(btrim(legacy.document_number), '') is not null
  and not exists (
    select 1
    from public.worker_documents existing
    where existing.worker_id = workers.id
      and existing.document_type_id = document_types.id
      and existing.status = 'ACTIVE'
  );

create or replace function private.normalized_worker_identifier(value text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select nullif(regexp_replace(upper(value), '[^A-Z0-9]+', '', 'g'), '');
$$;

create or replace function public.find_worker_identity_duplicate(
  p_documents jsonb,
  p_exclude_worker_id uuid default null
)
returns table(id uuid, legal_name text)
language sql
stable
security invoker
set search_path = ''
as $$
  select workers.id, workers.legal_name
  from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) input_document
  join public.document_types
    on document_types.id = (input_document ->> 'documentTypeId')::uuid
    and document_types.system_code in ('CNIC', 'PASSPORT')
  join public.worker_documents
    on worker_documents.document_type_id = document_types.id
    and worker_documents.status = 'ACTIVE'
    and worker_documents.normalized_document_number =
      private.normalized_worker_identifier(input_document ->> 'documentNumber')
  join public.workers on workers.id = worker_documents.worker_id
  where workers.id is distinct from p_exclude_worker_id
    and private.is_current_ceo()
  limit 1;
$$;

drop function if exists public.create_worker(
  text, text, text, text, text, text, text, text, date, date, text,
  public.worker_employment_status, date, uuid, uuid, integer, date, integer,
  uuid, date
);
drop function if exists public.create_worker_record(
  text, text, text, text, text, text, text, text, text, text, text,
  public.worker_employment_status, text, uuid, uuid, integer, text, integer,
  text, text
);
drop function if exists public.update_worker_profile(
  uuid, text, text, text, text, text, text, text, text, date, date, text,
  uuid, uuid, integer
);
drop function if exists public.edit_worker_profile(
  uuid, text, text, text, text, text, text, text, text, text, text, text,
  uuid, uuid, integer
);
drop function if exists public.commit_migration_batch(uuid);
drop function if exists public.register_worker_file(
  uuid, uuid, public.worker_file_kind, text, text, text, text, text, text,
  integer, text, text, text
);
drop function if exists public.remove_worker_file(uuid);

alter table public.workers
  drop column cnic_number,
  drop column passport_number,
  drop column work_permit_number,
  drop column work_permit_issue_date,
  drop column work_permit_expiry_date;

create or replace function public.save_worker_record(
  p_worker_id text,
  p_legal_name text,
  p_phone_number text,
  p_address text,
  p_nationality text,
  p_trade_id uuid,
  p_skill_level_id uuid,
  p_hourly_rate_sen integer,
  p_food_deduction_sen integer,
  p_rate_effective_on text,
  p_documents jsonb,
  p_confirm_duplicate boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  business_date date := private.current_business_date();
  target_worker_id uuid := nullif(p_worker_id, '')::uuid;
  creating boolean := target_worker_id is null;
  classification public.worker_classification_periods%rowtype;
  deduction public.worker_food_deduction_periods%rowtype;
  rate public.worker_rate_periods%rowtype;
  input_document jsonb;
  target_document_id uuid;
  target_document_type public.document_types%rowtype;
  document_ids jsonb := '{}'::jsonb;
  identity_count integer := 0;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can save workers';
  end if;
  if p_hourly_rate_sen <= 0 then
    raise exception 'Hourly rate must be greater than zero';
  end if;
  if p_food_deduction_sen < 0 then
    raise exception 'Food deduction cannot be negative';
  end if;
  if jsonb_typeof(coalesce(p_documents, '[]'::jsonb)) <> 'array' then
    raise exception 'Worker documents must be an array';
  end if;

  for input_document in
    select value from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb))
  loop
    select * into target_document_type
    from public.document_types
    where id = (input_document ->> 'documentTypeId')::uuid
      and (
        is_active
        or exists (
          select 1
          from public.worker_documents existing
          where existing.id = nullif(input_document ->> 'id', '')::uuid
            and existing.document_type_id = document_types.id
        )
      );

    if target_document_type.id is null then
      raise exception 'A selected document type is unavailable';
    end if;
    if jsonb_typeof(coalesce(input_document -> 'metadata', '{}'::jsonb)) <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(coalesce(input_document -> 'metadata', '{}'::jsonb)) as metadata_key(key)
        where not (target_document_type.metadata_fields ? metadata_key.key)
      )
      or exists (
        select 1
        from jsonb_each(coalesce(input_document -> 'metadata', '{}'::jsonb)) entry
        where jsonb_typeof(entry.value) <> 'string'
          or char_length(entry.value #>> '{}') > 300
      ) then raise exception 'Document metadata contains an unsupported field'; end if;
    if target_document_type.expects_document_number
      and nullif(btrim(input_document ->> 'documentNumber'), '') is null then
      raise exception '% requires a document number', target_document_type.name;
    end if;
    if target_document_type.expects_issue_date
      and nullif(input_document ->> 'issueDate', '') is null then
      raise exception '% requires an issue date', target_document_type.name;
    end if;
    if target_document_type.expects_expiry_date
      and nullif(input_document ->> 'expiryDate', '') is null then
      raise exception '% requires an expiry date', target_document_type.name;
    end if;
    if nullif(input_document ->> 'issueDate', '') is not null
      and nullif(input_document ->> 'expiryDate', '') is not null
      and (input_document ->> 'expiryDate')::date <
        (input_document ->> 'issueDate')::date then
      raise exception 'Document expiry cannot be earlier than issue date';
    end if;
    if target_document_type.system_code in ('CNIC', 'PASSPORT')
      and nullif(btrim(input_document ->> 'documentNumber'), '') is not null then
      identity_count := identity_count + 1;
    end if;
  end loop;

  if identity_count = 0 then
    raise exception 'At least one complete CNIC or Passport is required';
  end if;
  if not p_confirm_duplicate and exists (
    select 1
    from public.find_worker_identity_duplicate(p_documents, target_worker_id)
  ) then
    raise exception 'A worker with the same identity number already exists';
  end if;

  if creating then
    insert into public.workers (
      legal_name,
      phone_number,
      address,
      nationality
    ) values (
      btrim(p_legal_name),
      btrim(p_phone_number),
      nullif(btrim(p_address), ''),
      nullif(btrim(p_nationality), '')
    ) returning id into target_worker_id;

    insert into public.worker_employment_periods (
      worker_id, status, starts_on
    ) values (target_worker_id, 'ACTIVE', business_date);
    insert into public.worker_classification_periods (
      worker_id, trade_id, skill_level_id, starts_on
    ) values (target_worker_id, p_trade_id, p_skill_level_id, business_date);
    insert into public.worker_rate_periods (
      worker_id, hourly_rate_sen, starts_on
    ) values (target_worker_id, p_hourly_rate_sen, business_date);
    insert into public.worker_food_deduction_periods (
      worker_id, monthly_amount_sen, starts_on
    ) values (target_worker_id, p_food_deduction_sen, business_date);
  else
    if exists (
      select 1
      from public.worker_employment_periods
      where worker_id = target_worker_id
        and ends_on is null
        and status = 'ARCHIVED'
    ) then
      raise exception 'Archived workers are read-only';
    end if;

    update public.workers
    set
      legal_name = btrim(p_legal_name),
      phone_number = btrim(p_phone_number),
      address = nullif(btrim(p_address), ''),
      nationality = nullif(btrim(p_nationality), ''),
      updated_by = actor_id
    where id = target_worker_id;
    if not found then raise exception 'Worker not found'; end if;

    select * into classification
    from public.worker_classification_periods
    where worker_id = target_worker_id and ends_on is null
    for update;
    if classification.trade_id is distinct from p_trade_id
      or classification.skill_level_id is distinct from p_skill_level_id then
      if classification.starts_on = business_date then
        update public.worker_classification_periods
        set trade_id = p_trade_id, skill_level_id = p_skill_level_id
        where id = classification.id;
      else
        update public.worker_classification_periods
        set ends_on = business_date, ended_by = actor_id
        where id = classification.id;
        insert into public.worker_classification_periods (
          worker_id, trade_id, skill_level_id, starts_on
        ) values (
          target_worker_id, p_trade_id, p_skill_level_id, business_date
        );
      end if;
    end if;

    select * into deduction
    from public.worker_food_deduction_periods
    where worker_id = target_worker_id and ends_on is null
    for update;
    if deduction.monthly_amount_sen is distinct from p_food_deduction_sen then
      if deduction.starts_on = business_date then
        update public.worker_food_deduction_periods
        set monthly_amount_sen = p_food_deduction_sen
        where id = deduction.id;
      else
        update public.worker_food_deduction_periods
        set ends_on = business_date, ended_by = actor_id
        where id = deduction.id;
        insert into public.worker_food_deduction_periods (
          worker_id, monthly_amount_sen, starts_on
        ) values (
          target_worker_id, p_food_deduction_sen, business_date
        );
      end if;
    end if;

    select * into rate
    from public.worker_rate_periods
    where worker_id = target_worker_id and ends_on is null
    for update;
    if rate.hourly_rate_sen is distinct from p_hourly_rate_sen then
      if nullif(p_rate_effective_on, '') is null then
        raise exception 'Rate changes require an effective date';
      end if;
      if p_rate_effective_on::date < rate.starts_on then
        raise exception 'Rate change cannot predate the current rate';
      end if;
      if p_rate_effective_on::date = rate.starts_on then
        update public.worker_rate_periods
        set hourly_rate_sen = p_hourly_rate_sen
        where id = rate.id;
      else
        update public.worker_rate_periods
        set ends_on = p_rate_effective_on::date, ended_by = actor_id
        where id = rate.id;
        insert into public.worker_rate_periods (
          worker_id, hourly_rate_sen, starts_on
        ) values (
          target_worker_id, p_hourly_rate_sen, p_rate_effective_on::date
        );
      end if;
    end if;

    update public.worker_documents existing
    set status = 'REMOVED', changed_by = actor_id
    where existing.worker_id = target_worker_id
      and existing.file_kind = 'DOCUMENT'
      and existing.status = 'ACTIVE'
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) item
        where nullif(item ->> 'id', '')::uuid = existing.id
      );
  end if;

  for input_document in
    select value from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb))
  loop
    target_document_id := coalesce(
      nullif(input_document ->> 'id', '')::uuid,
      gen_random_uuid()
    );
    update public.worker_documents
    set
      document_type_id = (input_document ->> 'documentTypeId')::uuid,
      document_number = nullif(btrim(input_document ->> 'documentNumber'), ''),
      issue_date = nullif(input_document ->> 'issueDate', '')::date,
      expiry_date = nullif(input_document ->> 'expiryDate', '')::date,
      metadata = coalesce(input_document -> 'metadata', '{}'::jsonb),
      changed_by = actor_id
    where id = target_document_id
      and worker_id = target_worker_id
      and file_kind = 'DOCUMENT'
      and status = 'ACTIVE';

    if not found then
      insert into public.worker_documents (
        id,
        worker_id,
        file_kind,
        document_type_id,
        document_number,
        issue_date,
        expiry_date,
        metadata
      ) values (
        target_document_id,
        target_worker_id,
        'DOCUMENT',
        (input_document ->> 'documentTypeId')::uuid,
        nullif(btrim(input_document ->> 'documentNumber'), ''),
        nullif(input_document ->> 'issueDate', '')::date,
        nullif(input_document ->> 'expiryDate', '')::date,
        coalesce(input_document -> 'metadata', '{}'::jsonb)
      );
    end if;
    document_ids := document_ids || jsonb_build_object(
      coalesce(input_document ->> 'clientKey', target_document_id::text),
      target_document_id::text
    );
  end loop;

  return jsonb_build_object(
    'workerId', target_worker_id,
    'documentIds', document_ids,
    'created', creating
  );
end;
$$;

create or replace function public.attach_worker_file(
  p_id uuid,
  p_worker_id uuid,
  p_file_kind public.worker_file_kind,
  p_document_id text,
  p_bucket_id text,
  p_object_path text,
  p_original_filename text,
  p_mime_type text,
  p_byte_size integer
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  current_document public.worker_documents%rowtype;
  target_id uuid := p_id;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can manage worker files';
  end if;
  if exists (
    select 1 from public.worker_employment_periods
    where worker_id = p_worker_id and ends_on is null and status = 'ARCHIVED'
  ) then raise exception 'Archived workers are read-only'; end if;

  if p_file_kind = 'PHOTO' then
    select * into current_document
    from public.worker_documents
    where worker_id = p_worker_id
      and file_kind = 'PHOTO'
      and status = 'ACTIVE'
    for update;
  else
    select * into current_document
    from public.worker_documents
    where id = nullif(p_document_id, '')::uuid
      and worker_id = p_worker_id
      and file_kind = 'DOCUMENT'
      and status = 'ACTIVE'
    for update;
    if current_document.id is null then
      raise exception 'The document metadata is no longer current';
    end if;
  end if;

  if current_document.id is not null and current_document.bucket_id is null then
    update public.worker_documents
    set
      bucket_id = p_bucket_id,
      object_path = p_object_path,
      original_filename = p_original_filename,
      mime_type = p_mime_type,
      byte_size = p_byte_size,
      changed_by = actor_id
    where id = current_document.id;
    return current_document.id;
  end if;

  if current_document.id is not null then
    update public.worker_documents
    set status = 'REPLACED', changed_by = actor_id, replaced_by_id = null
    where id = current_document.id;
  end if;

  insert into public.worker_documents (
    id,
    worker_id,
    file_kind,
    document_type_id,
    document_number,
    issue_date,
    expiry_date,
    metadata,
    bucket_id,
    object_path,
    original_filename,
    mime_type,
    byte_size
  ) values (
    target_id,
    p_worker_id,
    p_file_kind,
    case when p_file_kind = 'DOCUMENT' then current_document.document_type_id end,
    case when p_file_kind = 'DOCUMENT' then current_document.document_number end,
    case when p_file_kind = 'DOCUMENT' then current_document.issue_date end,
    case when p_file_kind = 'DOCUMENT' then current_document.expiry_date end,
    case
      when p_file_kind = 'DOCUMENT' then current_document.metadata
      else '{}'::jsonb
    end,
    p_bucket_id,
    p_object_path,
    p_original_filename,
    p_mime_type,
    p_byte_size
  );
  if current_document.id is not null then
    update public.worker_documents
    set replaced_by_id = target_id, changed_by = actor_id
    where id = current_document.id;
  end if;
  return target_id;
end;
$$;

create or replace function public.save_worker_document_metadata(
  p_worker_id uuid,
  p_document_id text,
  p_document_type_id uuid,
  p_document_number text,
  p_issue_date text,
  p_expiry_date text,
  p_metadata jsonb,
  p_confirm_duplicate boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_id uuid := coalesce(nullif(p_document_id, '')::uuid, gen_random_uuid());
  target_type public.document_types%rowtype;
  duplicate_documents jsonb;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can manage worker documents';
  end if;
  if exists (
    select 1 from public.worker_employment_periods
    where worker_id = p_worker_id and ends_on is null and status = 'ARCHIVED'
  ) then raise exception 'Archived workers are read-only'; end if;
  select * into target_type from public.document_types
  where id = p_document_type_id and is_active;
  if target_type.id is null then raise exception 'Document type not found'; end if;
  if jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) <> 'object'
    or exists (
      select 1 from jsonb_object_keys(coalesce(p_metadata, '{}'::jsonb)) as metadata_key(key)
      where not (target_type.metadata_fields ? metadata_key.key)
    )
    or exists (
      select 1 from jsonb_each(coalesce(p_metadata, '{}'::jsonb)) entry
      where jsonb_typeof(entry.value) <> 'string'
        or char_length(entry.value #>> '{}') > 300
    ) then raise exception 'Document metadata contains an unsupported field'; end if;
  if target_type.expects_document_number
    and nullif(btrim(p_document_number), '') is null then
    raise exception '% requires a document number', target_type.name;
  end if;
  if target_type.expects_issue_date and nullif(p_issue_date, '') is null then
    raise exception '% requires an issue date', target_type.name;
  end if;
  if target_type.expects_expiry_date and nullif(p_expiry_date, '') is null then
    raise exception '% requires an expiry date', target_type.name;
  end if;
  duplicate_documents := jsonb_build_array(jsonb_build_object(
    'documentTypeId', p_document_type_id,
    'documentNumber', p_document_number
  ));
  if target_type.system_code in ('CNIC', 'PASSPORT')
    and not p_confirm_duplicate
    and exists (
      select 1 from public.find_worker_identity_duplicate(
        duplicate_documents, p_worker_id
      )
    ) then raise exception 'A worker with the same identity number already exists'; end if;

  update public.worker_documents
  set document_type_id = p_document_type_id,
      document_number = nullif(btrim(p_document_number), ''),
      issue_date = nullif(p_issue_date, '')::date,
      expiry_date = nullif(p_expiry_date, '')::date,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      changed_by = private.current_application_user_id()
  where id = target_id and worker_id = p_worker_id
    and file_kind = 'DOCUMENT' and status = 'ACTIVE';
  if not found then
    insert into public.worker_documents (
      id, worker_id, file_kind, document_type_id, document_number, issue_date,
      expiry_date, metadata
    ) values (
      target_id, p_worker_id, 'DOCUMENT', p_document_type_id,
      nullif(btrim(p_document_number), ''), nullif(p_issue_date, '')::date,
      nullif(p_expiry_date, '')::date, coalesce(p_metadata, '{}'::jsonb)
    );
  end if;
  return target_id;
end;
$$;

create or replace function public.remove_worker_document(
  p_document_id uuid,
  p_remove_document boolean default true
)
returns table(bucket_id text, object_path text)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  current_document public.worker_documents%rowtype;
  replacement_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can manage worker documents';
  end if;

  select * into current_document from public.worker_documents
  where id = p_document_id and status = 'ACTIVE' for update;
  if current_document.id is null then return; end if;
  if exists (
    select 1 from public.worker_employment_periods
    where worker_id = current_document.worker_id
      and ends_on is null and status = 'ARCHIVED'
  ) then raise exception 'Archived workers are read-only'; end if;

  if p_remove_document and current_document.file_kind = 'DOCUMENT' and exists (
    select 1 from public.document_types
    where id = current_document.document_type_id
      and system_code in ('CNIC', 'PASSPORT')
  ) and not exists (
    select 1 from public.worker_documents other
    join public.document_types on document_types.id = other.document_type_id
    where other.worker_id = current_document.worker_id
      and other.id <> current_document.id
      and other.status = 'ACTIVE'
      and document_types.system_code in ('CNIC', 'PASSPORT')
  ) then raise exception 'At least one active CNIC or Passport is required'; end if;

  if p_remove_document then
    update public.worker_documents set status = 'REMOVED', changed_by = actor_id
    where id = current_document.id;
  elsif current_document.bucket_id is not null then
    replacement_id := gen_random_uuid();
    update public.worker_documents
    set status = 'REPLACED', replaced_by_id = null, changed_by = actor_id
    where id = current_document.id;
    insert into public.worker_documents (
      id, worker_id, file_kind, document_type_id, document_number, issue_date,
      expiry_date, metadata
    ) values (
      replacement_id, current_document.worker_id, current_document.file_kind,
      current_document.document_type_id, current_document.document_number,
      current_document.issue_date, current_document.expiry_date,
      current_document.metadata
    );
    update public.worker_documents
    set replaced_by_id = replacement_id, changed_by = actor_id
    where id = current_document.id;
  end if;

  return query select current_document.bucket_id, current_document.object_path;
end;
$$;

create or replace function public.commit_migration_batch(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  target_batch public.migration_batches%rowtype;
  item jsonb;
  project_id uuid;
  worker_id uuid;
  trade_id uuid;
  skill_id uuid;
  document_type_id uuid;
  identity_type_id uuid;
  project_keys jsonb := '{}'::jsonb;
  worker_keys jsonb := '{}'::jsonb;
  project_count integer := 0;
  worker_count integer := 0;
  assignment_count integer := 0;
  rate_count integer := 0;
  document_count integer := 0;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can commit a migration batch.';
  end if;
  select * into target_batch
  from public.migration_batches where id = p_batch_id for update;
  if target_batch.id is null then
    raise exception 'Migration preview was not found.';
  end if;
  if target_batch.status = 'COMMITTED' then return target_batch.summary; end if;
  if jsonb_array_length(target_batch.issues) > 0 then
    raise exception 'Resolve every preview issue before committing.';
  end if;
  if exists (
    select 1 from public.migration_batches
    where file_checksum = target_batch.file_checksum
      and status = 'COMMITTED' and id <> target_batch.id
  ) then raise exception 'This workbook has already been committed.'; end if;

  for item in select value from jsonb_array_elements(target_batch.payload -> 'projects')
  loop
    if exists (
      select 1 from public.projects
      where lower(btrim(name)) = lower(btrim(item ->> 'name'))
        and lower(btrim(client_name)) = lower(btrim(item ->> 'clientName'))
    ) then raise exception 'A matching project already exists.'; end if;
    insert into public.projects (
      name, client_name, contractor_name, location, start_date, end_date, status
    ) values (
      item ->> 'name', item ->> 'clientName',
      nullif(item ->> 'contractorName', ''), item ->> 'location',
      (item ->> 'startDate')::date, nullif(item ->> 'endDate', '')::date,
      (item ->> 'status')::public.project_status
    ) returning id into project_id;
    project_keys := project_keys || jsonb_build_object(item ->> 'key', project_id::text);
    project_count := project_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(target_batch.payload -> 'workers')
  loop
    if exists (
      select 1
      from public.worker_documents
      join public.document_types on document_types.id = worker_documents.document_type_id
      where worker_documents.status = 'ACTIVE'
        and document_types.system_code in ('CNIC', 'PASSPORT')
        and worker_documents.normalized_document_number in (
          private.normalized_worker_identifier(item ->> 'cnicNumber'),
          private.normalized_worker_identifier(item ->> 'passportNumber')
        )
    ) then raise exception 'A worker with the same identity number already exists.'; end if;
    select id into trade_id from public.trades
    where lower(btrim(name)) = lower(btrim(item ->> 'tradeName'));
    select id into skill_id from public.skill_levels
    where lower(btrim(name)) = lower(btrim(item ->> 'skillName'));
    if trade_id is null or skill_id is null then
      raise exception 'A worker trade or skill level is no longer available.';
    end if;
    insert into public.workers (
      legal_name, phone_number, alternate_phone, address, nationality, notes
    ) values (
      item ->> 'legalName', item ->> 'phoneNumber',
      nullif(item ->> 'alternatePhone', ''), nullif(item ->> 'address', ''),
      nullif(item ->> 'nationality', ''), nullif(item ->> 'notes', '')
    ) returning id into worker_id;
    worker_keys := worker_keys || jsonb_build_object(item ->> 'key', worker_id::text);
    insert into public.worker_employment_periods (worker_id, status, starts_on)
    values (
      worker_id,
      (item ->> 'employmentStatus')::public.worker_employment_status,
      (item ->> 'employmentStartDate')::date
    );
    insert into public.worker_classification_periods (
      worker_id, trade_id, skill_level_id, starts_on
    ) values (
      worker_id, trade_id, skill_id, (item ->> 'employmentStartDate')::date
    );
    insert into public.worker_food_deduction_periods (
      worker_id, monthly_amount_sen, starts_on
    ) values (
      worker_id, (item ->> 'monthlyFoodDeductionSen')::integer,
      (item ->> 'employmentStartDate')::date
    );
    for identity_type_id in
      select id from public.document_types
      where system_code in ('CNIC', 'PASSPORT', 'WORK_PERMIT')
    loop
      insert into public.worker_documents (
        worker_id, file_kind, document_type_id, document_number, issue_date,
        expiry_date
      )
      select
        worker_id, 'DOCUMENT', identity_type_id,
        case document_types.system_code
          when 'CNIC' then nullif(item ->> 'cnicNumber', '')
          when 'PASSPORT' then nullif(item ->> 'passportNumber', '')
          when 'WORK_PERMIT' then nullif(item ->> 'workPermitNumber', '')
        end,
        case when document_types.system_code = 'WORK_PERMIT'
          then nullif(item ->> 'workPermitIssueDate', '')::date end,
        case when document_types.system_code = 'WORK_PERMIT'
          then nullif(item ->> 'workPermitExpiryDate', '')::date end
      from public.document_types
      where document_types.id = identity_type_id
        and case document_types.system_code
          when 'CNIC' then nullif(item ->> 'cnicNumber', '')
          when 'PASSPORT' then nullif(item ->> 'passportNumber', '')
          when 'WORK_PERMIT' then nullif(item ->> 'workPermitNumber', '')
        end is not null;
    end loop;
    worker_count := worker_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(target_batch.payload -> 'assignments')
  loop
    worker_id := (worker_keys ->> (item ->> 'workerKey'))::uuid;
    project_id := (project_keys ->> (item ->> 'projectKey'))::uuid;
    insert into public.worker_project_assignments (worker_id, project_id, starts_on)
    values (worker_id, project_id, (item ->> 'effectiveDate')::date);
    assignment_count := assignment_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(target_batch.payload -> 'rates')
  loop
    worker_id := (worker_keys ->> (item ->> 'workerKey'))::uuid;
    insert into public.worker_rate_periods (worker_id, hourly_rate_sen, starts_on)
    values (
      worker_id, (item ->> 'hourlyRateSen')::integer,
      (item ->> 'effectiveDate')::date
    );
    rate_count := rate_count + 1;
  end loop;

  for item in select value from jsonb_array_elements(target_batch.payload -> 'documents')
  loop
    if not exists (
      select 1 from storage.objects
      where bucket_id = 'worker-documents' and name = item ->> 'objectPath'
    ) then raise exception 'A staged worker document file is missing.'; end if;
    worker_id := (worker_keys ->> (item ->> 'workerKey'))::uuid;
    select id into document_type_id from public.document_types
    where lower(btrim(name)) = lower(btrim(item ->> 'documentTypeName'));
    insert into public.worker_documents (
      id, worker_id, file_kind, document_type_id, document_number, bucket_id,
      object_path, original_filename, mime_type, byte_size, issue_date,
      expiry_date
    ) values (
      (item ->> 'id')::uuid, worker_id, 'DOCUMENT', document_type_id,
      nullif(item ->> 'documentNumber', ''), 'worker-documents',
      item ->> 'objectPath', item ->> 'originalFilename', item ->> 'mimeType',
      (item ->> 'byteSize')::integer, nullif(item ->> 'issueDate', '')::date,
      nullif(item ->> 'expiryDate', '')::date
    );
    document_count := document_count + 1;
  end loop;

  update public.migration_batches
  set status = 'COMMITTED', committed_at = now(), summary = jsonb_build_object(
    'projects', project_count, 'workers', worker_count,
    'assignments', assignment_count, 'rates', rate_count,
    'documents', document_count
  ) where id = p_batch_id;
  insert into public.audit_entries (
    action, module, entity_type, entity_id, source, after_data
  ) values (
    'imports.commit', 'imports', 'migration_batches', p_batch_id::text,
    'IMPORT', jsonb_build_object(
      'file_name', target_batch.file_name, 'projects', project_count,
      'workers', worker_count, 'assignments', assignment_count,
      'rates', rate_count, 'documents', document_count
    )
  );
  return jsonb_build_object(
    'projects', project_count, 'workers', worker_count,
    'assignments', assignment_count, 'rates', rate_count,
    'documents', document_count
  );
end;
$$;

create or replace function private.write_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current_value jsonb;
  record_id text;
  module_name text;
begin
  previous := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_value := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  if tg_table_name = 'worker_documents' then
    previous := coalesce(previous, '{}'::jsonb)
      - 'document_number' - 'normalized_document_number' - 'metadata'
      - 'object_path' - 'original_filename';
    current_value := coalesce(current_value, '{}'::jsonb)
      - 'document_number' - 'normalized_document_number' - 'metadata'
      - 'object_path' - 'original_filename';
  end if;
  record_id := coalesce(current_value ->> 'id', previous ->> 'id', 'singleton');
  module_name := case
    when tg_table_name = 'projects' then 'projects'
    when tg_table_name = 'foreman_project_assignments' then 'assignments'
    when tg_table_name = 'application_users' then 'users'
    when tg_table_name in ('trades', 'skill_levels', 'document_types') then 'categories'
    when tg_table_name = 'company_settings' then 'settings'
    when tg_table_name = 'worker_project_assignments' then 'worker_assignments'
    when tg_table_name = 'worker_rate_periods' then 'worker_rates'
    when tg_table_name = 'worker_documents' then 'documents'
    when tg_table_name like 'worker_%' or tg_table_name = 'workers' then 'workers'
    else tg_table_name
  end;
  insert into public.audit_entries (
    actor_user_id, action, module, entity_type, entity_id, source,
    before_data, after_data
  ) values (
    private.current_application_user_id(), module_name || '.' || lower(tg_op),
    module_name, tg_table_name, record_id, 'ONLINE',
    nullif(previous, '{}'::jsonb), nullif(current_value, '{}'::jsonb)
  );
  return coalesce(new, old);
end;
$$;

revoke all on function public.find_worker_identity_duplicate(jsonb, uuid) from public;
revoke all on function public.save_worker_record(
  text, text, text, text, text, uuid, uuid, integer, integer, text, jsonb,
  boolean
) from public;
revoke all on function public.attach_worker_file(
  uuid, uuid, public.worker_file_kind, text, text, text, text, text, integer
) from public;
revoke all on function public.save_worker_document_metadata(
  uuid, text, uuid, text, text, text, jsonb, boolean
) from public;
revoke all on function public.remove_worker_document(uuid, boolean) from public;
revoke all on function public.commit_migration_batch(uuid) from public;

grant execute on function public.find_worker_identity_duplicate(jsonb, uuid)
to authenticated;
grant execute on function public.save_worker_record(
  text, text, text, text, text, uuid, uuid, integer, integer, text, jsonb,
  boolean
) to authenticated;
grant execute on function public.attach_worker_file(
  uuid, uuid, public.worker_file_kind, text, text, text, text, text, integer
) to authenticated;
grant execute on function public.save_worker_document_metadata(
  uuid, text, uuid, text, text, text, jsonb, boolean
) to authenticated;
grant execute on function public.remove_worker_document(uuid, boolean)
to authenticated;
grant execute on function public.commit_migration_batch(uuid) to authenticated;

set session_replication_role = origin;

create type public.worker_employment_status as enum (
  'ACTIVE',
  'SUSPENDED',
  'LEFT_COMPANY',
  'ARCHIVED'
);

create type public.worker_file_kind as enum ('PHOTO', 'DOCUMENT');
create type public.worker_document_status as enum (
  'ACTIVE',
  'REPLACED',
  'REMOVED'
);

create table public.document_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  expects_issue_date boolean not null default false,
  expects_expiry_date boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index document_types_name_unique
on public.document_types (lower(btrim(name)));

insert into public.document_types (
  name,
  expects_issue_date,
  expects_expiry_date,
  created_by,
  updated_by
)
select
  seed.name,
  seed.expects_issue_date,
  seed.expects_expiry_date,
  application_users.id,
  application_users.id
from (
  values
    ('CNIC', false, false),
    ('Passport', true, true),
    ('Work Permit', true, true),
    ('Other', false, false)
) as seed(name, expects_issue_date, expects_expiry_date)
cross join lateral (
  select id
  from public.application_users
  where role = 'CEO'::public.application_role
  order by created_at
  limit 1
) application_users;

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (char_length(btrim(legal_name)) between 2 and 160),
  phone_number text not null check (char_length(btrim(phone_number)) between 5 and 40),
  alternate_phone text check (
    alternate_phone is null
    or char_length(btrim(alternate_phone)) between 5 and 40
  ),
  address text check (address is null or char_length(btrim(address)) <= 500),
  nationality text check (
    nationality is null
    or char_length(btrim(nationality)) between 2 and 80
  ),
  cnic_number text check (
    cnic_number is null
    or char_length(btrim(cnic_number)) between 5 and 40
  ),
  passport_number text check (
    passport_number is null
    or char_length(btrim(passport_number)) between 3 and 40
  ),
  work_permit_number text check (
    work_permit_number is null
    or char_length(btrim(work_permit_number)) between 3 and 60
  ),
  work_permit_issue_date date,
  work_permit_expiry_date date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cnic_number is not null or passport_number is not null),
  check (
    work_permit_expiry_date is null
    or work_permit_issue_date is null
    or work_permit_expiry_date >= work_permit_issue_date
  )
);

create index workers_legal_name_idx on public.workers (lower(legal_name));
create index workers_phone_idx on public.workers (phone_number);
create index workers_cnic_idx
on public.workers (lower(cnic_number))
where cnic_number is not null;
create index workers_passport_idx
on public.workers (lower(passport_number))
where passport_number is not null;

create table public.worker_employment_periods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  status public.worker_employment_status not null,
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  reason text check (reason is null or char_length(reason) <= 500),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_classification_periods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  trade_id uuid not null references public.trades (id),
  skill_level_id uuid not null references public.skill_levels (id),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_project_assignments (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  project_id uuid not null references public.projects (id),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_rate_periods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  hourly_rate_sen integer not null check (hourly_rate_sen > 0),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.worker_food_deduction_periods (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  monthly_amount_sen integer not null default 0
    check (monthly_amount_sen >= 0),
  starts_on date not null,
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index worker_employment_one_open
on public.worker_employment_periods (worker_id)
where ends_on is null;
create unique index worker_classification_one_open
on public.worker_classification_periods (worker_id)
where ends_on is null;
create unique index worker_assignment_one_open
on public.worker_project_assignments (worker_id)
where ends_on is null;
create unique index worker_rate_one_open
on public.worker_rate_periods (worker_id)
where ends_on is null;
create unique index worker_food_deduction_one_open
on public.worker_food_deduction_periods (worker_id)
where ends_on is null;

alter table public.worker_employment_periods
add constraint worker_employment_period_no_overlap
exclude using gist (
  worker_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);
alter table public.worker_classification_periods
add constraint worker_classification_period_no_overlap
exclude using gist (
  worker_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);
alter table public.worker_project_assignments
add constraint worker_assignment_period_no_overlap
exclude using gist (
  worker_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);
alter table public.worker_rate_periods
add constraint worker_rate_period_no_overlap
exclude using gist (
  worker_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);
alter table public.worker_food_deduction_periods
add constraint worker_food_deduction_period_no_overlap
exclude using gist (
  worker_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);

create table public.worker_documents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  file_kind public.worker_file_kind not null,
  document_type_id uuid references public.document_types (id),
  document_number text check (
    document_number is null
    or char_length(btrim(document_number)) between 2 and 100
  ),
  bucket_id text not null check (bucket_id in ('worker-photos', 'worker-documents')),
  object_path text not null check (char_length(object_path) between 3 and 500),
  original_filename text not null
    check (char_length(original_filename) between 1 and 255),
  mime_type text not null
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  byte_size integer not null check (byte_size between 1 and 10485760),
  issue_date date,
  expiry_date date,
  status public.worker_document_status not null default 'ACTIVE',
  replaced_by_id uuid references public.worker_documents (id),
  uploaded_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  changed_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expiry_date is null or issue_date is null or expiry_date >= issue_date),
  check (
    (file_kind = 'PHOTO' and document_type_id is null and bucket_id = 'worker-photos')
    or
    (
      file_kind = 'DOCUMENT'
      and document_type_id is not null
      and bucket_id = 'worker-documents'
    )
  )
);

create unique index worker_documents_object_unique
on public.worker_documents (bucket_id, object_path);
create unique index worker_one_active_photo
on public.worker_documents (worker_id)
where file_kind = 'PHOTO' and status = 'ACTIVE';
create index worker_documents_worker_idx
on public.worker_documents (worker_id, status, expiry_date);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values
  (
    'worker-photos',
    'worker-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png']
  ),
  (
    'worker-documents',
    'worker-documents',
    false,
    10485760,
    array['application/pdf', 'image/jpeg', 'image/png']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.current_foreman_project_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select foreman_project_assignments.project_id
  from public.foreman_project_assignments
  where foreman_project_assignments.foreman_user_id =
      private.current_application_user_id()
    and foreman_project_assignments.starts_on <= private.current_business_date()
    and (
      foreman_project_assignments.ends_on is null
      or foreman_project_assignments.ends_on > private.current_business_date()
    )
  limit 1;
$$;

create or replace function private.can_read_worker(target_worker_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_ceo()
    or exists (
      select 1
      from public.worker_project_assignments
      where worker_project_assignments.worker_id = target_worker_id
        and worker_project_assignments.project_id =
          private.current_foreman_project_id()
        and worker_project_assignments.starts_on <=
          private.current_business_date()
        and (
          worker_project_assignments.ends_on is null
          or worker_project_assignments.ends_on >
            private.current_business_date()
        )
    );
$$;

revoke all on function private.current_foreman_project_id() from public;
revoke all on function private.can_read_worker(uuid) from public;
grant execute on function private.current_foreman_project_id() to authenticated;
grant execute on function private.can_read_worker(uuid) to authenticated;

create or replace function public.create_worker(
  p_legal_name text,
  p_phone_number text,
  p_alternate_phone text,
  p_address text,
  p_nationality text,
  p_cnic_number text,
  p_passport_number text,
  p_work_permit_number text,
  p_work_permit_issue_date date,
  p_work_permit_expiry_date date,
  p_notes text,
  p_employment_status public.worker_employment_status,
  p_employment_starts_on date,
  p_trade_id uuid,
  p_skill_level_id uuid,
  p_hourly_rate_sen integer,
  p_rate_starts_on date,
  p_food_deduction_sen integer,
  p_project_id uuid,
  p_assignment_starts_on date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_worker_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can create workers';
  end if;
  if p_employment_status = 'ARCHIVED'::public.worker_employment_status then
    raise exception 'A new worker cannot start archived';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects
    where id = p_project_id
      and status in ('PLANNED', 'ACTIVE')
  ) then
    raise exception 'Workers can only be assigned to planned or active projects';
  end if;

  insert into public.workers (
    legal_name,
    phone_number,
    alternate_phone,
    address,
    nationality,
    cnic_number,
    passport_number,
    work_permit_number,
    work_permit_issue_date,
    work_permit_expiry_date,
    notes
  )
  values (
    btrim(p_legal_name),
    btrim(p_phone_number),
    nullif(btrim(p_alternate_phone), ''),
    nullif(btrim(p_address), ''),
    nullif(btrim(p_nationality), ''),
    nullif(btrim(p_cnic_number), ''),
    nullif(btrim(p_passport_number), ''),
    nullif(btrim(p_work_permit_number), ''),
    p_work_permit_issue_date,
    p_work_permit_expiry_date,
    nullif(btrim(p_notes), '')
  )
  returning id into new_worker_id;

  insert into public.worker_employment_periods (
    worker_id,
    status,
    starts_on
  ) values (
    new_worker_id,
    p_employment_status,
    p_employment_starts_on
  );

  insert into public.worker_classification_periods (
    worker_id,
    trade_id,
    skill_level_id,
    starts_on
  ) values (
    new_worker_id,
    p_trade_id,
    p_skill_level_id,
    p_employment_starts_on
  );

  insert into public.worker_rate_periods (
    worker_id,
    hourly_rate_sen,
    starts_on
  ) values (
    new_worker_id,
    p_hourly_rate_sen,
    p_rate_starts_on
  );

  insert into public.worker_food_deduction_periods (
    worker_id,
    monthly_amount_sen,
    starts_on
  ) values (
    new_worker_id,
    p_food_deduction_sen,
    p_employment_starts_on
  );

  if p_project_id is not null then
    insert into public.worker_project_assignments (
      worker_id,
      project_id,
      starts_on
    ) values (
      new_worker_id,
      p_project_id,
      p_assignment_starts_on
    );
  end if;

  return new_worker_id;
end;
$$;

create or replace function public.update_worker_profile(
  p_worker_id uuid,
  p_legal_name text,
  p_phone_number text,
  p_alternate_phone text,
  p_address text,
  p_nationality text,
  p_cnic_number text,
  p_passport_number text,
  p_work_permit_number text,
  p_work_permit_issue_date date,
  p_work_permit_expiry_date date,
  p_notes text,
  p_trade_id uuid,
  p_skill_level_id uuid,
  p_food_deduction_sen integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  business_date date := private.current_business_date();
  classification public.worker_classification_periods%rowtype;
  deduction public.worker_food_deduction_periods%rowtype;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can edit workers';
  end if;

  update public.workers
  set
    legal_name = btrim(p_legal_name),
    phone_number = btrim(p_phone_number),
    alternate_phone = nullif(btrim(p_alternate_phone), ''),
    address = nullif(btrim(p_address), ''),
    nationality = nullif(btrim(p_nationality), ''),
    cnic_number = nullif(btrim(p_cnic_number), ''),
    passport_number = nullif(btrim(p_passport_number), ''),
    work_permit_number = nullif(btrim(p_work_permit_number), ''),
    work_permit_issue_date = p_work_permit_issue_date,
    work_permit_expiry_date = p_work_permit_expiry_date,
    notes = nullif(btrim(p_notes), ''),
    updated_by = actor_id
  where id = p_worker_id;

  if not found then
    raise exception 'Worker not found';
  end if;

  select * into classification
  from public.worker_classification_periods
  where worker_id = p_worker_id and ends_on is null
  for update;

  if classification.trade_id is distinct from p_trade_id
    or classification.skill_level_id is distinct from p_skill_level_id then
    if classification.starts_on = business_date then
      update public.worker_classification_periods
      set
        trade_id = p_trade_id,
        skill_level_id = p_skill_level_id
      where id = classification.id;
    else
      update public.worker_classification_periods
      set ends_on = business_date, ended_by = actor_id
      where id = classification.id;
      insert into public.worker_classification_periods (
        worker_id,
        trade_id,
        skill_level_id,
        starts_on
      ) values (
        p_worker_id,
        p_trade_id,
        p_skill_level_id,
        business_date
      );
    end if;
  end if;

  select * into deduction
  from public.worker_food_deduction_periods
  where worker_id = p_worker_id and ends_on is null
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
        worker_id,
        monthly_amount_sen,
        starts_on
      ) values (
        p_worker_id,
        p_food_deduction_sen,
        business_date
      );
    end if;
  end if;
end;
$$;

create or replace function public.set_worker_employment_status(
  p_worker_id uuid,
  p_status public.worker_employment_status,
  p_starts_on date,
  p_reason text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  current_period public.worker_employment_periods%rowtype;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can change worker employment';
  end if;
  if p_starts_on > private.current_business_date() then
    raise exception 'Future employment changes are not supported';
  end if;

  select * into current_period
  from public.worker_employment_periods
  where worker_id = p_worker_id and ends_on is null
  for update;

  if current_period.id is null then
    raise exception 'Current employment period not found';
  end if;
  if current_period.status = 'ARCHIVED'::public.worker_employment_status then
    raise exception 'Archived workers are read-only';
  end if;
  if current_period.status = p_status then
    raise exception 'Worker already has this employment status';
  end if;
  if not (
    (current_period.status = 'ACTIVE' and p_status in ('SUSPENDED', 'LEFT_COMPANY'))
    or (current_period.status = 'SUSPENDED' and p_status in ('ACTIVE', 'ARCHIVED'))
    or (current_period.status = 'LEFT_COMPANY' and p_status in ('ACTIVE', 'ARCHIVED'))
  ) then
    raise exception 'Invalid worker employment transition';
  end if;
  if p_starts_on < current_period.starts_on then
    raise exception 'Employment change cannot predate the current period';
  end if;

  if p_starts_on = current_period.starts_on then
    update public.worker_employment_periods
    set status = p_status, reason = nullif(btrim(p_reason), '')
    where id = current_period.id;
  else
    update public.worker_employment_periods
    set ends_on = p_starts_on, ended_by = actor_id
    where id = current_period.id;
    insert into public.worker_employment_periods (
      worker_id,
      status,
      starts_on,
      reason
    ) values (
      p_worker_id,
      p_status,
      p_starts_on,
      nullif(btrim(p_reason), '')
    );
  end if;

  if p_status in ('LEFT_COMPANY', 'ARCHIVED') then
    update public.worker_project_assignments
    set ends_on = p_starts_on, ended_by = actor_id
    where worker_id = p_worker_id and ends_on is null;
  end if;
end;
$$;

create or replace function public.transfer_worker(
  p_worker_id uuid,
  p_project_id uuid,
  p_starts_on date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  current_assignment public.worker_project_assignments%rowtype;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can assign workers';
  end if;
  if p_starts_on > private.current_business_date() then
    raise exception 'Future worker transfers are not supported';
  end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects
    where id = p_project_id and status in ('PLANNED', 'ACTIVE')
  ) then
    raise exception 'Workers can only be assigned to planned or active projects';
  end if;
  if not exists (
    select 1
    from public.worker_employment_periods
    where worker_id = p_worker_id
      and ends_on is null
      and status = 'ACTIVE'
  ) then
    raise exception 'Only active workers can be assigned';
  end if;

  select * into current_assignment
  from public.worker_project_assignments
  where worker_id = p_worker_id and ends_on is null
  for update;

  if current_assignment.id is not null then
    if current_assignment.project_id is not distinct from p_project_id then
      raise exception 'Worker is already assigned to this project';
    end if;
    if p_starts_on < current_assignment.starts_on then
      raise exception 'Transfer cannot predate the current assignment';
    end if;
    if p_starts_on = current_assignment.starts_on and p_project_id is not null then
      update public.worker_project_assignments
      set project_id = p_project_id
      where id = current_assignment.id;
      return;
    end if;
    update public.worker_project_assignments
    set ends_on = p_starts_on, ended_by = actor_id
    where id = current_assignment.id;
  end if;

  if p_project_id is not null then
    insert into public.worker_project_assignments (
      worker_id,
      project_id,
      starts_on
    ) values (
      p_worker_id,
      p_project_id,
      p_starts_on
    );
  end if;
end;
$$;

create or replace function public.set_worker_rate(
  p_worker_id uuid,
  p_hourly_rate_sen integer,
  p_starts_on date
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := private.current_application_user_id();
  current_rate public.worker_rate_periods%rowtype;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can change worker rates';
  end if;
  if p_hourly_rate_sen <= 0 then
    raise exception 'Hourly rate must be greater than zero';
  end if;

  select * into current_rate
  from public.worker_rate_periods
  where worker_id = p_worker_id and ends_on is null
  for update;

  if current_rate.id is null then
    raise exception 'Current worker rate not found';
  end if;
  if p_starts_on < current_rate.starts_on then
    raise exception 'Rate change cannot predate the current rate';
  end if;

  if p_starts_on = current_rate.starts_on then
    update public.worker_rate_periods
    set hourly_rate_sen = p_hourly_rate_sen
    where id = current_rate.id;
  else
    update public.worker_rate_periods
    set ends_on = p_starts_on, ended_by = actor_id
    where id = current_rate.id;
    insert into public.worker_rate_periods (
      worker_id,
      hourly_rate_sen,
      starts_on
    ) values (
      p_worker_id,
      p_hourly_rate_sen,
      p_starts_on
    );
  end if;
end;
$$;

create or replace function private.validate_worker_history_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and (
    old.worker_id is distinct from new.worker_id
    or old.starts_on is distinct from new.starts_on
    or old.created_by is distinct from new.created_by
  ) then
    raise exception 'Worker history identity and start date are immutable';
  end if;
  return new;
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

  if tg_table_name = 'workers' then
    previous := coalesce(previous, '{}'::jsonb)
      - 'cnic_number' - 'passport_number' - 'work_permit_number';
    current_value := coalesce(current_value, '{}'::jsonb)
      - 'cnic_number' - 'passport_number' - 'work_permit_number';
  elsif tg_table_name = 'worker_documents' then
    previous := coalesce(previous, '{}'::jsonb) - 'document_number';
    current_value := coalesce(current_value, '{}'::jsonb) - 'document_number';
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
    actor_user_id,
    action,
    module,
    entity_type,
    entity_id,
    source,
    before_data,
    after_data
  )
  values (
    private.current_application_user_id(),
    module_name || '.' || lower(tg_op),
    module_name,
    tg_table_name,
    record_id,
    'ONLINE',
    nullif(previous, '{}'::jsonb),
    nullif(current_value, '{}'::jsonb)
  );

  return coalesce(new, old);
end;
$$;

create trigger document_types_set_updated_at
before update on public.document_types
for each row execute function private.set_updated_at();
create trigger workers_set_updated_at
before update on public.workers
for each row execute function private.set_updated_at();
create trigger worker_documents_set_updated_at
before update on public.worker_documents
for each row execute function private.set_updated_at();
create trigger worker_employment_set_updated_at
before update on public.worker_employment_periods
for each row execute function private.set_updated_at();
create trigger worker_classification_set_updated_at
before update on public.worker_classification_periods
for each row execute function private.set_updated_at();
create trigger worker_assignment_set_updated_at
before update on public.worker_project_assignments
for each row execute function private.set_updated_at();
create trigger worker_rate_set_updated_at
before update on public.worker_rate_periods
for each row execute function private.set_updated_at();
create trigger worker_food_deduction_set_updated_at
before update on public.worker_food_deduction_periods
for each row execute function private.set_updated_at();

create trigger worker_employment_validate
before update on public.worker_employment_periods
for each row execute function private.validate_worker_history_change();
create trigger worker_classification_validate
before update on public.worker_classification_periods
for each row execute function private.validate_worker_history_change();
create trigger worker_assignment_validate
before update on public.worker_project_assignments
for each row execute function private.validate_worker_history_change();
create trigger worker_rate_validate
before update on public.worker_rate_periods
for each row execute function private.validate_worker_history_change();
create trigger worker_food_deduction_validate
before update on public.worker_food_deduction_periods
for each row execute function private.validate_worker_history_change();

create trigger document_types_audit
after insert or update on public.document_types
for each row execute function private.write_audit_entry();
create trigger workers_audit
after insert or update on public.workers
for each row execute function private.write_audit_entry();
create trigger worker_employment_audit
after insert or update on public.worker_employment_periods
for each row execute function private.write_audit_entry();
create trigger worker_classification_audit
after insert or update on public.worker_classification_periods
for each row execute function private.write_audit_entry();
create trigger worker_assignment_audit
after insert or update on public.worker_project_assignments
for each row execute function private.write_audit_entry();
create trigger worker_rate_audit
after insert or update on public.worker_rate_periods
for each row execute function private.write_audit_entry();
create trigger worker_food_deduction_audit
after insert or update on public.worker_food_deduction_periods
for each row execute function private.write_audit_entry();
create trigger worker_documents_audit
after insert or update on public.worker_documents
for each row execute function private.write_audit_entry();

alter table public.document_types enable row level security;
alter table public.workers enable row level security;
alter table public.worker_employment_periods enable row level security;
alter table public.worker_classification_periods enable row level security;
alter table public.worker_project_assignments enable row level security;
alter table public.worker_rate_periods enable row level security;
alter table public.worker_food_deduction_periods enable row level security;
alter table public.worker_documents enable row level security;

grant select, insert, update on public.document_types to authenticated;
grant select, insert, update on public.workers to authenticated;
grant select, insert, update on public.worker_employment_periods to authenticated;
grant select, insert, update on public.worker_classification_periods to authenticated;
grant select, insert, update on public.worker_project_assignments to authenticated;
grant select, insert, update on public.worker_rate_periods to authenticated;
grant select, insert, update on public.worker_food_deduction_periods to authenticated;
grant select, insert, update on public.worker_documents to authenticated;

grant execute on function public.create_worker(
  text, text, text, text, text, text, text, text, date, date, text,
  public.worker_employment_status, date, uuid, uuid, integer, date, integer,
  uuid, date
) to authenticated;
grant execute on function public.update_worker_profile(
  uuid, text, text, text, text, text, text, text, text, date, date, text,
  uuid, uuid, integer
) to authenticated;
grant execute on function public.set_worker_employment_status(
  uuid, public.worker_employment_status, date, text
) to authenticated;
grant execute on function public.transfer_worker(uuid, uuid, date)
to authenticated;
grant execute on function public.set_worker_rate(uuid, integer, date)
to authenticated;

create policy "Active users can read document types"
on public.document_types
for select
to authenticated
using (private.can_access_application() and (is_active or private.is_current_ceo()));
create policy "CEO can create document types"
on public.document_types
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);
create policy "CEO can update document types"
on public.document_types
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can read all workers and Foremen read assigned workers"
on public.workers
for select
to authenticated
using (private.can_read_worker(id));
create policy "CEO can create workers"
on public.workers
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);
create policy "CEO can update workers"
on public.workers
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "Authorized users can read worker employment"
on public.worker_employment_periods
for select
to authenticated
using (private.can_read_worker(worker_id));
create policy "Authorized users can read worker classification"
on public.worker_classification_periods
for select
to authenticated
using (private.can_read_worker(worker_id));
create policy "Authorized users can read worker assignments"
on public.worker_project_assignments
for select
to authenticated
using (private.can_read_worker(worker_id));
create policy "CEO can read worker rates"
on public.worker_rate_periods
for select
to authenticated
using (private.is_current_ceo());
create policy "CEO can read worker food deductions"
on public.worker_food_deduction_periods
for select
to authenticated
using (private.is_current_ceo());
create policy "Authorized users can read worker documents"
on public.worker_documents
for select
to authenticated
using (
  private.is_current_ceo()
  or (status = 'ACTIVE' and private.can_read_worker(worker_id))
);

create policy "CEO can create worker employment"
on public.worker_employment_periods
for insert to authenticated
with check (private.is_current_ceo() and created_by = private.current_application_user_id());
create policy "CEO can update worker employment"
on public.worker_employment_periods
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo());
create policy "CEO can create worker classification"
on public.worker_classification_periods
for insert to authenticated
with check (private.is_current_ceo() and created_by = private.current_application_user_id());
create policy "CEO can update worker classification"
on public.worker_classification_periods
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo());
create policy "CEO can create worker assignments"
on public.worker_project_assignments
for insert to authenticated
with check (private.is_current_ceo() and created_by = private.current_application_user_id());
create policy "CEO can update worker assignments"
on public.worker_project_assignments
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo());
create policy "CEO can create worker rates"
on public.worker_rate_periods
for insert to authenticated
with check (private.is_current_ceo() and created_by = private.current_application_user_id());
create policy "CEO can update worker rates"
on public.worker_rate_periods
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo());
create policy "CEO can create worker food deductions"
on public.worker_food_deduction_periods
for insert to authenticated
with check (private.is_current_ceo() and created_by = private.current_application_user_id());
create policy "CEO can update worker food deductions"
on public.worker_food_deduction_periods
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo());
create policy "CEO can create worker documents"
on public.worker_documents
for insert to authenticated
with check (private.is_current_ceo() and uploaded_by = private.current_application_user_id());
create policy "CEO can update worker documents"
on public.worker_documents
for update to authenticated
using (private.is_current_ceo())
with check (private.is_current_ceo() and changed_by = private.current_application_user_id());

create policy "Authorized users can open worker files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('worker-photos', 'worker-documents')
  and exists (
    select 1
    from public.worker_documents
    where worker_documents.bucket_id = objects.bucket_id
      and worker_documents.object_path = objects.name
      and (
        private.is_current_ceo()
        or (
          worker_documents.status = 'ACTIVE'
          and private.can_read_worker(worker_documents.worker_id)
        )
      )
  )
);
create policy "CEO can upload worker files"
on storage.objects
for insert
to authenticated
with check (
  private.is_current_ceo()
  and bucket_id in ('worker-photos', 'worker-documents')
);
create policy "CEO can replace worker files"
on storage.objects
for update
to authenticated
using (
  private.is_current_ceo()
  and bucket_id in ('worker-photos', 'worker-documents')
)
with check (
  private.is_current_ceo()
  and bucket_id in ('worker-photos', 'worker-documents')
);
create policy "CEO can remove worker files"
on storage.objects
for delete
to authenticated
using (
  private.is_current_ceo()
  and bucket_id in ('worker-photos', 'worker-documents')
);

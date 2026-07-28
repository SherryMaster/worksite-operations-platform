create type public.leave_request_status as enum (
  'PENDING',
  'APPROVED',
  'REJECTED'
);

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  is_active boolean not null default true,
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index leave_types_name_unique
on public.leave_types (lower(btrim(name)));

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references public.workers (id),
  project_id uuid not null references public.projects (id),
  leave_type_id uuid not null references public.leave_types (id),
  starts_on date not null,
  ends_on date not null,
  reason text check (
    reason is null or char_length(btrim(reason)) between 2 and 500
  ),
  notes text check (notes is null or char_length(btrim(notes)) <= 2000),
  status public.leave_request_status not null default 'PENDING',
  submitted_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  decided_by uuid references public.application_users (id),
  decided_at timestamptz,
  decision_note text check (
    decision_note is null
    or char_length(btrim(decision_note)) between 2 and 500
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (
    (
      status = 'PENDING'
      and decided_by is null
      and decided_at is null
      and decision_note is null
    )
    or (
      status in ('APPROVED', 'REJECTED')
      and decided_by is not null
      and decided_at is not null
    )
  )
);

create table public.leave_request_documents (
  id uuid primary key default gen_random_uuid(),
  leave_request_id uuid not null unique
    references public.leave_requests (id),
  bucket_id text not null default 'leave-documents'
    check (bucket_id = 'leave-documents'),
  object_path text not null unique,
  original_filename text not null
    check (char_length(btrim(original_filename)) between 1 and 255),
  mime_type text not null
    check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  uploaded_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now()
);

create index leave_requests_project_status_date_idx
on public.leave_requests (project_id, status, starts_on desc);

create index leave_requests_worker_date_idx
on public.leave_requests (worker_id, starts_on desc);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'leave-documents',
  'leave-documents',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_leave_project(
  target_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_current_ceo()
    or private.current_foreman_project_id() = target_project_id;
$$;

create or replace function private.can_submit_worker_leave(
  target_worker_id uuid,
  target_project_id uuid,
  target_starts_on date,
  target_ends_on date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    private.can_access_leave_project(target_project_id)
    and exists (
      select 1
      from public.worker_project_assignments
      join public.worker_employment_periods
        on worker_employment_periods.worker_id =
          worker_project_assignments.worker_id
      where worker_project_assignments.worker_id = target_worker_id
        and worker_project_assignments.project_id = target_project_id
        and worker_project_assignments.starts_on <= target_starts_on
        and (
          worker_project_assignments.ends_on is null
          or worker_project_assignments.ends_on > target_ends_on
        )
        and worker_employment_periods.status = 'ACTIVE'
        and worker_employment_periods.starts_on <= target_starts_on
        and (
          worker_employment_periods.ends_on is null
          or worker_employment_periods.ends_on > target_ends_on
        )
    );
$$;

create or replace function private.has_approved_leave(
  target_worker_id uuid,
  target_project_id uuid,
  target_work_date date
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.leave_requests
    where leave_requests.worker_id = target_worker_id
      and leave_requests.project_id = target_project_id
      and leave_requests.status = 'APPROVED'
      and target_work_date between
        leave_requests.starts_on and leave_requests.ends_on
  );
$$;

revoke all on function private.can_access_leave_project(uuid) from public;
revoke all on function private.can_submit_worker_leave(
  uuid,
  uuid,
  date,
  date
) from public;
revoke all on function private.has_approved_leave(uuid, uuid, date)
  from public;
grant execute on function private.can_access_leave_project(uuid)
  to authenticated;
grant execute on function private.can_submit_worker_leave(
  uuid,
  uuid,
  date,
  date
) to authenticated;
grant execute on function private.has_approved_leave(uuid, uuid, date)
  to authenticated;

create or replace function public.submit_leave_request(
  p_worker_id uuid,
  p_project_id uuid,
  p_leave_type_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_reason text default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  request_id uuid;
begin
  actor_id := private.current_application_user_id();
  if actor_id is null then
    raise exception 'An active application user is required';
  end if;
  if p_ends_on < p_starts_on then
    raise exception 'Leave end date cannot be before the start date';
  end if;
  if p_ends_on - p_starts_on > 365 then
    raise exception 'A leave request cannot cover more than 366 days';
  end if;
  if not exists (
    select 1
    from public.leave_types
    where id = p_leave_type_id
      and is_active
  ) then
    raise exception 'Select an active leave type';
  end if;
  if not private.can_submit_worker_leave(
    p_worker_id,
    p_project_id,
    p_starts_on,
    p_ends_on
  ) then
    raise exception
      'The worker is not active and assigned to this project for every selected date';
  end if;
  if exists (
    select 1
    from public.leave_requests
    where worker_id = p_worker_id
      and project_id = p_project_id
      and status in ('PENDING', 'APPROVED')
      and daterange(starts_on, ends_on, '[]')
        && daterange(p_starts_on, p_ends_on, '[]')
  ) then
    raise exception
      'This worker already has pending or approved leave on a selected date';
  end if;

  insert into public.leave_requests (
    worker_id,
    project_id,
    leave_type_id,
    starts_on,
    ends_on,
    reason,
    notes,
    submitted_by
  )
  values (
    p_worker_id,
    p_project_id,
    p_leave_type_id,
    p_starts_on,
    p_ends_on,
    nullif(btrim(p_reason), ''),
    nullif(btrim(p_notes), ''),
    actor_id
  )
  returning id into request_id;

  return request_id;
end;
$$;

create or replace function public.decide_leave_request(
  p_leave_request_id uuid,
  p_decision public.leave_request_status,
  p_decision_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  request_record public.leave_requests%rowtype;
begin
  actor_id := private.current_application_user_id();
  if actor_id is null or not private.is_current_ceo() then
    raise exception 'Only the CEO can approve or reject leave';
  end if;
  if p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Choose approve or reject';
  end if;

  select *
  into request_record
  from public.leave_requests
  where id = p_leave_request_id
  for update;

  if request_record.id is null then
    raise exception 'The leave request could not be found';
  end if;
  if request_record.status <> 'PENDING' then
    raise exception 'Only a pending leave request can be decided';
  end if;
  if p_decision = 'APPROVED' and exists (
    select 1
    from public.attendance_sessions
    where worker_id = request_record.worker_id
      and project_id = request_record.project_id
      and work_date between
        request_record.starts_on and request_record.ends_on
      and record_status = 'ACTIVE'
  ) then
    raise exception
      'Clear the worker attendance on the selected leave dates before approval';
  end if;

  update public.leave_requests
  set
    status = p_decision,
    decision_note = nullif(btrim(p_decision_note), ''),
    decided_by = actor_id,
    decided_at = now()
  where id = p_leave_request_id;
end;
$$;

revoke all on function public.submit_leave_request(
  uuid,
  uuid,
  uuid,
  date,
  date,
  text,
  text
) from public;
revoke all on function public.decide_leave_request(
  uuid,
  public.leave_request_status,
  text
) from public;
grant execute on function public.submit_leave_request(
  uuid,
  uuid,
  uuid,
  date,
  date,
  text,
  text
) to authenticated;
grant execute on function public.decide_leave_request(
  uuid,
  public.leave_request_status,
  text
) to authenticated;

create or replace function private.prevent_attendance_on_approved_leave()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.record_status = 'ACTIVE'
    and private.has_approved_leave(
      new.worker_id,
      new.project_id,
      new.work_date
    ) then
    raise exception
      'Attendance cannot be recorded on an approved full-day leave date';
  end if;
  return new;
end;
$$;

create trigger attendance_rejects_approved_leave
before insert or update of worker_id, project_id, work_date, record_status
on public.attendance_sessions
for each row execute function private.prevent_attendance_on_approved_leave();

create or replace function private.write_leave_audit_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous jsonb;
  current_value jsonb;
  record_id text;
begin
  previous := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_value := case when tg_op = 'DELETE' then null else to_jsonb(new) end;

  if tg_table_name = 'leave_request_documents' then
    previous := null;
    current_value := jsonb_build_object(
      'id', new.id,
      'leave_request_id', new.leave_request_id,
      'mime_type', new.mime_type,
      'size_bytes', new.size_bytes
    );
  end if;

  record_id := coalesce(current_value ->> 'id', previous ->> 'id');
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
    'leave.' || lower(tg_op),
    'leave',
    tg_table_name,
    record_id,
    'ONLINE',
    previous,
    current_value
  );

  return coalesce(new, old);
end;
$$;

create trigger leave_types_set_updated_at
before update on public.leave_types
for each row execute function private.set_updated_at();

create trigger leave_requests_set_updated_at
before update on public.leave_requests
for each row execute function private.set_updated_at();

create trigger leave_types_audit
after insert or update on public.leave_types
for each row execute function private.write_leave_audit_entry();

create trigger leave_requests_audit
after insert or update on public.leave_requests
for each row execute function private.write_leave_audit_entry();

create trigger leave_request_documents_audit
after insert on public.leave_request_documents
for each row execute function private.write_leave_audit_entry();

create view public.approved_leave_days
with (security_invoker = true)
as
select
  leave_requests.id as leave_request_id,
  leave_requests.worker_id,
  leave_requests.project_id,
  leave_requests.leave_type_id,
  generated.leave_date::date as leave_date,
  0::integer as payable_minutes
from public.leave_requests
cross join lateral generate_series(
  leave_requests.starts_on,
  leave_requests.ends_on,
  interval '1 day'
) generated(leave_date)
where leave_requests.status = 'APPROVED';

alter table public.leave_types enable row level security;
alter table public.leave_requests enable row level security;
alter table public.leave_request_documents enable row level security;

grant select, insert, update on public.leave_types to authenticated;
grant select on public.leave_requests to authenticated;
grant select, insert on public.leave_request_documents to authenticated;
grant select on public.approved_leave_days to authenticated;

create policy "Everyone can read active leave types and CEO can read all"
on public.leave_types
for select
to authenticated
using (is_active or private.is_current_ceo());

create policy "CEO can create leave types"
on public.leave_types
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can update leave types"
on public.leave_types
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "CEO reads all leave and Foremen read their project"
on public.leave_requests
for select
to authenticated
using (private.can_access_leave_project(project_id));

create policy "Authorized users can read leave request documents"
on public.leave_request_documents
for select
to authenticated
using (
  exists (
    select 1
    from public.leave_requests
    where leave_requests.id =
      leave_request_documents.leave_request_id
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

create policy "Authorized users can register one pending leave document"
on public.leave_request_documents
for insert
to authenticated
with check (
  uploaded_by = private.current_application_user_id()
  and exists (
    select 1
    from public.leave_requests
    where leave_requests.id =
      leave_request_documents.leave_request_id
      and leave_requests.status = 'PENDING'
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

create policy "Authorized users can open leave documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'leave-documents'
  and exists (
    select 1
    from public.leave_request_documents
    join public.leave_requests
      on leave_requests.id =
        leave_request_documents.leave_request_id
    where leave_request_documents.object_path = objects.name
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

create policy "Authorized users can upload pending leave documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'leave-documents'
  and exists (
    select 1
    from public.leave_requests
    where leave_requests.id =
      split_part(objects.name, '/', 1)::uuid
      and leave_requests.status = 'PENDING'
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

create policy "Authorized users can remove unregistered leave uploads"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'leave-documents'
  and exists (
    select 1
    from public.leave_requests
    where leave_requests.id =
      split_part(objects.name, '/', 1)::uuid
      and leave_requests.status = 'PENDING'
      and private.can_access_leave_project(leave_requests.project_id)
  )
);

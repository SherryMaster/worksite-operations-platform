create extension if not exists btree_gist with schema extensions;

create type public.project_status as enum (
  'PLANNED',
  'ACTIVE',
  'COMPLETED',
  'CANCELLED',
  'ARCHIVED'
);

create type public.audit_source as enum ('ONLINE', 'IMPORT', 'OFFLINE_SYNC');

create or replace function private.current_application_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select application_users.id
  from public.application_users
  where application_users.clerk_user_id = private.current_clerk_user_id()
    and application_users.is_active
  limit 1;
$$;

create or replace function private.is_current_ceo()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_application_role() = 'CEO'::public.application_role;
$$;

create or replace function private.current_business_date()
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kuala_Lumpur')::date;
$$;

revoke all on function private.current_application_user_id() from public;
revoke all on function private.is_current_ceo() from public;
revoke all on function private.current_business_date() from public;
grant execute on function private.current_application_user_id() to authenticated;
grant execute on function private.is_current_ceo() to authenticated;
grant execute on function private.current_business_date() to authenticated;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  client_name text not null check (char_length(btrim(client_name)) between 2 and 120),
  contractor_name text check (
    contractor_name is null
    or char_length(btrim(contractor_name)) between 2 and 120
  ),
  location text not null check (char_length(btrim(location)) between 2 and 180),
  start_date date not null,
  end_date date check (end_date is null or end_date >= start_date),
  status public.project_status not null default 'PLANNED',
  notes text check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  updated_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  status public.project_status not null,
  effective_at timestamptz not null default now(),
  changed_by uuid not null default private.current_application_user_id()
    references public.application_users (id)
);

create table public.foreman_project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  foreman_user_id uuid not null references public.application_users (id),
  starts_on date not null default private.current_business_date(),
  ends_on date check (ends_on is null or ends_on >= starts_on),
  created_by uuid not null default private.current_application_user_id()
    references public.application_users (id),
  ended_by uuid references public.application_users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index foreman_assignments_one_open_project
on public.foreman_project_assignments (project_id)
where ends_on is null;

create unique index foreman_assignments_one_open_foreman
on public.foreman_project_assignments (foreman_user_id)
where ends_on is null;

alter table public.foreman_project_assignments
add constraint foreman_assignments_project_period_no_overlap
exclude using gist (
  project_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);

alter table public.foreman_project_assignments
add constraint foreman_assignments_foreman_period_no_overlap
exclude using gist (
  foreman_user_id with =,
  daterange(starts_on, coalesce(ends_on, 'infinity'::date), '[)') with &&
);

create table public.trades (
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

create unique index trades_name_unique
on public.trades (lower(btrim(name)));

create table public.skill_levels (
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

create unique index skill_levels_name_unique
on public.skill_levels (lower(btrim(name)));

create table public.company_settings (
  singleton boolean primary key default true check (singleton),
  legal_name text check (
    legal_name is null
    or char_length(btrim(legal_name)) between 2 and 160
  ),
  display_name text check (
    display_name is null
    or char_length(btrim(display_name)) between 2 and 120
  ),
  currency_code text not null default 'MYR' check (currency_code = 'MYR'),
  timezone text not null default 'Asia/Kuala_Lumpur'
    check (timezone = 'Asia/Kuala_Lumpur'),
  updated_by uuid references public.application_users (id),
  updated_at timestamptz not null default now()
);

insert into public.company_settings (singleton) values (true);

create table public.audit_entries (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null default private.current_application_user_id()
    references public.application_users (id),
  action text not null check (char_length(action) between 3 and 120),
  module text not null check (char_length(module) between 2 and 80),
  entity_type text not null check (char_length(entity_type) between 2 and 80),
  entity_id text not null check (char_length(entity_id) between 1 and 180),
  source public.audit_source not null default 'ONLINE',
  before_data jsonb,
  after_data jsonb,
  occurred_at timestamptz not null default now()
);

create index projects_status_idx on public.projects (status);
create index projects_start_date_idx on public.projects (start_date);
create index project_status_history_project_idx
  on public.project_status_history (project_id, effective_at desc);
create index foreman_assignments_project_history_idx
  on public.foreman_project_assignments (project_id, starts_on desc);
create index foreman_assignments_foreman_history_idx
  on public.foreman_project_assignments (foreman_user_id, starts_on desc);
create index audit_entries_occurred_at_idx
  on public.audit_entries (occurred_at desc);
create index audit_entries_entity_idx
  on public.audit_entries (entity_type, entity_id, occurred_at desc);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.validate_project_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'ARCHIVED'::public.project_status
    and new.status = 'ARCHIVED'::public.project_status then
    raise exception 'Archived projects are read-only';
  end if;

  if old.status is distinct from new.status and not (
    (old.status = 'PLANNED' and new.status = 'ACTIVE')
    or (old.status = 'ACTIVE' and new.status in ('COMPLETED', 'CANCELLED'))
    or (
      old.status in ('COMPLETED', 'CANCELLED')
      and new.status in ('ACTIVE', 'ARCHIVED')
    )
    or (old.status = 'ARCHIVED' and new.status = 'PLANNED')
  ) then
    raise exception 'Invalid project status transition from % to %',
      old.status,
      new.status;
  end if;

  return new;
end;
$$;

create or replace function private.record_project_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.project_status_history (
      project_id,
      status,
      effective_at,
      changed_by
    )
    values (
      new.id,
      new.status,
      now(),
      private.current_application_user_id()
    );
  end if;

  if tg_op = 'UPDATE'
    and old.status is distinct from new.status
    and new.status in ('COMPLETED', 'CANCELLED', 'ARCHIVED') then
    update public.foreman_project_assignments
    set
      ends_on = private.current_business_date(),
      ended_by = private.current_application_user_id()
    where project_id = new.id
      and ends_on is null;
  end if;

  return new;
end;
$$;

create or replace function private.validate_foreman_assignment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_state public.project_status;
begin
  if tg_op = 'UPDATE' and (
    old.project_id is distinct from new.project_id
    or old.foreman_user_id is distinct from new.foreman_user_id
    or old.starts_on is distinct from new.starts_on
    or old.created_by is distinct from new.created_by
  ) then
    raise exception 'Assignment identity and start date are immutable';
  end if;

  if new.starts_on > private.current_business_date() then
    raise exception 'Future Foreman assignments are not supported';
  end if;

  if not exists (
    select 1
    from public.application_users
    where id = new.foreman_user_id
      and role = 'FOREMAN'::public.application_role
      and is_active
  ) then
    raise exception 'Foreman must be an active Foreman application user';
  end if;

  if tg_op = 'INSERT' then
    select status into project_state
    from public.projects
    where id = new.project_id;

    if project_state not in ('PLANNED', 'ACTIVE') then
      raise exception 'Foremen can only be assigned to planned or active projects';
    end if;
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
  record_id := coalesce(current_value ->> 'id', previous ->> 'id', 'singleton');
  module_name := case
    when tg_table_name = 'projects' then 'projects'
    when tg_table_name = 'foreman_project_assignments' then 'assignments'
    when tg_table_name = 'application_users' then 'users'
    when tg_table_name in ('trades', 'skill_levels') then 'categories'
    when tg_table_name = 'company_settings' then 'settings'
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
    previous,
    current_value
  );

  return coalesce(new, old);
end;
$$;

create trigger projects_validate_change
before update on public.projects
for each row execute function private.validate_project_change();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function private.set_updated_at();

create trigger projects_record_status
after insert or update of status on public.projects
for each row execute function private.record_project_status();

create trigger assignments_validate
before insert or update on public.foreman_project_assignments
for each row execute function private.validate_foreman_assignment();

create trigger assignments_set_updated_at
before update on public.foreman_project_assignments
for each row execute function private.set_updated_at();

create trigger trades_set_updated_at
before update on public.trades
for each row execute function private.set_updated_at();

create trigger skill_levels_set_updated_at
before update on public.skill_levels
for each row execute function private.set_updated_at();

create trigger projects_audit
after insert or update on public.projects
for each row execute function private.write_audit_entry();

create trigger assignments_audit
after insert or update on public.foreman_project_assignments
for each row execute function private.write_audit_entry();

create trigger application_users_audit
after insert or update on public.application_users
for each row execute function private.write_audit_entry();

create trigger trades_audit
after insert or update on public.trades
for each row execute function private.write_audit_entry();

create trigger skill_levels_audit
after insert or update on public.skill_levels
for each row execute function private.write_audit_entry();

create trigger company_settings_audit
after update on public.company_settings
for each row execute function private.write_audit_entry();

alter table public.projects enable row level security;
alter table public.project_status_history enable row level security;
alter table public.foreman_project_assignments enable row level security;
alter table public.trades enable row level security;
alter table public.skill_levels enable row level security;
alter table public.company_settings enable row level security;
alter table public.audit_entries enable row level security;

grant select, insert, update on public.projects to authenticated;
grant select on public.project_status_history to authenticated;
grant select, insert, update on public.foreman_project_assignments to authenticated;
grant select, insert, update on public.trades to authenticated;
grant select, insert, update on public.skill_levels to authenticated;
grant select, update on public.company_settings to authenticated;
grant select, insert on public.audit_entries to authenticated;
grant insert, update on public.application_users to authenticated;

create policy "CEO can read all projects and Foremen read their project"
on public.projects
for select
to authenticated
using (
  private.is_current_ceo()
  or exists (
    select 1
    from public.foreman_project_assignments
    where foreman_project_assignments.project_id = projects.id
      and foreman_project_assignments.foreman_user_id =
        private.current_application_user_id()
      and foreman_project_assignments.starts_on <= private.current_business_date()
      and (
        foreman_project_assignments.ends_on is null
        or foreman_project_assignments.ends_on > private.current_business_date()
      )
  )
);

create policy "CEO can create projects"
on public.projects
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can update projects"
on public.projects
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can read project status and Foremen read assigned status"
on public.project_status_history
for select
to authenticated
using (
  private.is_current_ceo()
  or exists (
    select 1
    from public.foreman_project_assignments
    where foreman_project_assignments.project_id =
      project_status_history.project_id
      and foreman_project_assignments.foreman_user_id =
        private.current_application_user_id()
      and foreman_project_assignments.ends_on is null
  )
);

create policy "CEO can read assignments and Foremen read their current assignment"
on public.foreman_project_assignments
for select
to authenticated
using (
  private.is_current_ceo()
  or (
    foreman_user_id = private.current_application_user_id()
    and starts_on <= private.current_business_date()
    and (ends_on is null or ends_on > private.current_business_date())
  )
);

create policy "CEO can create assignments"
on public.foreman_project_assignments
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
);

create policy "CEO can close assignments"
on public.foreman_project_assignments
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and ended_by = private.current_application_user_id()
);

create policy "Active users can read active trades"
on public.trades
for select
to authenticated
using (
  private.can_access_application()
  and (is_active or private.is_current_ceo())
);

create policy "CEO can create trades"
on public.trades
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can update trades"
on public.trades
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "Active users can read active skill levels"
on public.skill_levels
for select
to authenticated
using (
  private.can_access_application()
  and (is_active or private.is_current_ceo())
);

create policy "CEO can create skill levels"
on public.skill_levels
for insert
to authenticated
with check (
  private.is_current_ceo()
  and created_by = private.current_application_user_id()
  and updated_by = private.current_application_user_id()
);

create policy "CEO can update skill levels"
on public.skill_levels
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and updated_by = private.current_application_user_id()
);

create policy "Active users can read company settings"
on public.company_settings
for select
to authenticated
using (private.can_access_application());

create policy "CEO can update company settings"
on public.company_settings
for update
to authenticated
using (private.is_current_ceo())
with check (
  private.is_current_ceo()
  and singleton
  and updated_by = private.current_application_user_id()
  and currency_code = 'MYR'
  and timezone = 'Asia/Kuala_Lumpur'
);

create policy "CEO can read audit entries"
on public.audit_entries
for select
to authenticated
using (private.is_current_ceo());

create policy "CEO can record external audit entries"
on public.audit_entries
for insert
to authenticated
with check (
  private.is_current_ceo()
  and actor_user_id = private.current_application_user_id()
  and source = 'ONLINE'
);

create policy "CEO can create Foreman access"
on public.application_users
for insert
to authenticated
with check (
  private.is_current_ceo()
  and role = 'FOREMAN'
  and is_active
);

create policy "CEO can update Foreman access"
on public.application_users
for update
to authenticated
using (
  private.is_current_ceo()
  and role = 'FOREMAN'
)
with check (
  private.is_current_ceo()
  and role = 'FOREMAN'
);

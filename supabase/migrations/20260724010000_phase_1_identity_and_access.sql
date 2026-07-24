create type public.application_role as enum ('CEO', 'FOREMAN');

create table public.application_users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique check (clerk_user_id ~ '^user_'),
  role public.application_role not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.application_users is
  'Maps a Clerk identity to its active application role.';

alter table public.application_users enable row level security;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.current_clerk_user_id()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

create or replace function private.current_application_role()
returns public.application_role
language sql
stable
security definer
set search_path = ''
as $$
  select application_users.role
  from public.application_users
  where application_users.clerk_user_id = private.current_clerk_user_id()
    and application_users.is_active
  limit 1;
$$;

create or replace function private.is_current_application_user_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.application_users
    where application_users.clerk_user_id = private.current_clerk_user_id()
      and application_users.is_active
  );
$$;

create or replace function private.has_current_second_factor()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(auth.jwt() -> 'fva' ->> 1, '-1') <> '-1';
$$;

create or replace function private.can_access_application()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case private.current_application_role()
    when 'CEO'::public.application_role then true
    when 'FOREMAN'::public.application_role then private.has_current_second_factor()
    else false
  end;
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.current_clerk_user_id() to authenticated;
grant execute on function private.current_application_role() to authenticated;
grant execute on function private.is_current_application_user_active() to authenticated;
grant execute on function private.has_current_second_factor() to authenticated;
grant execute on function private.can_access_application() to authenticated;

grant select on public.application_users to authenticated;
revoke insert, update, delete, truncate, references, trigger
  on public.application_users
  from anon, authenticated;

create policy "Users can resolve their own application access"
on public.application_users
for select
to authenticated
using (
  clerk_user_id = private.current_clerk_user_id()
  or private.current_application_role() = 'CEO'::public.application_role
);

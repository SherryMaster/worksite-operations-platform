alter table public.application_users
add column mfa_required boolean not null default false;

comment on column public.application_users.mfa_required is
  'Whether the CEO requires this application user to complete MFA.';

create or replace function private.can_access_application()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when application_users.role = 'CEO'::public.application_role then true
    when application_users.role = 'FOREMAN'::public.application_role then
      not application_users.mfa_required
      or private.has_current_second_factor()
    else false
  end
  from public.application_users
  where application_users.clerk_user_id = private.current_clerk_user_id()
    and application_users.is_active
  limit 1;
$$;

revoke all on function private.can_access_application() from public;
grant execute on function private.can_access_application() to authenticated;

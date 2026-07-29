create or replace function private.can_access_application()
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
      and application_users.role in (
        'CEO'::public.application_role,
        'FOREMAN'::public.application_role
      )
  );
$$;

revoke all on function private.can_access_application() from public;
grant execute on function private.can_access_application() to authenticated;

drop function if exists private.has_current_second_factor();

alter table public.application_users
drop column if exists mfa_required;

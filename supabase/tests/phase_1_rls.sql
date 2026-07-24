\set ON_ERROR_STOP on

begin;

insert into public.application_users (clerk_user_id, role, is_active)
values
  ('user_phase1_ceo', 'CEO', true),
  ('user_phase1_foreman', 'FOREMAN', true),
  ('user_phase1_inactive', 'FOREMAN', false);

set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_ceo","role":"authenticated","fva":[0,-1]}',
  true
);

do $$
begin
  if (
    select count(*)
    from public.application_users
    where clerk_user_id like 'user_phase1_%'
  ) <> 3 then
    raise exception 'CEO should be able to read all application users';
  end if;

  if not private.can_access_application() then
    raise exception 'Active CEO should be authorized without mandatory MFA';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_foreman","role":"authenticated","fva":[0,-1]}',
  true
);

do $$
begin
  if (select count(*) from public.application_users) <> 1 then
    raise exception 'Foreman should only be able to read their own mapping';
  end if;

  if private.can_access_application() then
    raise exception 'Foreman without second-factor verification must be denied';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_foreman","role":"authenticated","fva":[0,0]}',
  true
);

do $$
begin
  if not private.can_access_application() then
    raise exception 'Active Foreman with second-factor verification should be authorized';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_inactive","role":"authenticated","fva":[0,0]}',
  true
);

do $$
begin
  if (select count(*) from public.application_users) <> 1 then
    raise exception 'Inactive user should only be able to resolve their own mapping';
  end if;

  if private.can_access_application() then
    raise exception 'Inactive application user must be denied';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.application_users',
    'INSERT'
  ) then
    raise exception 'Authenticated users must not be able to create access mappings';
  end if;
end
$$;

rollback;

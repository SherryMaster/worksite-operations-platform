\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (clerk_user_id, role, is_active)
values
  ('user_phase1_ceo', 'CEO', true),
  ('user_phase1_foreman', 'FOREMAN', true),
  ('user_phase1_inactive', 'FOREMAN', false);

set local session_replication_role = origin;
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

  if not private.can_access_application() then
    raise exception 'Foreman should be authorized while MFA is optional';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_ceo","role":"authenticated","fva":[0,-1]}',
  true
);

update public.application_users
set mfa_required = true
where clerk_user_id = 'user_phase1_foreman';

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase1_foreman","role":"authenticated","fva":[0,-1]}',
  true
);

do $$
begin
  if private.can_access_application() then
    raise exception 'Foreman must be denied when required MFA is not verified';
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
    raise exception 'Foreman with required and verified MFA should be authorized';
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

  begin
    insert into public.application_users (clerk_user_id, role)
    values ('user_phase1_unauthorized', 'FOREMAN');
    raise exception 'Inactive users must not be able to create access mappings';
  exception
    when insufficient_privilege then null;
  end;
end
$$;

rollback;

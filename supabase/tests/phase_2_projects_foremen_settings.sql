\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('20000000-0000-0000-0000-000000000001', 'user_phase2_ceo', 'CEO', true),
  ('20000000-0000-0000-0000-000000000002', 'user_phase2_foreman_a', 'FOREMAN', true),
  ('20000000-0000-0000-0000-000000000003', 'user_phase2_foreman_b', 'FOREMAN', true);

set local session_replication_role = origin;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase2_ceo","role":"authenticated","fva":[0,-1]}',
  true
);

insert into public.projects (
  id,
  name,
  client_name,
  location,
  start_date
)
values (
  '21000000-0000-0000-0000-000000000001',
  'Phase 2 Project A',
  'Client A',
  'Kuala Lumpur',
  private.current_business_date()
);

insert into public.projects (
  id,
  name,
  client_name,
  location,
  start_date
)
values (
  '21000000-0000-0000-0000-000000000002',
  'Phase 2 Project B',
  'Client B',
  'Johor',
  private.current_business_date()
);

insert into public.foreman_project_assignments (
  project_id,
  foreman_user_id,
  starts_on
)
values (
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  private.current_business_date()
);

do $$
begin
  begin
    update public.projects
    set status = 'COMPLETED'
    where id = '21000000-0000-0000-0000-000000000002';
    raise exception 'Expected invalid project status transition failure';
  exception
    when raise_exception then
      if sqlerrm not like 'Invalid project status transition%' then
        raise;
      end if;
  end;

  begin
    insert into public.foreman_project_assignments (
      project_id,
      foreman_user_id,
      starts_on
    )
    values (
      '21000000-0000-0000-0000-000000000002',
      '20000000-0000-0000-0000-000000000002',
      private.current_business_date()
    );
    raise exception 'Expected one-project-per-Foreman constraint failure';
  exception
    when unique_violation or exclusion_violation then null;
  end;

  if (
    select count(*)
    from public.audit_entries
    where entity_id = '21000000-0000-0000-0000-000000000001'
  ) = 0 then
    raise exception 'Project creation should create an audit entry';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase2_foreman_a","role":"authenticated","fva":[0,0]}',
  true
);

do $$
begin
  if (select count(*) from public.projects) <> 1 then
    raise exception 'Foreman should see only the assigned project';
  end if;

  if exists (
    select 1
    from public.projects
    where id = '21000000-0000-0000-0000-000000000002'
  ) then
    raise exception 'Foreman must not read another project by ID';
  end if;

  begin
    update public.projects
    set name = 'Unauthorized update'
    where id = '21000000-0000-0000-0000-000000000001';
    if found then
      raise exception 'Foreman must not update an assigned project';
    end if;
  exception
    when insufficient_privilege then null;
  end;

  if exists (select 1 from public.audit_entries) then
    raise exception 'Foreman must not read the CEO audit log';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase2_ceo","role":"authenticated","fva":[0,-1]}',
  true
);

select public.assign_foreman(
  '21000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000003',
  private.current_business_date()
);

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase2_foreman_a","role":"authenticated","fva":[0,0]}',
  true
);

do $$
begin
  if exists (select 1 from public.projects) then
    raise exception 'Replaced Foreman must lose project access immediately';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase2_foreman_b","role":"authenticated","fva":[0,0]}',
  true
);

do $$
begin
  if (
    select count(*)
    from public.projects
    where id = '21000000-0000-0000-0000-000000000001'
  ) <> 1 then
    raise exception 'Replacement Foreman should gain assigned project access';
  end if;
end
$$;

rollback;

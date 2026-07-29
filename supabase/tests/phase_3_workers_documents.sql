\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('30000000-0000-0000-0000-000000000001', 'user_phase3_ceo', 'CEO', true),
  ('30000000-0000-0000-0000-000000000002', 'user_phase3_foreman_a', 'FOREMAN', true),
  ('30000000-0000-0000-0000-000000000003', 'user_phase3_foreman_b', 'FOREMAN', true);

insert into public.projects (
  id,
  name,
  client_name,
  location,
  start_date,
  created_by,
  updated_by
)
values
  (
    '31000000-0000-0000-0000-000000000001',
    'Phase 3 Project A',
    'Client A',
    'Kuala Lumpur',
    current_date,
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    'Phase 3 Project B',
    'Client B',
    'Johor',
    current_date,
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001'
  );

insert into public.trades (id, name, created_by, updated_by)
values (
  '32000000-0000-0000-0000-000000000001',
  'Phase 3 Electrician',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001'
);
insert into public.skill_levels (id, name, created_by, updated_by)
values (
  '33000000-0000-0000-0000-000000000001',
  'Phase 3 Skilled',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001'
);
insert into public.document_types (
  id,
  name,
  expects_issue_date,
  expects_expiry_date,
  created_by,
  updated_by
)
values (
  '34000000-0000-0000-0000-000000000001',
  'Phase 3 Permit',
  true,
  true,
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000001'
);

insert into public.foreman_project_assignments (
  project_id,
  foreman_user_id,
  starts_on,
  created_by
)
values
  (
    '31000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    current_date,
    '30000000-0000-0000-0000-000000000001'
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    current_date,
    '30000000-0000-0000-0000-000000000001'
  );

set local session_replication_role = origin;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_ceo","role":"authenticated"}',
  true
);

select public.create_worker(
  'Phase Three Worker',
  '+60123456789',
  '',
  '',
  'Pakistan',
  '',
  'P3-PASSPORT-001',
  'P3-PERMIT-001',
  current_date - 30,
  current_date + 30,
  '',
  'ACTIVE',
  current_date - 10,
  '32000000-0000-0000-0000-000000000001',
  '33000000-0000-0000-0000-000000000001',
  1500,
  current_date - 10,
  12000,
  '31000000-0000-0000-0000-000000000001',
  current_date - 10
);

do $$
declare
  worker_record public.workers%rowtype;
begin
  select * into worker_record
  from public.workers
  where legal_name = 'Phase Three Worker';

  if worker_record.id is null then
    raise exception 'CEO should be able to create a worker';
  end if;
  if (
    select hourly_rate_sen
    from public.worker_rate_periods
    where worker_id = worker_record.id and ends_on is null
  ) <> 1500 then
    raise exception 'Initial worker rate was not created';
  end if;
  if exists (
    select 1
    from public.audit_entries
    where entity_type = 'workers'
      and entity_id = worker_record.id::text
      and after_data ? 'passport_number'
  ) then
    raise exception 'Full worker identity numbers must not enter audit data';
  end if;
end
$$;

insert into storage.objects (bucket_id, name)
select
  'worker-documents',
  workers.id::text || '/phase-3-test.pdf'
from public.workers
where legal_name = 'Phase Three Worker';

insert into public.worker_documents (
  worker_id,
  file_kind,
  document_type_id,
  document_number,
  bucket_id,
  object_path,
  original_filename,
  mime_type,
  byte_size,
  issue_date,
  expiry_date
)
select
  workers.id,
  'DOCUMENT',
  '34000000-0000-0000-0000-000000000001',
  'P3-DOCUMENT-SECRET',
  'worker-documents',
  workers.id::text || '/phase-3-test.pdf',
  'permit.pdf',
  'application/pdf',
  128,
  current_date - 30,
  current_date + 30
from public.workers
where legal_name = 'Phase Three Worker';

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_foreman_a","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.workers) <> 1 then
    raise exception 'Assigned Foreman should see the current project worker';
  end if;
  if (select count(*) from public.worker_documents) <> 1 then
    raise exception 'Assigned Foreman should see current worker documents';
  end if;
  if (
    select count(*)
    from storage.objects
    where bucket_id = 'worker-documents'
  ) <> 1 then
    raise exception 'Assigned Foreman should be authorized for the private file';
  end if;

  begin
    perform public.create_worker(
      'Unauthorized Worker',
      '+60111111111',
      '',
      '',
      '',
      'P3-CNIC-002',
      '',
      '',
      null,
      null,
      '',
      'ACTIVE',
      current_date,
      '32000000-0000-0000-0000-000000000001',
      '33000000-0000-0000-0000-000000000001',
      1200,
      current_date,
      0,
      null,
      current_date
    );
    raise exception 'Foreman must not create workers';
  exception
    when raise_exception then
      if sqlerrm <> 'Only the CEO can create workers' then
        raise;
      end if;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_ceo","role":"authenticated"}',
  true
);

select public.set_worker_rate(
  (select id from public.workers where legal_name = 'Phase Three Worker'),
  1750,
  current_date
);

select public.transfer_worker(
  (select id from public.workers where legal_name = 'Phase Three Worker'),
  '31000000-0000-0000-0000-000000000002',
  current_date
);

do $$
begin
  if (
    select hourly_rate_sen
    from public.worker_rate_periods
    where worker_id = (
      select id from public.workers where legal_name = 'Phase Three Worker'
    )
      and starts_on <= current_date
      and (ends_on is null or ends_on > current_date)
  ) <> 1750 then
    raise exception 'Rate effective on the selected date should be correct';
  end if;

  begin
    insert into public.worker_project_assignments (
      worker_id,
      project_id,
      starts_on
    )
    select
      workers.id,
      '31000000-0000-0000-0000-000000000001',
      current_date
    from public.workers
    where legal_name = 'Phase Three Worker';
    raise exception 'Expected overlapping worker assignment failure';
  exception
    when unique_violation or exclusion_violation then null;
  end;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_foreman_a","role":"authenticated"}',
  true
);

do $$
begin
  if exists (select 1 from public.workers) then
    raise exception 'Previous Foreman must lose worker access after transfer';
  end if;
  if exists (
    select 1
    from storage.objects
    where bucket_id = 'worker-documents'
  ) then
    raise exception 'Previous Foreman must lose private file access after transfer';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_foreman_b","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.workers) <> 1 then
    raise exception 'Destination Foreman should gain worker access';
  end if;
  if (select count(*) from public.worker_project_assignments) <> 1 then
    raise exception 'Foreman should see only the current project assignment';
  end if;
  if (select count(*) from public.worker_rate_periods) <> 0 then
    raise exception 'Foremen must not read worker rates';
  end if;
  if (select count(*) from public.worker_food_deduction_periods) <> 0 then
    raise exception 'Foremen must not read food deductions';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase3_ceo","role":"authenticated"}',
  true
);

update public.projects
set status = 'ACTIVE'
where id = '31000000-0000-0000-0000-000000000002';

update public.projects
set status = 'COMPLETED'
where id = '31000000-0000-0000-0000-000000000002';

do $$
begin
  if exists (
    select 1
    from public.worker_project_assignments
    where project_id = '31000000-0000-0000-0000-000000000002'
      and ends_on is null
  ) then
    raise exception 'Completing a project should close current worker assignments';
  end if;
end
$$;

select public.set_worker_employment_status(
  (select id from public.workers where legal_name = 'Phase Three Worker'),
  'LEFT_COMPANY',
  current_date,
  'Phase 3 archive test'
);

select public.set_worker_employment_status(
  (select id from public.workers where legal_name = 'Phase Three Worker'),
  'ARCHIVED',
  current_date,
  'Phase 3 archive test'
);

do $$
begin
  begin
    update public.workers
    set phone_number = '+60999999999'
    where legal_name = 'Phase Three Worker';
    raise exception 'Expected archived worker update failure';
  exception
    when raise_exception then
      if sqlerrm <> 'Archived workers are read-only' then
        raise;
      end if;
  end;
end
$$;

rollback;

\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('50000000-0000-0000-0000-000000000001', 'user_phase5_ceo', 'CEO', true),
  ('50000000-0000-0000-0000-000000000002', 'user_phase5_foreman_a', 'FOREMAN', true),
  ('50000000-0000-0000-0000-000000000003', 'user_phase5_foreman_b', 'FOREMAN', true);

insert into public.projects (
  id,
  name,
  client_name,
  location,
  start_date,
  status,
  created_by,
  updated_by
)
values
  (
    '51000000-0000-0000-0000-000000000001',
    'Phase 5 Project A',
    'Client A',
    'Kuala Lumpur',
    '2026-07-01',
    'ACTIVE',
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001'
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    'Phase 5 Project B',
    'Client B',
    'Johor',
    '2026-07-01',
    'ACTIVE',
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.workers (
  id,
  legal_name,
  phone_number,
  created_by,
  updated_by
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    'Phase Five Worker A',
    '+60111111111',
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001'
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    'Phase Five Worker B',
    '+60222222222',
    '50000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.worker_documents (worker_id, file_kind, document_type_id, document_number, uploaded_by)
select worker.id, 'DOCUMENT', type.id, worker.number, '50000000-0000-0000-0000-000000000001'::uuid
from (values
  ('52000000-0000-0000-0000-000000000001'::uuid, 'PHASE5-A'),
  ('52000000-0000-0000-0000-000000000002'::uuid, 'PHASE5-B')
) as worker(id, number)
cross join public.document_types type
where type.system_code = 'PASSPORT';

insert into public.foreman_project_assignments (
  project_id,
  foreman_user_id,
  starts_on,
  created_by
)
values
  (
    '51000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000002',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  ),
  (
    '51000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000003',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.worker_project_assignments (
  worker_id,
  project_id,
  starts_on,
  created_by
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    '51000000-0000-0000-0000-000000000001',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    '51000000-0000-0000-0000-000000000002',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.worker_employment_periods (
  worker_id,
  status,
  starts_on,
  created_by
)
values
  (
    '52000000-0000-0000-0000-000000000001',
    'ACTIVE',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  ),
  (
    '52000000-0000-0000-0000-000000000002',
    'ACTIVE',
    '2026-07-01',
    '50000000-0000-0000-0000-000000000001'
  );

insert into public.leave_types (
  id,
  name,
  created_by,
  updated_by
)
values (
  '53000000-0000-0000-0000-000000000001',
  'Phase 5 Test Leave',
  '50000000-0000-0000-0000-000000000001',
  '50000000-0000-0000-0000-000000000001'
);

set local session_replication_role = origin;
set local role authenticated;

create temporary table phase5_values (
  approved_request_id uuid,
  conflict_request_id uuid,
  rejected_request_id uuid
);
insert into phase5_values default values;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase5_foreman_a","role":"authenticated"}',
  true
);

update phase5_values
set approved_request_id = public.submit_leave_request(
  '52000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '2026-08-01',
  '2026-08-02',
  'Family matter',
  ''
);

insert into storage.objects (bucket_id, name)
select
  'leave-documents',
  approved_request_id::text || '/phase-5-test-file'
from phase5_values;

insert into public.leave_request_documents (
  id,
  leave_request_id,
  object_path,
  original_filename,
  mime_type,
  size_bytes
)
select
  '53500000-0000-0000-0000-000000000001',
  approved_request_id,
  approved_request_id::text || '/phase-5-test-file',
  'support.pdf',
  'application/pdf',
  128
from phase5_values;

do $$
begin
  begin
    perform public.submit_leave_request(
      '52000000-0000-0000-0000-000000000002',
      '51000000-0000-0000-0000-000000000002',
      '53000000-0000-0000-0000-000000000001',
      '2026-08-01',
      '2026-08-01',
      '',
      ''
    );
    raise exception 'Foreman submitted leave outside the assigned project';
  exception
    when raise_exception then
      if sqlerrm = 'Foreman submitted leave outside the assigned project' then
        raise;
      end if;
  end;

  if (select count(*) from public.leave_requests) <> 1 then
    raise exception 'Foreman RLS must show only the assigned project leave';
  end if;
  if (select count(*) from public.leave_request_documents) <> 1 then
    raise exception 'Assigned Foreman should read the private leave file';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase5_ceo","role":"authenticated"}',
  true
);

select public.decide_leave_request(
  approved_request_id,
  'APPROVED',
  'Approved for test'
)
from phase5_values;

do $$
declare
  result jsonb;
begin
  if (
    select count(*)
    from public.approved_leave_days
    where leave_request_id = (
      select approved_request_id from phase5_values
    )
      and payable_minutes = 0
  ) <> 2 then
    raise exception 'Every approved full day must expose zero payable minutes';
  end if;

  result := public.apply_attendance_action(
    '54000000-0000-0000-0000-000000000001',
    '51000000-0000-0000-0000-000000000001',
    'ENTER',
    jsonb_build_object(
      'workerId', '52000000-0000-0000-0000-000000000001',
      'sessionId', '55000000-0000-0000-0000-000000000001',
      'workDate', '2026-08-01',
      'occurredAt', '2026-08-01T08:00:00+08:00'
    )
  );
  if result ->> 'status' <> 'FAILED' then
    raise exception 'Approved leave must block attendance entry: %', result;
  end if;

  if not exists (
    select 1
    from public.audit_entries
    where module = 'leave'
      and entity_id = (
        select approved_request_id::text from phase5_values
      )
  ) then
    raise exception 'Leave submission and decision must be audited';
  end if;
end
$$;

select public.apply_attendance_action(
  '54000000-0000-0000-0000-000000000002',
  '51000000-0000-0000-0000-000000000001',
  'ENTER',
  jsonb_build_object(
    'workerId', '52000000-0000-0000-0000-000000000001',
    'sessionId', '55000000-0000-0000-0000-000000000002',
    'workDate', '2026-08-03',
    'occurredAt', '2026-08-03T08:00:00+08:00'
  )
);

select public.apply_attendance_action(
  '54000000-0000-0000-0000-000000000004',
  '51000000-0000-0000-0000-000000000001',
  'EXIT',
  jsonb_build_object(
    'sessionId', '55000000-0000-0000-0000-000000000002',
    'occurredAt', '2026-08-03T17:00:00+08:00'
  )
);

update phase5_values
set conflict_request_id = public.submit_leave_request(
  '52000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '2026-08-03',
  '2026-08-03',
  '',
  ''
);

do $$
begin
  begin
    perform public.decide_leave_request(
      (select conflict_request_id from phase5_values),
      'APPROVED',
      ''
    );
    raise exception 'Approval succeeded despite existing attendance';
  exception
    when raise_exception then
      if sqlerrm = 'Approval succeeded despite existing attendance' then
        raise;
      end if;
  end;
end
$$;

update phase5_values
set rejected_request_id = public.submit_leave_request(
  '52000000-0000-0000-0000-000000000001',
  '51000000-0000-0000-0000-000000000001',
  '53000000-0000-0000-0000-000000000001',
  '2026-08-04',
  '2026-08-04',
  '',
  ''
);

select public.decide_leave_request(
  rejected_request_id,
  'REJECTED',
  'Not approved'
)
from phase5_values;

do $$
declare
  result jsonb;
begin
  result := public.apply_attendance_action(
    '54000000-0000-0000-0000-000000000003',
    '51000000-0000-0000-0000-000000000001',
    'ENTER',
    jsonb_build_object(
      'workerId', '52000000-0000-0000-0000-000000000001',
      'sessionId', '55000000-0000-0000-0000-000000000003',
      'workDate', '2026-08-04',
      'occurredAt', '2026-08-04T08:00:00+08:00'
    )
  );
  if result ->> 'status' <> 'SYNCED' then
    raise exception 'Rejected leave must not block attendance: %', result;
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase5_foreman_b","role":"authenticated"}',
  true
);

do $$
begin
  if exists (select 1 from public.leave_requests) then
    raise exception 'Another project Foreman must not read Phase 5 leave';
  end if;
  if exists (select 1 from public.leave_request_documents) then
    raise exception 'Another project Foreman must not read leave file metadata';
  end if;
  if exists (
    select 1 from storage.objects where bucket_id = 'leave-documents'
  ) then
    raise exception 'Another project Foreman must not open private leave files';
  end if;
end
$$;

rollback;

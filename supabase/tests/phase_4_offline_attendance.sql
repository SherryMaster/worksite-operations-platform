\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('40000000-0000-0000-0000-000000000001', 'user_phase4_ceo', 'CEO', true),
  ('40000000-0000-0000-0000-000000000002', 'user_phase4_foreman_a', 'FOREMAN', true),
  ('40000000-0000-0000-0000-000000000003', 'user_phase4_foreman_b', 'FOREMAN', true);

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
    '41000000-0000-0000-0000-000000000001',
    'Phase 4 Project A',
    'Client A',
    'Kuala Lumpur',
    '2026-07-01',
    'ACTIVE',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    'Phase 4 Project B',
    'Client B',
    'Johor',
    '2026-07-01',
    'ACTIVE',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
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
    '42000000-0000-0000-0000-000000000001',
    'Phase Four Worker A',
    '+60111111111',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    'Phase Four Worker B',
    '+60222222222',
    '40000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001'
  );

insert into public.worker_documents (worker_id, file_kind, document_type_id, document_number)
select worker.id, 'DOCUMENT', type.id, worker.number
from (values
  ('42000000-0000-0000-0000-000000000001'::uuid, 'PHASE4-A'),
  ('42000000-0000-0000-0000-000000000002'::uuid, 'PHASE4-B')
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
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000002',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000003',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  );

insert into public.worker_project_assignments (
  worker_id,
  project_id,
  starts_on,
  created_by
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    '41000000-0000-0000-0000-000000000002',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  );

insert into public.worker_employment_periods (
  worker_id,
  status,
  starts_on,
  created_by
)
values
  (
    '42000000-0000-0000-0000-000000000001',
    'ACTIVE',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  ),
  (
    '42000000-0000-0000-0000-000000000002',
    'ACTIVE',
    '2026-07-01',
    '40000000-0000-0000-0000-000000000001'
  );

set local session_replication_role = origin;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase4_foreman_a","role":"authenticated"}',
  true
);

do $$
declare
  result jsonb;
begin
  result := public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    'ENTER',
    jsonb_build_object(
      'capturedOffline', true,
      'workerId', '42000000-0000-0000-0000-000000000001',
      'sessionId', '44000000-0000-0000-0000-000000000001',
      'workDate', '2026-07-20',
      'occurredAt', '2026-07-20T08:00:00+08:00'
    )
  );
  if result ->> 'status' <> 'SYNCED' then
    raise exception 'Foreman entrance should synchronize: %', result;
  end if;

  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000001',
    '41000000-0000-0000-0000-000000000001',
    'ENTER',
    jsonb_build_object(
      'capturedOffline', true,
      'workerId', '42000000-0000-0000-0000-000000000001',
      'sessionId', '44000000-0000-0000-0000-000000000001',
      'workDate', '2026-07-20',
      'occurredAt', '2026-07-20T08:00:00+08:00'
    )
  );

  if (
    select count(*)
    from public.attendance_sessions
    where id = '44000000-0000-0000-0000-000000000001'
  ) <> 1 then
    raise exception 'Retrying an action ID must not duplicate its session';
  end if;

  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000002',
    '41000000-0000-0000-0000-000000000001',
    'START_BREAK',
    jsonb_build_object(
      'capturedOffline', true,
      'sessionId', '44000000-0000-0000-0000-000000000001',
      'breakId', '45000000-0000-0000-0000-000000000001',
      'occurredAt', '2026-07-20T12:00:00+08:00'
    )
  );
  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000003',
    '41000000-0000-0000-0000-000000000001',
    'END_BREAK',
    jsonb_build_object(
      'capturedOffline', true,
      'breakId', '45000000-0000-0000-0000-000000000001',
      'occurredAt', '2026-07-20T13:00:00+08:00'
    )
  );
  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000004',
    '41000000-0000-0000-0000-000000000001',
    'EXIT',
    jsonb_build_object(
      'capturedOffline', true,
      'sessionId', '44000000-0000-0000-0000-000000000001',
      'occurredAt', '2026-07-20T18:00:00+08:00'
    )
  );

  if (
    select exited_at
    from public.attendance_sessions
    where id = '44000000-0000-0000-0000-000000000001'
  ) is null then
    raise exception 'Exit should close the session';
  end if;

  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000005',
    '41000000-0000-0000-0000-000000000001',
    'ENTER',
    jsonb_build_object(
      'workerId', '42000000-0000-0000-0000-000000000001',
      'sessionId', '44000000-0000-0000-0000-000000000002',
      'workDate', '2026-07-20',
      'occurredAt', '2026-07-20T19:00:00+08:00'
    )
  );
  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000006',
    '41000000-0000-0000-0000-000000000001',
    'EXIT',
    jsonb_build_object(
      'sessionId', '44000000-0000-0000-0000-000000000002',
      'occurredAt', '2026-07-20T20:00:00+08:00'
    )
  );

  if (
    select count(*)
    from public.attendance_sessions
    where worker_id = '42000000-0000-0000-0000-000000000001'
      and work_date = '2026-07-20'
      and record_status = 'ACTIVE'
  ) <> 2 then
    raise exception 'Multiple non-overlapping sessions should be supported';
  end if;

  perform public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000007',
    '41000000-0000-0000-0000-000000000001',
    'SET_DAY_TYPE',
    jsonb_build_object(
      'workDate', '2026-07-20',
      'dayType', 'PUBLIC_HOLIDAY'
    )
  );
  if (
    select day_type
    from public.project_days
    where project_id = '41000000-0000-0000-0000-000000000001'
      and work_date = '2026-07-20'
  ) <> 'PUBLIC_HOLIDAY' then
    raise exception 'The assigned Foreman should set the project day type';
  end if;

  result := public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000008',
    '41000000-0000-0000-0000-000000000002',
    'ENTER',
    jsonb_build_object(
      'workerId', '42000000-0000-0000-0000-000000000002',
      'sessionId', '44000000-0000-0000-0000-000000000003',
      'workDate', '2026-07-20',
      'occurredAt', '2026-07-20T08:00:00+08:00'
    )
  );
  if result ->> 'status' <> 'FAILED' then
    raise exception 'A Foreman must not sync attendance for another project';
  end if;

end
$$;

do $$
begin
  if (select count(*) from public.attendance_sessions) <> 2 then
    raise exception 'Foreman RLS must hide the other project attendance';
  end if;
  if (select count(*) from public.project_days) <> 1 then
    raise exception 'Foreman RLS must hide the other project day types';
  end if;
end
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase4_ceo","role":"authenticated"}',
  true
);

do $$
declare
  result jsonb;
begin
  if not exists (
    select 1
    from public.audit_entries
    where module = 'attendance'
      and source = 'OFFLINE_SYNC'
  ) then
    raise exception 'Offline attendance changes must be audited as offline sync';
  end if;

  result := public.apply_attendance_action(
    '43000000-0000-0000-0000-000000000009',
    '41000000-0000-0000-0000-000000000001',
    'CORRECT_DAY',
    jsonb_build_object(
      'workerId', '42000000-0000-0000-0000-000000000001',
      'workDate', '2026-07-20',
      'note', 'Corrected from the signed worksite sheet',
      'sessions', jsonb_build_array(
        jsonb_build_object(
          'id', '44000000-0000-0000-0000-000000000004',
          'enteredAt', '2026-07-20T08:30:00+08:00',
          'exitedAt', '2026-07-20T17:30:00+08:00',
          'breaks', jsonb_build_array()
        )
      )
    )
  );
  if result ->> 'status' <> 'SYNCED' then
    raise exception 'CEO correction should synchronize: %', result;
  end if;
  if (
    select count(*)
    from public.attendance_sessions
    where worker_id = '42000000-0000-0000-0000-000000000001'
      and work_date = '2026-07-20'
      and record_status = 'ACTIVE'
  ) <> 1 then
    raise exception 'Correction should replace the active attendance day';
  end if;
  if (
    select count(*)
    from public.attendance_sessions
    where worker_id = '42000000-0000-0000-0000-000000000001'
      and work_date = '2026-07-20'
      and record_status = 'VOID'
  ) <> 2 then
    raise exception 'Correction must preserve replaced sessions as history';
  end if;
end
$$;

rollback;

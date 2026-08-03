\set ON_ERROR_STOP on

begin;

set local session_replication_role = replica;

insert into public.application_users (id, clerk_user_id, role, is_active)
values
  ('60000000-0000-0000-0000-000000000001', 'user_phase6_ceo', 'CEO', true),
  ('60000000-0000-0000-0000-000000000002', 'user_phase6_foreman', 'FOREMAN', true);

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
values (
  '61000000-0000-0000-0000-000000000001',
  'Phase 6 Payroll Project',
  'Payroll Client',
  'Kuala Lumpur',
  '2099-07-01',
  'ACTIVE',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001'
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
    '62000000-0000-0000-0000-000000000001',
    'Phase Six Worker A',
    '+60111111111',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    'Phase Six Worker B',
    '+60222222222',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.worker_documents (worker_id, file_kind, document_type_id, document_number, uploaded_by)
select worker.id, 'DOCUMENT', type.id, worker.number, '60000000-0000-0000-0000-000000000001'::uuid
from (values
  ('62000000-0000-0000-0000-000000000001'::uuid, 'PHASE6-A'),
  ('62000000-0000-0000-0000-000000000002'::uuid, 'PHASE6-B')
) as worker(id, number)
cross join public.document_types type
where type.system_code = 'PASSPORT';

insert into public.foreman_project_assignments (
  project_id,
  foreman_user_id,
  starts_on,
  created_by
)
values (
  '61000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000002',
  '2099-07-01',
  '60000000-0000-0000-0000-000000000001'
);

insert into public.worker_project_assignments (
  worker_id,
  project_id,
  starts_on,
  created_by
)
values
  (
    '62000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.worker_employment_periods (
  worker_id,
  status,
  starts_on,
  created_by
)
values
  (
    '62000000-0000-0000-0000-000000000001',
    'ACTIVE',
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    'ACTIVE',
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.worker_rate_periods (
  id,
  worker_id,
  hourly_rate_sen,
  starts_on,
  ends_on,
  created_by
)
values
  (
    '63000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    1200,
    '2099-07-01',
    '2099-07-16',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '63000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000001',
    1800,
    '2099-07-16',
    null,
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '63000000-0000-0000-0000-000000000003',
    '62000000-0000-0000-0000-000000000002',
    1000,
    '2099-07-01',
    null,
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.worker_food_deduction_periods (
  worker_id,
  monthly_amount_sen,
  starts_on,
  created_by
)
values
  (
    '62000000-0000-0000-0000-000000000001',
    5000,
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '62000000-0000-0000-0000-000000000002',
    0,
    '2099-07-01',
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.project_days (
  project_id,
  work_date,
  day_type,
  created_by,
  updated_by
)
values (
  '61000000-0000-0000-0000-000000000001',
  '2099-07-13',
  'PUBLIC_HOLIDAY',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001'
);

insert into public.attendance_sessions (
  id,
  worker_id,
  project_id,
  work_date,
  entered_at,
  exited_at,
  created_by,
  updated_by
)
values
  (
    '64000000-0000-0000-0000-000000000001',
    '62000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-06',
    '2099-07-06T16:30:00+08:00',
    '2099-07-06T18:15:00+08:00',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '64000000-0000-0000-0000-000000000002',
    '62000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-12',
    '2099-07-12T08:00:00+08:00',
    '2099-07-12T09:30:00+08:00',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '64000000-0000-0000-0000-000000000003',
    '62000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-13',
    '2099-07-13T08:00:00+08:00',
    '2099-07-13T09:00:00+08:00',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '64000000-0000-0000-0000-000000000004',
    '62000000-0000-0000-0000-000000000001',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-16',
    '2099-07-16T08:00:00+08:00',
    '2099-07-16T09:00:00+08:00',
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  ),
  (
    '64000000-0000-0000-0000-000000000005',
    '62000000-0000-0000-0000-000000000002',
    '61000000-0000-0000-0000-000000000001',
    '2099-07-07',
    '2099-07-07T08:00:00+08:00',
    null,
    '60000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000001'
  );

insert into public.break_intervals (
  id,
  attendance_session_id,
  started_at,
  ended_at,
  created_by,
  updated_by
)
values (
  '65000000-0000-0000-0000-000000000001',
  '64000000-0000-0000-0000-000000000001',
  '2099-07-06T17:15:00+08:00',
  '2099-07-06T17:30:00+08:00',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001'
);

insert into public.leave_types (
  id,
  name,
  created_by,
  updated_by
)
values (
  '66000000-0000-0000-0000-000000000001',
  'Phase 6 Test Leave',
  '60000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001'
);

insert into public.leave_requests (
  id,
  worker_id,
  project_id,
  leave_type_id,
  starts_on,
  ends_on,
  status,
  submitted_by,
  decided_by,
  decided_at
)
values (
  '67000000-0000-0000-0000-000000000001',
  '62000000-0000-0000-0000-000000000001',
  '61000000-0000-0000-0000-000000000001',
  '66000000-0000-0000-0000-000000000001',
  '2099-07-20',
  '2099-07-20',
  'APPROVED',
  '60000000-0000-0000-0000-000000000002',
  '60000000-0000-0000-0000-000000000001',
  now()
);

set local session_replication_role = origin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase6_ceo","role":"authenticated"}',
  true
);

create temporary table phase6_values (
  run_id uuid,
  worker_a_line_id uuid,
  worker_b_line_id uuid,
  revision_id uuid
);
insert into phase6_values default values;

update phase6_values
set run_id = public.generate_payroll('2099-07-01');

do $$
declare
  worker_line public.payroll_workers%rowtype;
begin
  select * into worker_line
  from public.payroll_workers
  where payroll_run_id = (select run_id from phase6_values)
    and worker_id = '62000000-0000-0000-0000-000000000001';

  if worker_line.normal_minutes <> 90
    or worker_line.overtime_minutes <> 60
    or worker_line.sunday_minutes <> 90
    or worker_line.public_holiday_minutes <> 60 then
    raise exception 'Minute categories are incorrect: %', row_to_json(worker_line);
  end if;
  if worker_line.gross_earnings_sen <> 11400
    or worker_line.food_deduction_sen <> 5000
    or worker_line.net_pay_sen <> 6400 then
    raise exception 'Rate-period or food-deduction calculation is incorrect: %',
      row_to_json(worker_line);
  end if;
  if not exists (
    select 1 from public.payroll_source_days
    where payroll_worker_id = worker_line.id
      and work_date = '2099-07-20'
      and approved_leave
      and normal_minutes + overtime_minutes + sunday_minutes
        + public_holiday_minutes = 0
  ) then
    raise exception 'Approved leave must appear with zero payable minutes';
  end if;
  if not exists (
    select 1 from public.payroll_exceptions
    join public.payroll_workers
      on payroll_workers.id = payroll_exceptions.payroll_worker_id
    where payroll_workers.payroll_run_id =
        (select run_id from phase6_values)
      and payroll_workers.worker_id =
        '62000000-0000-0000-0000-000000000002'
      and payroll_exceptions.exception_type = 'INCOMPLETE_ATTENDANCE'
  ) then
    raise exception 'Incomplete attendance must block payroll approval';
  end if;
end
$$;

do $$
begin
  begin
    perform public.approve_payroll((select run_id from phase6_values));
    raise exception 'Payroll approved with an incomplete session';
  exception
    when raise_exception then
      if sqlerrm = 'Payroll approved with an incomplete session' then
        raise;
      end if;
  end;
end
$$;

select public.add_payroll_adjustment(
  (select run_id from phase6_values),
  '62000000-0000-0000-0000-000000000001',
  'ADDITION',
  500,
  'Phase 6 test allowance'
);
select public.add_payroll_adjustment(
  (select run_id from phase6_values),
  '62000000-0000-0000-0000-000000000001',
  'DEDUCTION',
  200,
  'Phase 6 test deduction'
);

reset role;
update public.attendance_sessions
set
  exited_at = '2099-07-07T09:00:00+08:00',
  updated_by = '60000000-0000-0000-0000-000000000001'
where id = '64000000-0000-0000-0000-000000000005';
set local role authenticated;

do $$
begin
  if (
    select blocking_exception_count
    from public.payroll_runs
    where id = (select run_id from phase6_values)
  ) <> 0 then
    raise exception 'Draft correction did not clear the payroll exception: %',
      (
        select jsonb_agg(
          jsonb_build_object(
            'exception', to_jsonb(payroll_exceptions),
            'worker', to_jsonb(payroll_workers)
          )
        )
        from public.payroll_exceptions
        join public.payroll_workers
          on payroll_workers.id = payroll_exceptions.payroll_worker_id
        where payroll_workers.payroll_run_id =
          (select run_id from phase6_values)
      );
  end if;
  if (
    select net_pay_sen
    from public.payroll_workers
    where payroll_run_id = (select run_id from phase6_values)
      and worker_id = '62000000-0000-0000-0000-000000000001'
  ) <> 6700 then
    raise exception 'Manual adjustments were not applied exactly once';
  end if;
end
$$;

update phase6_values
set revision_id = public.approve_payroll(run_id);

update phase6_values
set
  worker_a_line_id = (
    select id from public.payroll_workers
    where payroll_run_id = phase6_values.run_id
      and worker_id = '62000000-0000-0000-0000-000000000001'
  ),
  worker_b_line_id = (
    select id from public.payroll_workers
    where payroll_run_id = phase6_values.run_id
      and worker_id = '62000000-0000-0000-0000-000000000002'
  );

do $$
begin
  if (
    select count(*) from public.payroll_statements
    where approval_revision_id = (select revision_id from phase6_values)
  ) <> 2 then
    raise exception 'Approval must generate one statement per worker';
  end if;
  if not exists (
    select 1 from public.payroll_approval_revisions
    where id = (select revision_id from phase6_values)
      and snapshot -> 'workers' is not null
  ) then
    raise exception 'Approval snapshot is missing';
  end if;
end
$$;

select public.record_payroll_payment(
  (select worker_a_line_id from phase6_values),
  '2099-08-01',
  'BANK_TRANSFER',
  'PHASE6-TRANSFER',
  'Paid in full'
);

do $$
begin
  begin
    perform public.record_payroll_payment(
      (select worker_a_line_id from phase6_values),
      '2099-08-01',
      'CASH',
      '',
      ''
    );
    raise exception 'Duplicate payroll payment was accepted';
  exception
    when raise_exception then
      if sqlerrm = 'Duplicate payroll payment was accepted' then
        raise;
      end if;
  end;
end
$$;

reset role;
update public.attendance_sessions
set
  exited_at = '2099-07-16T10:00:00+08:00',
  updated_by = '60000000-0000-0000-0000-000000000001'
where id = '64000000-0000-0000-0000-000000000004';
set local role authenticated;

do $$
begin
  if (
    select net_pay_sen from public.payroll_workers
    where id = (select worker_a_line_id from phase6_values)
  ) <> 6700 then
    raise exception 'Paid payroll history was rewritten';
  end if;
  if not exists (
    select 1 from public.payroll_adjustments
    where source_payroll_worker_id =
        (select worker_a_line_id from phase6_values)
      and source = 'CORRECTION'
      and kind = 'ADDITION'
      and amount_sen = 1800
      and payroll_month = '2099-08-01'
  ) then
    raise exception 'Paid correction did not create the next-payroll adjustment';
  end if;
end
$$;

reset role;
update public.attendance_sessions
set
  exited_at = '2099-07-07T10:00:00+08:00',
  updated_by = '60000000-0000-0000-0000-000000000001'
where id = '64000000-0000-0000-0000-000000000005';
set local role authenticated;

do $$
begin
  if (
    select status from public.payroll_runs
    where id = (select run_id from phase6_values)
  ) <> 'NEEDS_REVIEW' then
    raise exception 'Approved unpaid correction must return payroll to review';
  end if;
  if (
    select net_pay_sen from public.payroll_workers
    where id = (select worker_b_line_id from phase6_values)
  ) <> 2000 then
    raise exception 'Approved unpaid worker was not recalculated';
  end if;
end
$$;

select public.approve_payroll((select run_id from phase6_values));

select set_config(
  'request.jwt.claims',
  '{"sub":"user_phase6_foreman","role":"authenticated"}',
  true
);

do $$
begin
  if (select count(*) from public.payroll_runs) <> 0 then
    raise exception 'Foremen must not read payroll';
  end if;
  begin
    perform public.generate_payroll('2099-08-01');
    raise exception 'Foreman generated payroll';
  exception
    when raise_exception then
      if sqlerrm = 'Foreman generated payroll' then
        raise;
      end if;
  end;
end
$$;

rollback;

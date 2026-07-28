create or replace function public.approve_payroll(p_payroll_run_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  run_row public.payroll_runs%rowtype;
  approval_revision integer;
  approval_revision_id uuid;
  actor_id uuid;
begin
  if not private.is_current_ceo() then
    raise exception 'Only the CEO can approve payroll';
  end if;
  actor_id := private.current_application_user_id();

  select * into run_row
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;
  if run_row.id is null then
    raise exception 'Payroll run does not exist';
  end if;
  if run_row.status = 'APPROVED' then
    raise exception 'Payroll is already approved';
  end if;

  perform private.refresh_payroll_run(run_row.id);
  select * into run_row
  from public.payroll_runs
  where id = p_payroll_run_id
  for update;

  if run_row.worker_count = 0 then
    raise exception 'Payroll has no workers to approve';
  end if;
  if run_row.blocking_exception_count > 0 then
    raise exception 'Resolve all blocking payroll exceptions before approval';
  end if;
  if exists (
    select 1 from public.payroll_workers
    where payroll_run_id = run_row.id and net_pay_sen < 0
  ) then
    raise exception 'Negative worker net pay blocks approval';
  end if;

  select coalesce(max(revision), 0) + 1
  into approval_revision
  from public.payroll_approval_revisions
  where payroll_run_id = run_row.id;

  insert into public.payroll_approval_revisions (
    payroll_run_id,
    revision,
    snapshot,
    approved_by
  )
  values (
    run_row.id,
    approval_revision,
    jsonb_build_object(
      'run', to_jsonb(run_row),
      'workers', (
        select jsonb_agg(
          private.payroll_worker_snapshot(payroll_workers.id)
          order by payroll_workers.worker_name
        )
        from public.payroll_workers
        where payroll_workers.payroll_run_id = run_row.id
      )
    ),
    actor_id
  )
  returning id into approval_revision_id;

  update public.payroll_runs
  set
    status = 'APPROVED',
    approved_by = actor_id,
    approved_at = now(),
    updated_at = now()
  where id = run_row.id;

  insert into public.payroll_statements (
    payroll_worker_id,
    approval_revision_id,
    statement_number,
    snapshot,
    generated_by
  )
  select
    payroll_workers.id,
    approval_revision_id,
    format(
      'WOP-%s-R%s-%s',
      to_char(run_row.payroll_month, 'YYYYMM'),
      approval_revision,
      upper(replace(payroll_workers.worker_id::text, '-', ''))
    ),
    private.payroll_worker_snapshot(payroll_workers.id),
    actor_id
  from public.payroll_workers
  where payroll_workers.payroll_run_id = run_row.id
    and not exists (
      select 1 from public.payroll_payments
      where payroll_payments.payroll_worker_id = payroll_workers.id
    );

  return approval_revision_id;
end;
$$;

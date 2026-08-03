import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const workerName = "E2E Phase 6 Payroll Worker";
const payrollMonth = "2098-06-01";

function runSql(sql: string) {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);
  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 6 E2E setup requires the linked database and SUPABASE_DB_PASSWORD.",
    );
  }
  const result = spawnSync(
    "psql",
    [databaseUrl, "--set", "ON_ERROR_STOP=1", "--command", sql],
    {
      env: {
        ...process.env,
        PGPASSWORD: process.env.SUPABASE_DB_PASSWORD,
      },
      stdio: "pipe",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `Phase 6 E2E database command failed: ${result.stderr.toString().trim()}`,
    );
  }
}

const cleanupSql = `
begin;
set local session_replication_role = replica;

create temporary table phase6_e2e_runs on commit drop as
select id from public.payroll_runs where payroll_month = '${payrollMonth}';
create temporary table phase6_e2e_workers on commit drop as
select id from public.workers where legal_name = '${workerName}';
create temporary table phase6_e2e_lines on commit drop as
select id from public.payroll_workers
where payroll_run_id in (select id from phase6_e2e_runs)
   or worker_id in (select id from phase6_e2e_workers);
create temporary table phase6_e2e_revisions on commit drop as
select id from public.payroll_approval_revisions
where payroll_run_id in (select id from phase6_e2e_runs);
create temporary table phase6_e2e_statements on commit drop as
select id from public.payroll_statements
where payroll_worker_id in (select id from phase6_e2e_lines);
create temporary table phase6_e2e_payments on commit drop as
select id from public.payroll_payments
where payroll_worker_id in (select id from phase6_e2e_lines);
create temporary table phase6_e2e_adjustments on commit drop as
select id from public.payroll_adjustments
where worker_id in (select id from phase6_e2e_workers)
   or payroll_month = '${payrollMonth}';

delete from public.audit_entries
where module = 'payroll'
  and entity_id in (
    select id::text from phase6_e2e_runs
    union select id::text from phase6_e2e_lines
    union select id::text from phase6_e2e_statements
    union select id::text from phase6_e2e_payments
    union select id::text from phase6_e2e_adjustments
  );
delete from public.payroll_payments
where id in (select id from phase6_e2e_payments);
delete from public.payroll_statements
where id in (select id from phase6_e2e_statements);
delete from public.payroll_adjustments
where id in (select id from phase6_e2e_adjustments);
delete from public.payroll_exceptions
where payroll_worker_id in (select id from phase6_e2e_lines);
delete from public.payroll_source_days
where payroll_worker_id in (select id from phase6_e2e_lines);
delete from public.payroll_earning_buckets
where payroll_worker_id in (select id from phase6_e2e_lines);
delete from public.payroll_approval_revisions
where id in (select id from phase6_e2e_revisions);
delete from public.payroll_workers
where id in (select id from phase6_e2e_lines);
delete from public.payroll_runs
where id in (select id from phase6_e2e_runs);

delete from public.break_intervals
where attendance_session_id in (
  select id from public.attendance_sessions
  where worker_id in (select id from phase6_e2e_workers)
);
delete from public.attendance_sessions
where worker_id in (select id from phase6_e2e_workers);
delete from public.worker_project_assignments
where worker_id in (select id from phase6_e2e_workers);
delete from public.worker_rate_periods
where worker_id in (select id from phase6_e2e_workers);
delete from public.worker_food_deduction_periods
where worker_id in (select id from phase6_e2e_workers);
delete from public.worker_classification_periods
where worker_id in (select id from phase6_e2e_workers);
delete from public.worker_employment_periods
where worker_id in (select id from phase6_e2e_workers);
delete from public.workers
where id in (select id from phase6_e2e_workers);
commit;
`;

const setupSql = `
begin;
set local session_replication_role = replica;
do $$
declare
  ceo_id uuid;
  project_id uuid;
  worker_id uuid := gen_random_uuid();
begin
  select id into ceo_id
  from public.application_users
  where role = 'CEO' and is_active
  order by created_at
  limit 1;

  select id into project_id
  from public.projects
  where status in ('PLANNED', 'ACTIVE')
  order by name
  limit 1;

  if ceo_id is null or project_id is null then
    raise exception 'Phase 6 E2E requires an active CEO and project';
  end if;

  insert into public.workers (
    id,
    legal_name,
    phone_number,
    created_by,
    updated_by
  )
  values (
    worker_id,
    '${workerName}',
    '+60123456789',
    ceo_id,
    ceo_id
  );

  insert into public.worker_documents (worker_id, file_kind, document_type_id, document_number)
  select worker_id, 'DOCUMENT', id, 'E2E-PHASE-6'
  from public.document_types where system_code = 'PASSPORT';

  insert into public.worker_employment_periods (
    worker_id,
    status,
    starts_on,
    created_by
  )
  values (worker_id, 'ACTIVE', '${payrollMonth}', ceo_id);

  insert into public.worker_project_assignments (
    worker_id,
    project_id,
    starts_on,
    created_by
  )
  values (worker_id, project_id, '${payrollMonth}', ceo_id);

  insert into public.worker_rate_periods (
    worker_id,
    hourly_rate_sen,
    starts_on,
    created_by
  )
  values (worker_id, 1000, '${payrollMonth}', ceo_id);

  insert into public.worker_food_deduction_periods (
    worker_id,
    monthly_amount_sen,
    starts_on,
    created_by
  )
  values (worker_id, 0, '${payrollMonth}', ceo_id);

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
  values (
    gen_random_uuid(),
    worker_id,
    project_id,
    '2098-06-02',
    '2098-06-02T08:00:00+08:00',
    '2098-06-02T10:00:00+08:00',
    ceo_id,
    ceo_id
  );
end
$$;
commit;
`;

export function setupPhaseSixE2EData() {
  runSql(cleanupSql);
  runSql(setupSql);
}

export function cleanupPhaseSixE2EData() {
  runSql(cleanupSql);
}

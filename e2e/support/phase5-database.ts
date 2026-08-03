import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const workerName = "E2E Phase 5 Worker";
const leaveTypeName = "E2E Phase 5 Leave";

function runSql(sql: string) {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);
  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 5 E2E setup requires the linked database and SUPABASE_DB_PASSWORD.",
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
      `Phase 5 E2E database command failed: ${result.stderr.toString().trim()}`,
    );
  }
}

const cleanupSql = `
begin;
set local session_replication_role = replica;
create temporary table phase5_e2e_workers on commit drop as
select id from public.workers where legal_name = '${workerName}';
create temporary table phase5_e2e_leave_types on commit drop as
select id from public.leave_types where name = '${leaveTypeName}';
create temporary table phase5_e2e_requests on commit drop as
select id from public.leave_requests
where worker_id in (select id from phase5_e2e_workers);

delete from public.audit_entries
where module = 'leave'
  and (
    entity_id in (select id::text from phase5_e2e_requests)
    or entity_id in (select id::text from phase5_e2e_leave_types)
    or before_data ->> 'worker_id' in (
      select id::text from phase5_e2e_workers
    )
    or after_data ->> 'worker_id' in (
      select id::text from phase5_e2e_workers
    )
  );
delete from public.leave_request_documents
where leave_request_id in (select id from phase5_e2e_requests);
delete from public.leave_requests
where id in (select id from phase5_e2e_requests);
delete from public.leave_types
where id in (select id from phase5_e2e_leave_types);
delete from public.worker_project_assignments
where worker_id in (select id from phase5_e2e_workers);
delete from public.worker_rate_periods
where worker_id in (select id from phase5_e2e_workers);
delete from public.worker_food_deduction_periods
where worker_id in (select id from phase5_e2e_workers);
delete from public.worker_classification_periods
where worker_id in (select id from phase5_e2e_workers);
delete from public.worker_employment_periods
where worker_id in (select id from phase5_e2e_workers);
delete from public.workers
where id in (select id from phase5_e2e_workers);
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
    raise exception 'Phase 5 E2E requires an active CEO and project';
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
  select worker_id, 'DOCUMENT', id, 'E2E-PHASE-5'
  from public.document_types where system_code = 'PASSPORT';

  insert into public.worker_employment_periods (
    worker_id,
    status,
    starts_on,
    created_by
  )
  values (
    worker_id,
    'ACTIVE',
    (now() at time zone 'Asia/Kuala_Lumpur')::date,
    ceo_id
  );

  insert into public.worker_project_assignments (
    worker_id,
    project_id,
    starts_on,
    created_by
  )
  values (
    worker_id,
    project_id,
    (now() at time zone 'Asia/Kuala_Lumpur')::date,
    ceo_id
  );

  insert into public.leave_types (
    name,
    created_by,
    updated_by
  )
  values ('${leaveTypeName}', ceo_id, ceo_id);
end
$$;
commit;
`;

export function setupPhaseFiveE2EData() {
  runSql(cleanupSql);
  runSql(setupSql);
}

export function cleanupPhaseFiveE2EData() {
  runSql(cleanupSql);
}

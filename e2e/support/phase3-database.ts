import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const cleanupSql = `
begin;
set local session_replication_role = replica;
create temporary table phase3_e2e_workers on commit drop as
select id from public.workers where legal_name like 'E2E Phase 3 Worker %';

delete from public.audit_entries
where entity_id in (select id::text from phase3_e2e_workers)
  or before_data ->> 'worker_id' in (
    select id::text from phase3_e2e_workers
  )
  or after_data ->> 'worker_id' in (
    select id::text from phase3_e2e_workers
  );

delete from public.worker_documents where worker_id in (select id from phase3_e2e_workers);
delete from public.worker_project_assignments where worker_id in (select id from phase3_e2e_workers);
delete from public.worker_rate_periods where worker_id in (select id from phase3_e2e_workers);
delete from public.worker_food_deduction_periods where worker_id in (select id from phase3_e2e_workers);
delete from public.worker_classification_periods where worker_id in (select id from phase3_e2e_workers);
delete from public.worker_employment_periods where worker_id in (select id from phase3_e2e_workers);
delete from public.workers where id in (select id from phase3_e2e_workers);

delete from public.project_status_history
where project_id in (
  select id from public.projects where name = 'E2E Phase 3 Project'
);
delete from public.projects where name = 'E2E Phase 3 Project';
delete from public.trades where name = 'E2E Phase 3 Trade';
delete from public.skill_levels where name = 'E2E Phase 3 Skill';
commit;
`;

const setupSql = `
begin;
set local session_replication_role = replica;
with ceo as (
  select id from public.application_users where role = 'CEO' and is_active limit 1
)
insert into public.trades (name, created_by, updated_by)
select 'E2E Phase 3 Trade', id, id from ceo
on conflict do nothing;

with ceo as (
  select id from public.application_users where role = 'CEO' and is_active limit 1
)
insert into public.skill_levels (name, created_by, updated_by)
select 'E2E Phase 3 Skill', id, id from ceo
on conflict do nothing;

with ceo as (
  select id from public.application_users where role = 'CEO' and is_active limit 1
)
insert into public.projects (
  name, client_name, location, start_date, status, created_by, updated_by
)
select
  'E2E Phase 3 Project',
  'E2E Client',
  'Kuala Lumpur',
  current_date,
  'ACTIVE',
  id,
  id
from ceo
where not exists (
  select 1 from public.projects where name = 'E2E Phase 3 Project'
);
commit;
`;

function runSql(sql: string) {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);

  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 3 E2E setup requires the linked database and SUPABASE_DB_PASSWORD.",
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
      `Phase 3 E2E database command failed: ${result.stderr.toString().trim()}`,
    );
  }
}

export function setupPhaseThreeE2EData() {
  runSql(cleanupSql);
  runSql(setupSql);
}

export function cleanupPhaseThreeE2EWorkers() {
  runSql(cleanupSql);
}

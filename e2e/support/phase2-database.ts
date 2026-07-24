import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const cleanupSql = `
begin;
create temporary table phase2_e2e_projects on commit drop as
select id
from public.projects
where name like 'E2E Phase 2 %';

create temporary table phase2_e2e_assignments on commit drop as
select id
from public.foreman_project_assignments
where project_id in (select id from phase2_e2e_projects);

delete from public.audit_entries
where entity_id in (
  select id::text from phase2_e2e_projects
  union all
  select id::text from phase2_e2e_assignments
);

delete from public.foreman_project_assignments
where id in (select id from phase2_e2e_assignments);

delete from public.project_status_history
where project_id in (select id from phase2_e2e_projects);

delete from public.projects
where id in (select id from phase2_e2e_projects);
commit;
`;

export function cleanupPhaseTwoE2EProjects() {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);

  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 2 E2E cleanup requires the linked database and SUPABASE_DB_PASSWORD.",
    );
  }

  const result = spawnSync(
    "psql",
    [databaseUrl, "--set", "ON_ERROR_STOP=1", "--command", cleanupSql],
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
      `Phase 2 E2E cleanup failed: ${result.stderr.toString().trim()}`,
    );
  }
}

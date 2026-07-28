import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function runSql(sql: string) {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);
  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 7 E2E cleanup requires the linked database and SUPABASE_DB_PASSWORD.",
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
      `Phase 7 E2E cleanup failed: ${result.stderr.toString().trim()}`,
    );
  }
}

export function cleanupPhaseSevenE2EData() {
  runSql(`
    begin;
    set local session_replication_role = replica;
    delete from public.audit_entries
    where action in ('exports.report', 'imports.preview')
      and (
        entity_id = 'current-workforce'
        or after_data ->> 'file_name' = 'worksite-import-template.xlsx'
      );
    delete from public.migration_batches
    where file_name = 'worksite-import-template.xlsx'
      and status = 'PREVIEWED';
    commit;
  `);
}

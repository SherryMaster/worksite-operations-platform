import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const linkedPoolerPath = "supabase/.temp/pooler-url";
const databaseUrl =
  process.env.SUPABASE_DB_URL ??
  (existsSync(linkedPoolerPath)
    ? readFileSync(linkedPoolerPath, "utf8").trim()
    : undefined);

if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
  console.error(
    "Database tests require SUPABASE_DB_URL or a linked Supabase project, plus SUPABASE_DB_PASSWORD.",
  );
  process.exit(1);
}

const testFiles = readdirSync("supabase/tests")
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const testFile of testFiles) {
  const result = spawnSync(
    "psql",
    [
      databaseUrl,
      "--set",
      "ON_ERROR_STOP=1",
      "--file",
      `supabase/tests/${testFile}`,
    ],
    {
      env: {
        ...process.env,
        PGPASSWORD: process.env.SUPABASE_DB_PASSWORD,
      },
      stdio: "inherit",
    },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

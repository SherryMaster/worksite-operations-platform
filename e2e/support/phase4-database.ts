import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function cleanupSql(workerName: string) {
  return `
begin;
set local session_replication_role = replica;
create temporary table phase4_e2e_workers on commit drop as
select id from public.workers where legal_name = '${workerName}';

delete from public.audit_entries
where entity_id in (
    select id::text from public.attendance_sessions
    where worker_id in (select id from phase4_e2e_workers)
  )
  or entity_id in (
    select break_intervals.id::text
    from public.break_intervals
    join public.attendance_sessions
      on attendance_sessions.id = break_intervals.attendance_session_id
    where attendance_sessions.worker_id in (
      select id from phase4_e2e_workers
    )
  )
  or before_data ->> 'worker_id' in (
    select id::text from phase4_e2e_workers
  )
  or after_data ->> 'worker_id' in (
    select id::text from phase4_e2e_workers
  );

delete from public.attendance_sync_actions
where request_data ->> 'workerId' in (
  select id::text from phase4_e2e_workers
)
or request_data ->> 'sessionId' in (
  select id::text
  from public.attendance_sessions
  where worker_id in (select id from phase4_e2e_workers)
);

delete from public.break_intervals
where attendance_session_id in (
  select id from public.attendance_sessions
  where worker_id in (select id from phase4_e2e_workers)
);
delete from public.attendance_sessions
where worker_id in (select id from phase4_e2e_workers);
delete from public.worker_project_assignments
where worker_id in (select id from phase4_e2e_workers);
delete from public.worker_rate_periods
where worker_id in (select id from phase4_e2e_workers);
delete from public.worker_food_deduction_periods
where worker_id in (select id from phase4_e2e_workers);
delete from public.worker_classification_periods
where worker_id in (select id from phase4_e2e_workers);
delete from public.worker_employment_periods
where worker_id in (select id from phase4_e2e_workers);
delete from public.workers
where id in (select id from phase4_e2e_workers);
commit;
`;
}

function setupSql(target: "CEO" | "FOREMAN", workerName: string) {
  const projectLookup =
    target === "FOREMAN"
      ? `
  select foreman_project_assignments.project_id into project_id
  from public.foreman_project_assignments
  join public.application_users
    on application_users.id =
      foreman_project_assignments.foreman_user_id
  join public.projects
    on projects.id = foreman_project_assignments.project_id
  where application_users.role = 'FOREMAN'
    and application_users.is_active
    and foreman_project_assignments.starts_on <=
      (now() at time zone 'Asia/Kuala_Lumpur')::date
    and (
      foreman_project_assignments.ends_on is null
      or foreman_project_assignments.ends_on >
        (now() at time zone 'Asia/Kuala_Lumpur')::date
    )
    and projects.status in ('PLANNED', 'ACTIVE')
  order by application_users.created_at
  limit 1;`
      : `
  select projects.id into project_id
  from public.projects
  where projects.status in ('PLANNED', 'ACTIVE')
  order by projects.name
  limit 1;`;

  return `
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

  ${projectLookup}

  if ceo_id is null or project_id is null then
    raise exception
      'Phase 4 E2E requires an active CEO and an assigned active Foreman';
  end if;

  insert into public.workers (
    id,
    legal_name,
    phone_number,
    passport_number,
    created_by,
    updated_by
  )
  values (
    worker_id,
    '${workerName}',
    '+60123456789',
    'E2E-PHASE-4',
    ceo_id,
    ceo_id
  );

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
end
$$;

commit;
`;
}

function runSql(sql: string) {
  const linkedPoolerPath = "supabase/.temp/pooler-url";
  const databaseUrl =
    process.env.SUPABASE_DB_URL ??
    (existsSync(linkedPoolerPath)
      ? readFileSync(linkedPoolerPath, "utf8").trim()
      : undefined);

  if (!databaseUrl || !process.env.SUPABASE_DB_PASSWORD) {
    throw new Error(
      "Phase 4 E2E setup requires the linked database and SUPABASE_DB_PASSWORD.",
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
      `Phase 4 E2E database command failed: ${result.stderr.toString().trim()}`,
    );
  }
}

export function setupPhaseFourE2EData(target: "CEO" | "FOREMAN") {
  const workerName =
    target === "CEO" ? "E2E Phase 4 CEO Worker" : "E2E Phase 4 Worker";
  runSql(cleanupSql(workerName));
  runSql(setupSql(target, workerName));
}

export function cleanupPhaseFourE2EData(target: "CEO" | "FOREMAN") {
  const workerName =
    target === "CEO" ? "E2E Phase 4 CEO Worker" : "E2E Phase 4 Worker";
  runSql(cleanupSql(workerName));
}

import "server-only";

import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database";

type PayrollRun = Tables<"payroll_runs">;
type PayrollWorker = Tables<"payroll_workers">;
type PayrollBucket = Tables<"payroll_earning_buckets">;
type PayrollSourceDay = Tables<"payroll_source_days">;
type PayrollException = Tables<"payroll_exceptions">;
type PayrollAdjustment = Tables<"payroll_adjustments">;
type PayrollPayment = Tables<"payroll_payments">;
type PayrollStatement = Tables<"payroll_statements">;

export type PayrollWorkerView = PayrollWorker & {
  adjustments: PayrollAdjustment[];
  buckets: Array<PayrollBucket & { projectName: string }>;
  exceptions: PayrollException[];
  payment: PayrollPayment | null;
  photoId: string | null;
  primaryProjectName: string | null;
  sourceDays: Array<PayrollSourceDay & { projectName: string }>;
  statement: PayrollStatement | null;
};

export type PayrollRunView = {
  projectSummaries: Array<{
    grossEarningsSen: number;
    name: string;
    netPaySen: number;
    projectId: string;
    workerCount: number;
  }>;
  projects: Array<{ id: string; name: string }>;
  run: PayrollRun;
  workers: PayrollWorkerView[];
};

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  throwDependencyError(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "read",
    routeFamily: "/ceo/payroll",
    surface: "server_component",
  });
}

export async function listPayrollRuns() {
  const supabase = await createServerSupabaseClient();
  const [runs, workers] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("*")
      .order("payroll_month", { ascending: false }),
    supabase.from("payroll_workers").select("payroll_run_id,payment_status"),
  ]);
  if (runs.error) throwQueryError("payroll_runs", runs.error);
  if (workers.error) throwQueryError("payroll_run_workers", workers.error);

  return (runs.data ?? []).map((run) => {
    const runWorkers = (workers.data ?? []).filter(
      (worker) => worker.payroll_run_id === run.id,
    );
    return {
      ...run,
      paidWorkerCount: runWorkers.filter(
        (worker) => worker.payment_status === "PAID",
      ).length,
      unpaidWorkerCount: runWorkers.filter(
        (worker) => worker.payment_status === "UNPAID",
      ).length,
    };
  });
}

export async function getPayrollRun(
  payrollRunId: string,
): Promise<PayrollRunView | null> {
  const supabase = await createServerSupabaseClient();
  const [runResult, workerResult, projectResult] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", payrollRunId)
      .maybeSingle(),
    supabase
      .from("payroll_workers")
      .select("*")
      .eq("payroll_run_id", payrollRunId)
      .order("worker_name"),
    supabase.from("projects").select("id,name").order("name"),
  ]);

  for (const [operation, result] of [
    ["payroll_run", runResult],
    ["payroll_workers", workerResult],
    ["payroll_projects", projectResult],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }
  if (!runResult.data) return null;

  const workerLines = workerResult.data ?? [];
  const projects = projectResult.data ?? [];
  const workerLineIds = workerLines.map((worker) => worker.id);
  const workerIds = [...new Set(workerLines.map((worker) => worker.worker_id))];
  const photoRows =
    workerIds.length === 0
      ? []
      : await (async () => {
          const result = await supabase
            .from("worker_documents")
            .select("id,worker_id")
            .in("worker_id", workerIds)
            .eq("file_kind", "PHOTO")
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false });
          if (result.error) {
            throwQueryError("payroll_worker_photos", result.error);
          }
          return result.data;
        })();
  const photoIds = new Map<string, string>();
  for (const photo of photoRows) {
    if (!photoIds.has(photo.worker_id)) {
      photoIds.set(photo.worker_id, photo.id);
    }
  }
  const [
    bucketResult,
    sourceDayResult,
    exceptionResult,
    adjustmentResult,
    paymentResult,
    statementResult,
  ] =
    workerLineIds.length === 0
      ? [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ]
      : await Promise.all([
          supabase
            .from("payroll_earning_buckets")
            .select("*")
            .in("payroll_worker_id", workerLineIds)
            .order("category"),
          supabase
            .from("payroll_source_days")
            .select("*")
            .in("payroll_worker_id", workerLineIds)
            .order("work_date"),
          supabase
            .from("payroll_exceptions")
            .select("*")
            .in("payroll_worker_id", workerLineIds)
            .order("work_date"),
          supabase
            .from("payroll_adjustments")
            .select("*")
            .in("target_payroll_worker_id", workerLineIds)
            .order("created_at"),
          supabase
            .from("payroll_payments")
            .select("*")
            .in("payroll_worker_id", workerLineIds),
          supabase
            .from("payroll_statements")
            .select("*")
            .in("payroll_worker_id", workerLineIds)
            .order("generated_at", { ascending: false }),
        ]);

  for (const [operation, result] of [
    ["payroll_buckets", bucketResult],
    ["payroll_source_days", sourceDayResult],
    ["payroll_exceptions", exceptionResult],
    ["payroll_adjustments", adjustmentResult],
    ["payroll_payments", paymentResult],
    ["payroll_statements", statementResult],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const buckets = bucketResult.data ?? [];
  const sourceDays = sourceDayResult.data ?? [];
  const exceptions = exceptionResult.data ?? [];
  const adjustments = adjustmentResult.data ?? [];
  const payments = paymentResult.data ?? [];
  const statements = statementResult.data ?? [];

  const workers = workerLines.map((worker): PayrollWorkerView => ({
    ...worker,
    adjustments: adjustments.filter(
      (adjustment) => adjustment.target_payroll_worker_id === worker.id,
    ),
    buckets: buckets
      .filter((bucket) => bucket.payroll_worker_id === worker.id)
      .map((bucket) => ({
        ...bucket,
        projectName:
          projectNames.get(bucket.project_id) ?? "Unavailable project",
      })),
    exceptions: exceptions.filter(
      (exception) => exception.payroll_worker_id === worker.id,
    ),
    payment:
      payments.find((payment) => payment.payroll_worker_id === worker.id) ??
      null,
    photoId: photoIds.get(worker.worker_id) ?? null,
    primaryProjectName: worker.primary_project_id
      ? (projectNames.get(worker.primary_project_id) ?? "Unavailable project")
      : null,
    sourceDays: sourceDays
      .filter((sourceDay) => sourceDay.payroll_worker_id === worker.id)
      .map((sourceDay) => ({
        ...sourceDay,
        projectName:
          projectNames.get(sourceDay.project_id) ?? "Unavailable project",
      })),
    statement:
      statements.find(
        (statement) => statement.payroll_worker_id === worker.id,
      ) ?? null,
  }));

  const projectSummaries = projects
    .map((project) => {
      const projectWorkers = workers.filter(
        (worker) => worker.primary_project_id === project.id,
      );
      const projectBuckets = buckets.filter(
        (bucket) => bucket.project_id === project.id,
      );
      return {
        grossEarningsSen: projectBuckets.reduce(
          (total, bucket) => total + bucket.amount_sen,
          0,
        ),
        name: project.name,
        netPaySen: projectWorkers.reduce(
          (total, worker) => total + worker.net_pay_sen,
          0,
        ),
        projectId: project.id,
        workerCount: projectWorkers.length,
      };
    })
    .filter(
      (project) => project.workerCount > 0 || project.grossEarningsSen > 0,
    );

  return {
    projectSummaries,
    projects,
    run: runResult.data,
    workers,
  };
}

export async function getPayrollRunIdentity(payrollRunId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", payrollRunId)
    .maybeSingle();
  if (result.error) throwQueryError("payroll_run_identity", result.error);
  return result.data;
}

export async function getPayrollRunSummary(
  payrollRunId: string,
  runIdentity?: PayrollRun | null,
) {
  const supabase = await createServerSupabaseClient();
  const [runResult, workerResult] = await Promise.all([
    runIdentity === undefined
      ? supabase
          .from("payroll_runs")
          .select("*")
          .eq("id", payrollRunId)
          .maybeSingle()
      : Promise.resolve({ data: runIdentity, error: null }),
    supabase
      .from("payroll_workers")
      .select(
        "normal_minutes,overtime_minutes,sunday_minutes,public_holiday_minutes,payment_status",
      )
      .eq("payroll_run_id", payrollRunId),
  ]);
  if (runResult.error) throwQueryError("payroll_run_summary", runResult.error);
  if (workerResult.error) {
    throwQueryError("payroll_run_summary_workers", workerResult.error);
  }
  if (!runResult.data) return null;
  const workers = workerResult.data ?? [];
  const paidWorkerCount = workers.filter(
    (worker) => worker.payment_status === "PAID",
  ).length;
  return {
    paidWorkerCount,
    run: runResult.data,
    totalMinutes: workers.reduce(
      (total, worker) =>
        total +
        worker.normal_minutes +
        worker.overtime_minutes +
        worker.sunday_minutes +
        worker.public_holiday_minutes,
      0,
    ),
    unpaidWorkerCount: workers.length - paidWorkerCount,
  };
}

export async function getPayrollRunBlockers(payrollRunId: string) {
  const supabase = await createServerSupabaseClient();
  const workers = await supabase
    .from("payroll_workers")
    .select("id,worker_name")
    .eq("payroll_run_id", payrollRunId);
  if (workers.error) throwQueryError("payroll_blocker_workers", workers.error);
  const workerRows = workers.data ?? [];
  if (workerRows.length === 0) return [];
  const exceptions = await supabase
    .from("payroll_exceptions")
    .select("*")
    .in(
      "payroll_worker_id",
      workerRows.map((worker) => worker.id),
    )
    .order("work_date");
  if (exceptions.error)
    throwQueryError("payroll_run_blockers", exceptions.error);
  const workersById = new Map(workerRows.map((worker) => [worker.id, worker]));
  return (exceptions.data ?? []).flatMap((exception) => {
    const worker = workersById.get(exception.payroll_worker_id);
    return worker ? [{ exception, worker }] : [];
  });
}

export async function getPayrollRunProjectSummaries(payrollRunId: string) {
  const supabase = await createServerSupabaseClient();
  const [workers, projects] = await Promise.all([
    supabase
      .from("payroll_workers")
      .select("id,primary_project_id,net_pay_sen")
      .eq("payroll_run_id", payrollRunId),
    supabase.from("projects").select("id,name").order("name"),
  ]);
  if (workers.error) throwQueryError("payroll_project_workers", workers.error);
  if (projects.error) throwQueryError("payroll_project_names", projects.error);
  const workerRows = workers.data ?? [];
  const workerIds = workerRows.map((worker) => worker.id);
  const buckets = workerIds.length
    ? await supabase
        .from("payroll_earning_buckets")
        .select("project_id,amount_sen,payroll_worker_id")
        .in("payroll_worker_id", workerIds)
    : { data: [], error: null };
  if (buckets.error) throwQueryError("payroll_project_buckets", buckets.error);
  const bucketRows = buckets.data ?? [];
  return (projects.data ?? [])
    .map((project) => {
      const projectWorkers = workerRows.filter(
        (worker) => worker.primary_project_id === project.id,
      );
      return {
        grossEarningsSen: bucketRows
          .filter((bucket) => bucket.project_id === project.id)
          .reduce((total, bucket) => total + bucket.amount_sen, 0),
        name: project.name,
        netPaySen: projectWorkers.reduce(
          (total, worker) => total + worker.net_pay_sen,
          0,
        ),
        projectId: project.id,
        workerCount: projectWorkers.length,
      };
    })
    .filter(
      (project) => project.workerCount > 0 || project.grossEarningsSen > 0,
    );
}

export async function getPayrollRunWorkersPage({
  page,
  pageSize,
  payrollRunId,
}: {
  page: number;
  pageSize: number;
  payrollRunId: string;
}): Promise<{
  items: PayrollWorkerView[];
  page: number;
  pageCount: number;
  total: number;
}> {
  const supabase = await createServerSupabaseClient();
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));
  const from = (safePage - 1) * safePageSize;
  const result = await supabase
    .from("payroll_workers")
    .select("*", { count: "exact" })
    .eq("payroll_run_id", payrollRunId)
    .order("worker_name")
    .range(from, from + safePageSize - 1);
  if (result.error) throwQueryError("payroll_run_worker_page", result.error);
  const total = result.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  if (safePage > pageCount) {
    return getPayrollRunWorkersPage({
      page: pageCount,
      pageSize: safePageSize,
      payrollRunId,
    });
  }
  const rows = result.data ?? [];
  const lineIds = rows.map((worker) => worker.id);
  const workerIds = [...new Set(rows.map((worker) => worker.worker_id))];
  const projectIds = [
    ...new Set(
      rows
        .map((worker) => worker.primary_project_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const [projects, exceptions, photos] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id,name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    lineIds.length
      ? supabase
          .from("payroll_exceptions")
          .select("*")
          .in("payroll_worker_id", lineIds)
      : Promise.resolve({ data: [], error: null }),
    workerIds.length
      ? supabase
          .from("worker_documents")
          .select("id,worker_id,created_at")
          .in("worker_id", workerIds)
          .eq("file_kind", "PHOTO")
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (projects.error)
    throwQueryError("payroll_worker_page_projects", projects.error);
  if (exceptions.error)
    throwQueryError("payroll_worker_page_exceptions", exceptions.error);
  if (photos.error) throwQueryError("payroll_worker_page_photos", photos.error);
  const projectNames = new Map(
    (projects.data ?? []).map((project) => [project.id, project.name]),
  );
  const photoIds = new Map<string, string>();
  for (const photo of photos.data ?? []) {
    if (!photoIds.has(photo.worker_id)) photoIds.set(photo.worker_id, photo.id);
  }
  const items: PayrollWorkerView[] = rows.map((worker) => ({
    ...worker,
    adjustments: [],
    buckets: [],
    exceptions: (exceptions.data ?? []).filter(
      (exception) => exception.payroll_worker_id === worker.id,
    ),
    payment: null,
    photoId: photoIds.get(worker.worker_id) ?? null,
    primaryProjectName: worker.primary_project_id
      ? (projectNames.get(worker.primary_project_id) ?? "Unavailable project")
      : null,
    sourceDays: [],
    statement: null,
  }));
  return { items, page: safePage, pageCount, total };
}

export async function getPayrollWorker(
  payrollWorkerId: string,
  lineIdentity?: PayrollWorker | null,
): Promise<{
  run: PayrollRun;
  worker: PayrollWorkerView;
} | null> {
  const supabase = await createServerSupabaseClient();
  const line =
    lineIdentity === undefined
      ? await supabase
          .from("payroll_workers")
          .select("*")
          .eq("id", payrollWorkerId)
          .maybeSingle()
      : { data: lineIdentity, error: null };
  if (line.error) throwQueryError("payroll_worker_lookup", line.error);
  if (!line.data) return null;
  const [
    run,
    projects,
    buckets,
    sourceDays,
    exceptions,
    adjustments,
    payment,
    statement,
    photos,
  ] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", line.data.payroll_run_id)
      .single(),
    supabase.from("projects").select("id,name").order("name"),
    supabase
      .from("payroll_earning_buckets")
      .select("*")
      .eq("payroll_worker_id", payrollWorkerId)
      .order("category"),
    supabase
      .from("payroll_source_days")
      .select("*")
      .eq("payroll_worker_id", payrollWorkerId)
      .order("work_date"),
    supabase
      .from("payroll_exceptions")
      .select("*")
      .eq("payroll_worker_id", payrollWorkerId)
      .order("work_date"),
    supabase
      .from("payroll_adjustments")
      .select("*")
      .eq("target_payroll_worker_id", payrollWorkerId)
      .order("created_at"),
    supabase
      .from("payroll_payments")
      .select("*")
      .eq("payroll_worker_id", payrollWorkerId)
      .maybeSingle(),
    supabase
      .from("payroll_statements")
      .select("*")
      .eq("payroll_worker_id", payrollWorkerId)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("worker_documents")
      .select("id")
      .eq("worker_id", line.data.worker_id)
      .eq("file_kind", "PHOTO")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  for (const [operation, result] of [
    ["payroll_worker_run", run],
    ["payroll_worker_projects", projects],
    ["payroll_worker_buckets", buckets],
    ["payroll_worker_source_days", sourceDays],
    ["payroll_worker_exceptions", exceptions],
    ["payroll_worker_adjustments", adjustments],
    ["payroll_worker_payment", payment],
    ["payroll_worker_statement", statement],
    ["payroll_worker_photo", photos],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }
  const projectNames = new Map(
    (projects.data ?? []).map((project) => [project.id, project.name]),
  );
  const worker: PayrollWorkerView = {
    ...line.data,
    adjustments: adjustments.data ?? [],
    buckets: (buckets.data ?? []).map((bucket) => ({
      ...bucket,
      projectName: projectNames.get(bucket.project_id) ?? "Unavailable project",
    })),
    exceptions: exceptions.data ?? [],
    payment: payment.data,
    photoId: photos.data?.id ?? null,
    primaryProjectName: line.data.primary_project_id
      ? (projectNames.get(line.data.primary_project_id) ??
        "Unavailable project")
      : null,
    sourceDays: (sourceDays.data ?? []).map((sourceDay) => ({
      ...sourceDay,
      projectName:
        projectNames.get(sourceDay.project_id) ?? "Unavailable project",
    })),
    statement: statement.data,
  };
  return run.data ? { run: run.data, worker } : null;
}

export async function getPayrollWorkerIdentity(
  payrollWorkerId: string,
  payrollRunId?: string,
) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("payroll_workers")
    .select("*")
    .eq("id", payrollWorkerId);
  if (payrollRunId) query = query.eq("payroll_run_id", payrollRunId);
  const result = await query.maybeSingle();
  if (result.error) throwQueryError("payroll_worker_identity", result.error);
  return result.data;
}

export async function getPayrollStatementIdentity(statementId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("payroll_statements")
    .select("*")
    .eq("id", statementId)
    .maybeSingle();
  if (result.error) throwQueryError("payroll_statement_identity", result.error);
  return result.data;
}

export async function getPayrollStatement(
  statementId: string,
  statementIdentity?: PayrollStatement | null,
) {
  const supabase = await createServerSupabaseClient();
  const statement =
    statementIdentity === undefined
      ? await supabase
          .from("payroll_statements")
          .select("*")
          .eq("id", statementId)
          .maybeSingle()
      : { data: statementIdentity, error: null };
  if (statement.error) throwQueryError("payroll_statement", statement.error);
  if (!statement.data) return null;

  const worker = await supabase
    .from("payroll_workers")
    .select("payroll_run_id,worker_id")
    .eq("id", statement.data.payroll_worker_id)
    .single();
  if (worker.error) throwQueryError("payroll_statement_worker", worker.error);

  const [run, company, payment] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("*")
      .eq("id", worker.data.payroll_run_id)
      .single(),
    supabase
      .from("company_settings")
      .select("display_name,legal_name,currency_code")
      .eq("singleton", true)
      .single(),
    supabase
      .from("payroll_payments")
      .select("*")
      .eq("payroll_worker_id", statement.data.payroll_worker_id)
      .maybeSingle(),
  ]);
  if (run.error) throwQueryError("payroll_statement_run", run.error);
  if (company.error)
    throwQueryError("payroll_statement_company", company.error);
  if (payment.error)
    throwQueryError("payroll_statement_payment", payment.error);

  return {
    company: company.data,
    payment: payment.data,
    run: run.data,
    snapshot: statement.data.snapshot as Json,
    statement: statement.data,
  };
}

export async function getPayrollDashboardSummary() {
  const supabase = await createServerSupabaseClient();
  const [runs, workers] = await Promise.all([
    supabase
      .from("payroll_runs")
      .select("id,status,blocking_exception_count")
      .in("status", ["DRAFT", "NEEDS_REVIEW"]),
    supabase.from("payroll_workers").select("id,payment_status,payroll_run_id"),
  ]);
  if (runs.error) throwQueryError("payroll_dashboard_runs", runs.error);
  if (workers.error)
    throwQueryError("payroll_dashboard_workers", workers.error);

  const openRuns = runs.data ?? [];
  const payrollWorkers = workers.data ?? [];
  const openRunIds = new Set(openRuns.map((run) => run.id));
  return {
    blockingExceptions: openRuns.reduce(
      (total, run) => total + run.blocking_exception_count,
      0,
    ),
    openRuns: openRuns.length,
    unpaidWorkers: payrollWorkers.filter(
      (worker) =>
        worker.payment_status === "UNPAID" &&
        !openRunIds.has(worker.payroll_run_id),
    ).length,
  };
}

export async function getWorkerPayrollHistory(workerId: string) {
  const supabase = await createServerSupabaseClient();
  const [workers, runs, payments, statements] = await Promise.all([
    supabase
      .from("payroll_workers")
      .select("*")
      .eq("worker_id", workerId)
      .order("calculated_at", { ascending: false }),
    supabase.from("payroll_runs").select("id,payroll_month,status"),
    supabase.from("payroll_payments").select("*"),
    supabase
      .from("payroll_statements")
      .select("id,payroll_worker_id,statement_number"),
  ]);
  for (const [operation, result] of [
    ["worker_payroll_lines", workers],
    ["worker_payroll_runs", runs],
    ["worker_payroll_payments", payments],
    ["worker_payroll_statements", statements],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }
  const runById = new Map((runs.data ?? []).map((run) => [run.id, run]));
  const paymentRows = payments.data ?? [];
  const statementRows = statements.data ?? [];
  return (workers.data ?? []).map((worker) => ({
    ...worker,
    payment:
      paymentRows.find((payment) => payment.payroll_worker_id === worker.id) ??
      null,
    run: runById.get(worker.payroll_run_id) ?? null,
    statement:
      statementRows.find(
        (statement) => statement.payroll_worker_id === worker.id,
      ) ?? null,
  }));
}

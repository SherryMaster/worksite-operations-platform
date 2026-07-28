import "server-only";

import { logger } from "@/lib/server/logger";
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
  logger.error("phase_6_query_failed", { code: error?.code, operation });
  throw new Error("Payroll information could not be loaded.");
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

export async function getPayrollWorker(payrollWorkerId: string): Promise<{
  run: PayrollRun;
  worker: PayrollWorkerView;
} | null> {
  const supabase = await createServerSupabaseClient();
  const line = await supabase
    .from("payroll_workers")
    .select("payroll_run_id")
    .eq("id", payrollWorkerId)
    .maybeSingle();
  if (line.error) throwQueryError("payroll_worker_lookup", line.error);
  if (!line.data) return null;
  const run = await getPayrollRun(line.data.payroll_run_id);
  const worker = run?.workers.find((item) => item.id === payrollWorkerId);
  return run && worker ? { run: run.run, worker } : null;
}

export async function getPayrollStatement(statementId: string) {
  const supabase = await createServerSupabaseClient();
  const statement = await supabase
    .from("payroll_statements")
    .select("*")
    .eq("id", statementId)
    .maybeSingle();
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

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Coins,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import {
  approvePayrollAction,
  generatePayrollAction,
} from "@/app/ceo/payroll/actions";
import {
  ListResultsSkeleton,
  LoadingRegion,
} from "@/components/operations/loading-skeletons";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { WorkerAvatar } from "@/components/worker-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatPayrollMinutes,
  formatSen,
  payrollMonthLabel,
} from "@/lib/phase6/calculations";
import {
  getPayrollRunBlockers,
  getPayrollRunIdentity,
  getPayrollRunProjectSummaries,
  getPayrollRunSummary,
  getPayrollRunWorkersPage,
} from "@/lib/phase6/data";

const WORKER_PAGE_SIZE = 50;

export default async function PayrollRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ runId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ runId }, query] = await Promise.all([params, searchParams]);
  const runIdentity = await getPayrollRunIdentity(runId);
  if (!runIdentity) notFound();
  const requestedPage = Number(query.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const summaryPromise = getPayrollRunSummary(runId, runIdentity);
  const blockersPromise = getPayrollRunBlockers(runId);
  const projectsPromise = getPayrollRunProjectSummaries(runId);
  const workersPromise = getPayrollRunWorkersPage({
    page,
    pageSize: WORKER_PAGE_SIZE,
    payrollRunId: runId,
  });

  return (
    <main>
      <Link
        href="/ceo/payroll"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Payroll months
      </Link>

      <Suspense fallback={<RunHeaderSkeleton />}>
        <RunHeader summaryPromise={summaryPromise} />
      </Suspense>
      <Suspense fallback={<ApprovalSkeleton />}>
        <ApprovalExplanation summaryPromise={summaryPromise} />
      </Suspense>
      <Suspense fallback={<SummarySkeleton />}>
        <RunSummary summaryPromise={summaryPromise} />
      </Suspense>
      <Suspense fallback={<BlockerSkeleton />}>
        <BlockerPreview blockersPromise={blockersPromise} />
      </Suspense>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <Building2 className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold">Projects</h2>
        </div>
        <Suspense fallback={<ProjectCardsSkeleton />}>
          <ProjectSummaries projectsPromise={projectsPromise} />
        </Suspense>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
              Traceable calculations
            </p>
            <h2 className="font-heading text-xl font-semibold">Workers</h2>
          </div>
          <Suspense fallback={<Skeleton className="h-4 w-28" />}>
            <WorkerPaymentCount summaryPromise={summaryPromise} />
          </Suspense>
        </div>
        <Suspense
          key={String(page)}
          fallback={
            <ListResultsSkeleton columns={8} rows={8} className="mt-0" />
          }
        >
          <RunWorkers
            runId={runId}
            summaryPromise={summaryPromise}
            workersPromise={workersPromise}
          />
        </Suspense>
      </section>

      <section className="mt-8" id="exceptions">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle
            className="size-5 text-violet-700"
            aria-hidden="true"
          />
          <h2 className="font-heading text-xl font-semibold">Exceptions</h2>
        </div>
        <Suspense fallback={<BlockerSkeleton compact />}>
          <AllExceptions blockersPromise={blockersPromise} runId={runId} />
        </Suspense>
      </section>
    </main>
  );
}

type SummaryPromise = ReturnType<typeof getPayrollRunSummary>;
type BlockersPromise = ReturnType<typeof getPayrollRunBlockers>;

async function RunHeader({
  summaryPromise,
}: {
  summaryPromise: SummaryPromise;
}) {
  const data = await summaryPromise;
  if (!data) return null;
  const canApprove =
    data.run.status !== "APPROVED" &&
    data.run.blocking_exception_count === 0 &&
    data.run.worker_count > 0;
  return (
    <div className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          {payrollMonthLabel(data.run.payroll_month)}
        </h1>
        <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <span
            className={`inline-flex items-center gap-2 font-semibold ${data.run.status === "APPROVED" ? "text-emerald-700" : data.run.status === "NEEDS_REVIEW" ? "text-violet-700" : "text-slate-600"}`}
          >
            {data.run.status === "APPROVED" ? (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            ) : (
              <AlertTriangle className="size-4" aria-hidden="true" />
            )}
            {data.run.status === "NEEDS_REVIEW"
              ? "Needs review after a correction"
              : data.run.status.toLowerCase()}
          </span>
          <span className="text-slate-400">
            Calculation revision {data.run.calculation_revision}
          </span>
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
        {data.run.status !== "APPROVED" ? (
          <ManagedForm
            action={generatePayrollAction}
            submitLabel="Recalculate draft"
            className="border border-violet-100 bg-white p-3"
          >
            <input
              type="hidden"
              name="payrollMonth"
              value={data.run.payroll_month.slice(0, 7)}
            />
          </ManagedForm>
        ) : null}
        {canApprove ? (
          <ActionButton
            action={approvePayrollAction.bind(null, data.run.id)}
            label="Approve complete payroll"
            pendingLabel="Approving payroll…"
            variant="default"
            confirmMessage="Approve the complete company payroll? This creates immutable worker statements."
          />
        ) : null}
      </div>
    </div>
  );
}

async function ApprovalExplanation({
  summaryPromise,
}: {
  summaryPromise: SummaryPromise;
}) {
  const data = await summaryPromise;
  if (!data) return null;
  const canApprove =
    data.run.status !== "APPROVED" &&
    data.run.blocking_exception_count === 0 &&
    data.run.worker_count > 0;
  return !canApprove && data.run.status !== "APPROVED" ? (
    <p
      role="status"
      className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
    >
      Approval is unavailable until the run contains at least one worker and
      every blocking exception is resolved. Recalculate after correcting source
      attendance or rates.
    </p>
  ) : null;
}

async function RunSummary({
  summaryPromise,
}: {
  summaryPromise: SummaryPromise;
}) {
  const data = await summaryPromise;
  if (!data) return null;
  const values = [
    { icon: Users, label: "Workers", value: String(data.run.worker_count) },
    {
      icon: Clock3,
      label: "Payable time",
      value: formatPayrollMinutes(data.totalMinutes),
    },
    {
      icon: Coins,
      label: "Gross earnings",
      value: formatSen(data.run.gross_earnings_sen),
    },
    {
      icon: WalletCards,
      label: "Net payroll",
      value: formatSen(data.run.net_payroll_sen),
    },
    {
      icon: AlertTriangle,
      label: "Blocking exceptions",
      value: String(data.run.blocking_exception_count),
    },
  ];
  return (
    <section
      aria-label="Payroll summary"
      className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 xl:grid-cols-5"
    >
      {values.map(({ icon: Icon, label, value }) => (
        <article key={label} className="bg-white p-3">
          <Icon className="size-5 text-violet-700" aria-hidden="true" />
          <p className="mt-2 font-heading text-xl font-semibold">{value}</p>
          <h2 className="mt-1 text-xs font-semibold text-slate-500">{label}</h2>
        </article>
      ))}
    </section>
  );
}

async function BlockerPreview({
  blockersPromise,
}: {
  blockersPromise: BlockersPromise;
}) {
  const blockers = await blockersPromise;
  if (blockers.length === 0) return null;
  return (
    <section className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 size-5 shrink-0 text-red-700"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-lg font-semibold text-red-950">
            Resolve blockers before reviewing workers
          </h2>
          <p className="mt-1 text-sm text-red-900">
            {blockers.length} blocking{" "}
            {blockers.length === 1
              ? "exception prevents"
              : "exceptions prevent"}{" "}
            approval.
          </p>
          <ol className="mt-3 divide-y divide-red-200 border-y border-red-200">
            {blockers.slice(0, 5).map(({ exception, worker }) => (
              <li key={exception.id} className="py-2 text-sm">
                <span className="font-semibold">{worker.worker_name}</span>
                <span className="text-red-900"> · {exception.message}</span>
              </li>
            ))}
          </ol>
          <a
            href="#exceptions"
            className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-900"
          >
            Review all blockers
          </a>
        </div>
      </div>
    </section>
  );
}

async function ProjectSummaries({
  projectsPromise,
}: {
  projectsPromise: ReturnType<typeof getPayrollRunProjectSummaries>;
}) {
  const projects = await projectsPromise;
  if (projects.length === 0)
    return (
      <p className="border border-violet-100 bg-white p-5 text-sm text-slate-500">
        No project earnings are present in this run.
      </p>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <article
          key={project.projectId}
          className="border border-violet-100 bg-white p-5"
        >
          <h3 className="font-heading text-base font-semibold">
            {project.name}
          </h3>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Workers</dt>
              <dd className="mt-1 font-semibold">{project.workerCount}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Gross</dt>
              <dd className="mt-1 font-semibold">
                {formatSen(project.grossEarningsSen)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Worker net</dt>
              <dd className="mt-1 font-semibold">
                {formatSen(project.netPaySen)}
              </dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

async function WorkerPaymentCount({
  summaryPromise,
}: {
  summaryPromise: SummaryPromise;
}) {
  const data = await summaryPromise;
  return data ? (
    <p className="text-sm text-slate-500">
      {data.paidWorkerCount} paid · {data.unpaidWorkerCount} unpaid
    </p>
  ) : null;
}

async function RunWorkers({
  runId,
  summaryPromise,
  workersPromise,
}: {
  runId: string;
  summaryPromise: SummaryPromise;
  workersPromise: ReturnType<typeof getPayrollRunWorkersPage>;
}) {
  const [summary, page] = await Promise.all([summaryPromise, workersPromise]);
  if (!summary) return null;
  const state = (worker: (typeof page.items)[number]) =>
    worker.exceptions.length > 0
      ? `${worker.exceptions.length} exception${worker.exceptions.length === 1 ? "" : "s"}`
      : worker.payment_status === "PAID"
        ? "Paid"
        : summary.run.status === "APPROVED"
          ? "Approved · unpaid"
          : "Ready for review";
  const minutes = (worker: (typeof page.items)[number]) =>
    worker.normal_minutes +
    worker.overtime_minutes +
    worker.sunday_minutes +
    worker.public_holiday_minutes;
  const href = (workerId: string) =>
    `/ceo/payroll/${runId}/workers/${workerId}`;
  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
        {page.items.map((worker) => (
          <Link
            key={`${worker.id}:mobile`}
            href={href(worker.id)}
            className="flex min-h-20 items-center gap-3 border-b border-slate-200 p-3 last:border-0"
          >
            <WorkerAvatar
              workerId={worker.worker_id}
              photoId={worker.photoId}
              name={worker.worker_name}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">
                    {worker.worker_name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {worker.primaryProjectName ?? "No project"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">
                  {state(worker)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatPayrollMinutes(minutes(worker))} ·{" "}
                <strong className="text-violet-800">
                  {formatSen(worker.net_pay_sen)} net
                </strong>
              </p>
            </div>
            <ChevronRight
              className="size-4 shrink-0 text-slate-400"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto border border-violet-100 bg-white md:block">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-violet-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Worker</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Payable time</th>
              <th className="px-4 py-3">Gross</th>
              <th className="px-4 py-3">Deductions</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3" aria-label="Open" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {page.items.map((worker) => (
              <tr key={worker.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <WorkerAvatar
                      workerId={worker.worker_id}
                      photoId={worker.photoId}
                      name={worker.worker_name}
                      size="xs"
                    />
                    <span className="font-semibold">{worker.worker_name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {worker.primaryProjectName ?? "No project"}
                </td>
                <td className="px-4 py-4">
                  {formatPayrollMinutes(minutes(worker))}
                </td>
                <td className="px-4 py-4">
                  {formatSen(worker.gross_earnings_sen)}
                </td>
                <td className="px-4 py-4">
                  {formatSen(worker.deductions_sen + worker.food_deduction_sen)}
                </td>
                <td className="px-4 py-4 font-semibold">
                  {formatSen(worker.net_pay_sen)}
                </td>
                <td className="px-4 py-4">{state(worker)}</td>
                <td className="px-4 py-4">
                  <Link
                    href={href(worker.id)}
                    className="inline-flex items-center gap-1 font-semibold text-amber-800"
                  >
                    Review
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {page.pageCount > 1 ? (
        <nav
          aria-label="Payroll worker pages"
          className="mt-4 flex items-center justify-between"
        >
          <p className="text-xs text-slate-500">
            Page {page.page} of {page.pageCount} · {page.total} workers
          </p>
          <div className="flex gap-2">
            {page.page > 1 ? (
              <Link
                href={`/ceo/payroll/${runId}?page=${page.page - 1}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                Previous
              </Link>
            ) : null}
            {page.page < page.pageCount ? (
              <Link
                href={`/ceo/payroll/${runId}?page=${page.page + 1}`}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  );
}

async function AllExceptions({
  blockersPromise,
  runId,
}: {
  blockersPromise: BlockersPromise;
  runId: string;
}) {
  const blockers = await blockersPromise;
  if (blockers.length === 0)
    return (
      <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-5">
        <CheckCircle2
          className="mt-0.5 size-5 text-emerald-700"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-emerald-950">
            No blocking payroll exceptions
          </p>
          <p className="mt-1 text-sm text-emerald-900">
            Review worker amounts before approving the complete run.
          </p>
        </div>
      </div>
    );
  return (
    <div className="divide-y divide-amber-200 border border-amber-200 bg-amber-50">
      {blockers.map(({ exception, worker }) => (
        <article
          key={exception.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold text-amber-950">{worker.worker_name}</p>
            <p className="mt-1 text-sm text-amber-900">{exception.message}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-violet-700">
              {exception.work_date ?? "Worker total"} ·{" "}
              {exception.exception_type.toLowerCase().replaceAll("_", " ")}
            </p>
          </div>
          {exception.project_id && exception.work_date ? (
            <Link
              href={`/ceo/attendance?view=day&project=${exception.project_id}&date=${exception.work_date}`}
              className="inline-flex min-h-11 items-center justify-center bg-amber-900 px-4 text-sm font-semibold text-white"
            >
              Review attendance
            </Link>
          ) : (
            <Link
              href={`/ceo/payroll/${runId}/workers/${worker.id}`}
              className="inline-flex min-h-11 items-center justify-center border border-amber-800 px-4 text-sm font-semibold text-amber-950"
            >
              Review worker payroll
            </Link>
          )}
        </article>
      ))}
    </div>
  );
}

function RunHeaderSkeleton() {
  return (
    <LoadingRegion
      label="Loading payroll run header"
      className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:justify-between"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-11 w-40" />
    </LoadingRegion>
  );
}

function ApprovalSkeleton() {
  return (
    <LoadingRegion label="Loading approval availability" className="mt-5">
      <Skeleton className="h-20 w-full" />
    </LoadingRegion>
  );
}

function SummarySkeleton() {
  return (
    <LoadingRegion
      label="Loading payroll summary"
      className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 xl:grid-cols-5"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="space-y-2 bg-white p-3">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </LoadingRegion>
  );
}

function BlockerSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <LoadingRegion
      label="Loading payroll exceptions"
      className={compact ? "" : "mt-5"}
    >
      <Skeleton className={compact ? "h-28 w-full" : "h-40 w-full"} />
    </LoadingRegion>
  );
}

function ProjectCardsSkeleton() {
  return (
    <LoadingRegion
      label="Loading project payroll summaries"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="space-y-4 border border-violet-100 bg-white p-5"
        >
          <Skeleton className="h-5 w-36" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, cell) => (
              <div key={cell} className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </LoadingRegion>
  );
}

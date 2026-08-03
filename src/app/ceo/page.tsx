import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  ClipboardList,
  FileWarning,
  HardHat,
  ReceiptText,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
  DashboardActionsSkeleton,
  DashboardMetricsSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardData } from "@/lib/phase2/data";
import { getWorkerDashboardSummary } from "@/lib/phase3/data";
import { getPendingLeaveCount } from "@/lib/phase5/data";
import { getPayrollDashboardSummary } from "@/lib/phase6/data";

export default function CeoDashboard() {
  const structurePromise = getDashboardData();
  const workforcePromise = getWorkerDashboardSummary();
  const leavePromise = getPendingLeaveCount();
  const payrollPromise = getPayrollDashboardSummary();

  return (
    <main>
      <PageHeader
        title="Dashboard"
        action={
          <Link
            href="/ceo/projects/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            New project
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <Suspense fallback={<DashboardActionsSkeleton />}>
        <DashboardActions
          structurePromise={structurePromise}
          workforcePromise={workforcePromise}
          leavePromise={leavePromise}
          payrollPromise={payrollPromise}
        />
      </Suspense>
      <Suspense fallback={<DashboardMetricsSkeleton />}>
        <DashboardMetrics
          leavePromise={leavePromise}
          payrollPromise={payrollPromise}
          structurePromise={structurePromise}
          workforcePromise={workforcePromise}
        />
      </Suspense>
    </main>
  );
}

async function DashboardActions({
  structurePromise,
  workforcePromise,
  leavePromise,
  payrollPromise,
}: {
  structurePromise: ReturnType<typeof getDashboardData>;
  workforcePromise: ReturnType<typeof getWorkerDashboardSummary>;
  leavePromise: ReturnType<typeof getPendingLeaveCount>;
  payrollPromise: ReturnType<typeof getPayrollDashboardSummary>;
}) {
  const [data, workforce] = await Promise.all([
    structurePromise,
    workforcePromise,
  ]);
  const actionCount =
    data.projectsWithoutForemen.length +
    data.unassignedActiveForemen.length +
    workforce.awaitingAssignment +
    workforce.documentAlerts +
    pendingLeave +
    payroll.openRuns +
    payroll.blockingExceptions +
    payroll.unpaidWorkers +
    (data.companyConfigured ? 0 : 1);

  return (
    <section id="action-required" className="mt-4">
      <article className="border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Priority queue
            </p>
            <h2 className="mt-0.5 font-heading text-lg font-semibold">
              Action required
            </h2>
          </div>
          <span className="text-2xl font-semibold tabular-nums text-slate-400">
            {actionCount}
          </span>
        </div>
        <div className="divide-y divide-slate-200">
          {actionCount === 0 ? (
            <div className="flex items-start gap-3 p-4">
              <UserRoundCheck
                className="mt-0.5 size-5 text-emerald-600"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Operating structure is ready</p>
                <p className="mt-1 text-sm text-slate-500">
                  No setup exceptions need attention.
                </p>
              </div>
            </div>
          ) : (
            <>
              {data.projectsWithoutForemen.map((project) => (
                <Link
                  key={project.id}
                  href={`/ceo/projects/${project.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Needs a current Foreman
                    </p>
                  </div>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
              {pendingLeave > 0 ? (
                <Link
                  href="/ceo/leave?status=PENDING"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {pendingLeave} pending leave{" "}
                      {pendingLeave === 1 ? "request" : "requests"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review attendance conflicts, then approve or reject
                    </p>
                  </div>
                  <ClipboardList className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {payroll.openRuns > 0 ||
              payroll.blockingExceptions > 0 ||
              payroll.unpaidWorkers > 0 ? (
                <Link
                  href="/ceo/payroll"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      Payroll needs attention
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {payroll.openRuns} open{" "}
                      {payroll.openRuns === 1 ? "run" : "runs"} ·{" "}
                      {payroll.blockingExceptions} blocking{" "}
                      {payroll.blockingExceptions === 1
                        ? "exception"
                        : "exceptions"}{" "}
                      · {payroll.unpaidWorkers} unpaid{" "}
                      {payroll.unpaidWorkers === 1 ? "worker" : "workers"}
                    </p>
                  </div>
                  <ReceiptText className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {data.unassignedActiveForemen.length > 0 ? (
                <Link
                  href="/ceo/settings?section=users"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {data.unassignedActiveForemen.length} active{" "}
                      {data.unassignedActiveForemen.length === 1
                        ? "Foreman"
                        : "Foremen"}{" "}
                      awaiting assignment
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review users and project assignments
                    </p>
                  </div>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {workforce.awaitingAssignment > 0 ? (
                <Link
                  href="/ceo/workers?status=ACTIVE"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {workforce.awaitingAssignment} active{" "}
                      {workforce.awaitingAssignment === 1
                        ? "worker is"
                        : "workers are"}{" "}
                      awaiting a project
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Assign workers from their profiles
                    </p>
                  </div>
                  <Users className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {workforce.documentAlerts > 0 ? (
                <Link
                  href="/ceo/workers"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {workforce.documentAlerts}{" "}
                      {workforce.documentAlerts === 1
                        ? "worker has"
                        : "workers have"}{" "}
                      an expired or expiring document
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Review workforce document alerts
                    </p>
                  </div>
                  <FileWarning className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
              {!data.companyConfigured ? (
                <Link
                  href="/ceo/settings?section=company"
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      Company identity is incomplete
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Add legal and display names
                    </p>
                  </div>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ) : null}
            </>
          )}
        </div>
      </article>
    </section>
  );
}

async function DashboardMetrics({
  leavePromise,
  payrollPromise,
  structurePromise,
  workforcePromise,
}: {
  leavePromise: ReturnType<typeof getPendingLeaveCount>;
  payrollPromise: ReturnType<typeof getPayrollDashboardSummary>;
  structurePromise: ReturnType<typeof getDashboardData>;
  workforcePromise: ReturnType<typeof getWorkerDashboardSummary>;
}) {
  const [data, workforce, pendingLeave, payroll] = await Promise.all([
    structurePromise,
    workforcePromise,
    leavePromise,
    payrollPromise,
  ]);
  const metrics = [
    {
      label: "Active projects",
      value: data.projects.filter((project) => project.status === "ACTIVE")
        .length,
      detail: `${data.projects.length} total project${data.projects.length === 1 ? "" : "s"}`,
      icon: Building2,
      href: "/ceo/projects?status=ACTIVE",
    },
    {
      label: "Active Foremen",
      value: data.foremen.filter((foreman) => foreman.isActive).length,
      detail: `${data.unassignedActiveForemen.length} awaiting assignment`,
      icon: HardHat,
      href: "/ceo/settings?section=users",
    },
    {
      label: "Active workers",
      value: workforce.active,
      detail: `${workforce.awaitingAssignment} awaiting assignment`,
      icon: Users,
      href: "/ceo/workers?status=ACTIVE",
    },
  ];

  return (
    <section
      aria-label="Company summary"
      className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white xl:grid-cols-4"
    >
      {metrics.map(({ label, value, detail, icon: Icon, href }) => (
        <Link
          key={label}
          href={href}
          className="group flex min-h-20 items-center gap-3 border-b border-r border-slate-200 p-3 hover:bg-violet-50/40 [&:nth-child(2n)]:border-r-0 xl:border-b-0 xl:[&:nth-child(2n)]:border-r"
        >
          <Icon
            className="size-4 shrink-0 text-violet-700"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-xl font-semibold tabular-nums">{value}</p>
            <h2 className="truncate text-xs font-semibold">{label}</h2>
            <p className="mt-0.5 hidden truncate text-[0.6875rem] text-slate-500 sm:block">
              {detail}
            </p>
          </div>
        </Link>
      ))}
      <Suspense
        fallback={
          <div
            aria-busy="true"
            className="flex min-h-20 items-center gap-3 border-b border-slate-200 p-3 xl:border-b-0"
          >
            <Skeleton className="size-4 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-12" />
              <span className="text-xs font-semibold">Action required</span>
            </div>
          </div>
        }
      >
        <DashboardActionMetric
          baseCount={
            data.projectsWithoutForemen.length +
            data.unassignedActiveForemen.length +
            workforce.awaitingAssignment +
            workforce.documentAlerts +
            (data.companyConfigured ? 0 : 1)
          }
          leavePromise={leavePromise}
          payrollPromise={payrollPromise}
        />
      </Suspense>
    </section>
  );
}

async function DashboardActionMetric({
  baseCount,
  leavePromise,
  payrollPromise,
}: {
  baseCount: number;
  leavePromise: ReturnType<typeof getPendingLeaveCount>;
  payrollPromise: ReturnType<typeof getPayrollDashboardSummary>;
}) {
  const [pendingLeave, payroll] = await Promise.all([
    leavePromise,
    payrollPromise,
  ]);
  const value =
    baseCount +
    pendingLeave +
    payroll.openRuns +
    payroll.blockingExceptions +
    payroll.unpaidWorkers;
  return (
    <Link
      href="#action-required"
      className="group flex min-h-20 items-center gap-3 border-b border-slate-200 p-3 hover:bg-violet-50/40 xl:border-b-0"
    >
      <CircleAlert
        className="size-4 shrink-0 text-violet-700"
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        <h2 className="truncate text-xs font-semibold">Action required</h2>
        <p className="mt-0.5 hidden truncate text-[0.6875rem] text-slate-500 sm:block">
          Operating-structure checks
        </p>
      </div>
    </Link>
  );
}

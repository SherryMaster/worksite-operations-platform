import {
  ArrowUpRight,
  Building2,
  CalendarCheck2,
  CircleCheck,
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
  DashboardAttendanceMetricSkeleton,
  DashboardActionsSkeleton,
  DashboardMetricsSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { getTodayAttendanceDashboardSummary } from "@/lib/phase4/attendance-monitor-data";
import { getDashboardData } from "@/lib/phase2/data";
import { getWorkerDashboardSummary } from "@/lib/phase3/data";
import { getPendingLeaveCount } from "@/lib/phase5/data";
import { getPayrollDashboardSummary } from "@/lib/phase6/data";
import { cn } from "@/lib/utils";

export default function CeoDashboard() {
  const structurePromise = getDashboardData();
  const workforcePromise = getWorkerDashboardSummary();
  const leavePromise = getPendingLeaveCount();
  const payrollPromise = getPayrollDashboardSummary();
  const attendancePromise = getTodayAttendanceDashboardSummary();

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
          attendancePromise={attendancePromise}
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
  const [data, workforce, pendingLeave, payroll] = await Promise.all([
    structurePromise,
    workforcePromise,
    leavePromise,
    payrollPromise,
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
  attendancePromise,
  structurePromise,
  workforcePromise,
}: {
  attendancePromise: ReturnType<typeof getTodayAttendanceDashboardSummary>;
  structurePromise: ReturnType<typeof getDashboardData>;
  workforcePromise: ReturnType<typeof getWorkerDashboardSummary>;
}) {
  const [data, workforce] = await Promise.all([
    structurePromise,
    workforcePromise,
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
      className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(34rem,2fr)]"
    >
      <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-3">
        {metrics.map(({ label, value, detail, icon: Icon, href }, index) => (
          <Link
            key={label}
            href={href}
            className={cn(
              "group flex min-h-24 items-center gap-3 p-3 hover:bg-violet-50/40 focus-visible:z-10 sm:min-h-28 sm:p-4",
              index === 0 && "border-b border-r border-slate-200 sm:border-b-0",
              index === 1 &&
                "border-b border-slate-200 sm:border-b-0 sm:border-r",
              index === 2 && "col-span-2 sm:col-span-1",
            )}
          >
            <Icon
              className="size-5 shrink-0 text-violet-700"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-2xl font-semibold tabular-nums">{value}</p>
              <h2 className="truncate text-xs font-semibold sm:text-sm">
                {label}
              </h2>
              <p className="mt-0.5 truncate text-[0.6875rem] text-slate-500">
                {detail}
              </p>
            </div>
          </Link>
        ))}
      </div>
      <Suspense fallback={<DashboardAttendanceMetricSkeleton />}>
        <DashboardAttendanceMetric attendancePromise={attendancePromise} />
      </Suspense>
    </section>
  );
}

async function DashboardAttendanceMetric({
  attendancePromise,
}: {
  attendancePromise: ReturnType<typeof getTodayAttendanceDashboardSummary>;
}) {
  const attendance = await attendancePromise;
  const allOffDay = attendance.allProjectsOffDay;
  const missing = attendance.noEntryYet || attendance.absent;
  const missingLabel = attendance.noEntryYet > 0 ? "No entry yet" : "Absent";
  const percentage = attendance.attendancePercent;
  const coverageTone =
    percentage === null
      ? "text-slate-500"
      : percentage >= 90
        ? "text-emerald-700"
        : percentage >= 75
          ? "text-amber-700"
          : "text-red-700";
  return (
    <Link
      href="/ceo/attendance?view=day"
      className="group min-w-0 rounded-lg border border-slate-200 bg-white p-3 transition-colors hover:border-violet-200 hover:bg-violet-50/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2 sm:p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CalendarCheck2
            className="size-5 shrink-0 text-violet-700"
            aria-hidden="true"
          />
          <h2 className="truncate text-sm font-semibold sm:text-base">
            {allOffDay ? "Off-day attendance" : "Today’s attendance"}
          </h2>
        </div>
        <p className="shrink-0 text-xs font-medium text-slate-500">
          Expected {allOffDay ? "N/A" : attendance.expected}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]">
        <DashboardAttendanceCount
          label={allOffDay ? "Working" : "Present"}
          value={allOffDay ? attendance.offDayWorking : attendance.present}
          detail={allOffDay ? "Off-day" : "Present"}
          tone="present"
        />
        <DashboardAttendanceCount
          label={allOffDay ? "Absent" : missingLabel}
          value={allOffDay ? "N/A" : missing}
          detail={allOffDay ? "Not applicable" : missingLabel}
          tone={
            allOffDay
              ? "neutral"
              : attendance.noEntryYet > 0
                ? "pending"
                : "absent"
          }
        />
        <DashboardAttendanceCount
          label="Leave"
          value={attendance.approvedLeave}
          detail="Approved"
          tone="leave"
        />
        <div className="col-span-3 flex items-center justify-between gap-3 border-t border-slate-200 px-1 pt-3 xl:col-span-1 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
          <CircleCheck
            className={cn("size-9 shrink-0", coverageTone)}
            aria-hidden="true"
          />
          <div className="min-w-0 xl:min-w-24">
            <p
              className={cn(
                "text-2xl font-semibold tabular-nums",
                coverageTone,
              )}
            >
              {percentage === null ? "N/A" : `${percentage.toFixed(1)}%`}
            </p>
            <p className="text-xs font-medium text-slate-600">Coverage</p>
          </div>
          <span className="text-xs font-semibold text-violet-700 xl:hidden">
            View attendance →
          </span>
        </div>
      </div>
      {attendance.offDayWorking > 0 && !allOffDay ? (
        <p className="mt-2 text-xs text-slate-500">
          Plus {attendance.offDayWorking}{" "}
          {attendance.offDayWorking === 1 ? "worker" : "workers"} recorded on an
          off-day.
        </p>
      ) : null}
    </Link>
  );
}

function DashboardAttendanceCount({
  detail,
  label,
  tone,
  value,
}: {
  detail: string;
  label: string;
  tone: "absent" | "leave" | "neutral" | "pending" | "present";
  value: number | string;
}) {
  const tones = {
    absent: "border-red-100 bg-red-50/80 text-red-700",
    leave: "border-blue-100 bg-blue-50/80 text-blue-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    pending: "border-amber-100 bg-amber-50/80 text-amber-800",
    present: "border-emerald-100 bg-emerald-50/80 text-emerald-700",
  };
  return (
    <div className={cn("min-w-0 rounded-lg border p-2.5", tones[tone])}>
      <p className="truncate text-[0.625rem] font-bold uppercase tracking-wide">
        {label}
      </p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[0.6875rem] font-medium opacity-90">
        {detail}
      </p>
    </div>
  );
}

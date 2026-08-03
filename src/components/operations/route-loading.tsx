import { ArrowLeft, ArrowUpRight, ChevronLeft } from "lucide-react";
import Link from "next/link";

import {
  AttendanceWorkspaceSkeleton,
  DashboardActionsSkeleton,
  DashboardMetricsSkeleton,
  DetailPanelsSkeleton,
  DirectoryContentSkeleton,
  FormContentSkeleton,
  ListResultsSkeleton,
  PayrollRunSkeleton,
  PayrollStatementSkeleton,
  PayrollWorkerSkeleton,
  ProfileHeaderSkeleton,
  ProjectHeaderSkeleton,
  ProjectSummarySkeleton,
  ReportContentSkeleton,
  SettingsContentSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardRouteLoading({
  role = "CEO",
}: {
  role?: "CEO" | "FOREMAN";
}) {
  if (role === "FOREMAN") {
    return (
      <main>
        <PageHeader title="Today" description="Live worksite operations." />
        <AttendanceWorkspaceSkeleton />
      </main>
    );
  }
  return (
    <main>
      <PageHeader
        title="Dashboard"
        action={
          <Link
            href="/ceo/projects/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white"
          >
            New project
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      <DashboardActionsSkeleton />
      <DashboardMetricsSkeleton />
    </main>
  );
}

export function DirectoryRouteLoading({
  action,
  actionHref,
  columns,
  description,
  filters,
  showLeading,
  title,
}: {
  action?: string;
  actionHref?: string;
  columns: number;
  description: string;
  filters: number;
  showLeading?: boolean;
  title: string;
}) {
  return (
    <main>
      <PageHeader
        title={title}
        description={description}
        action={
          action && actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex min-h-10 items-center rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white"
            >
              {action}
            </Link>
          ) : undefined
        }
      />
      <DirectoryContentSkeleton
        columns={columns}
        filters={filters}
        showLeading={showLeading}
      />
    </main>
  );
}

export function FormRouteLoading({
  backLabel,
  description,
  fields,
  title,
}: {
  backLabel: string;
  description?: string;
  fields: number;
  title: string;
}) {
  return (
    <main>
      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </span>
      <div className="mt-4 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <FormContentSkeleton fields={fields} />
    </main>
  );
}

export function ProjectDetailRouteLoading({
  foreman = false,
}: {
  foreman?: boolean;
}) {
  return (
    <main>
      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {foreman ? "Back to Today" : "Back to projects"}
      </span>
      {foreman ? (
        <ProjectSummarySkeleton />
      ) : (
        <>
          <ProjectHeaderSkeleton />
          <DetailPanelsSkeleton cards={2} />
        </>
      )}
    </main>
  );
}

export function WorkerDetailRouteLoading({
  foreman = false,
}: {
  foreman?: boolean;
}) {
  return (
    <main>
      <span className="inline-flex items-center gap-2 text-sm text-slate-600">
        <ChevronLeft className="size-4" aria-hidden="true" />
        {foreman ? "Workers" : "Back to workers"}
      </span>
      <ProfileHeaderSkeleton compact={foreman} />
      <div className="mt-3 flex gap-4 overflow-hidden border-b border-slate-200 py-3 text-sm text-slate-500">
        {(foreman
          ? ["Overview", "Documents"]
          : [
              "Overview",
              "Employment",
              "Assignments",
              "Rates",
              "Documents",
              "Attendance",
              "Leave",
              "Payroll",
              "Audit",
            ]
        ).map((label) => (
          <span key={label} className="shrink-0">
            {label}
          </span>
        ))}
      </div>
      <DetailPanelsSkeleton cards={foreman ? 1 : 2} rows={3} />
    </main>
  );
}

export function AttendanceRouteLoading({
  history = false,
}: {
  history?: boolean;
}) {
  return (
    <main>
      <PageHeader
        title={history ? "Attendance history" : "Attendance"}
        description={
          history
            ? "Review records and corrections by work date."
            : "Review daily records, payable time, and exceptions."
        }
      />
      <AttendanceWorkspaceSkeleton />
    </main>
  );
}

export function LeaveRouteLoading({ foreman = false }: { foreman?: boolean }) {
  return (
    <main>
      <PageHeader
        title={foreman ? "Leave" : "Leave review"}
        description={
          foreman
            ? "Submit and review worker leave requests."
            : "Submit, review, approve, and reject worker leave."
        }
      />
      <FormContentSkeleton fields={4} />
      <ListResultsSkeleton columns={6} rows={6} />
    </main>
  );
}

export function PayrollRouteLoading() {
  return (
    <main>
      <PageHeader
        title="Payroll"
        description="Review monthly runs, blockers, approvals, and payments."
      />
      <div className="mt-4 grid max-w-xl gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <span className="text-sm font-medium">Calendar month</span>
          <Skeleton className="h-10 w-full" />
        </div>
        <span className="h-10 self-end rounded-md bg-slate-200 px-5" />
      </div>
      <ListResultsSkeleton columns={7} rows={5} />
    </main>
  );
}

export function PayrollRunRouteLoading() {
  return (
    <main>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft className="size-4" />
        Payroll months
      </span>
      <PayrollRunSkeleton />
    </main>
  );
}

export function PayrollWorkerRouteLoading() {
  return (
    <main>
      <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
        <ArrowLeft className="size-4" />
        Back to payroll run
      </span>
      <PayrollWorkerSkeleton />
    </main>
  );
}

export function PayrollStatementRouteLoading() {
  return (
    <main>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft className="size-4" />
          Back to worker payroll
        </span>
        <span className="inline-flex min-h-10 items-center border border-slate-200 bg-white px-4 text-sm font-semibold">
          Print statement
        </span>
      </div>
      <PayrollStatementSkeleton />
    </main>
  );
}

export function ReportsRouteLoading() {
  return (
    <main>
      <PageHeader
        title="Reports"
        description="Browse predefined operational reports and export the filtered results."
      />
      <ReportContentSkeleton />
    </main>
  );
}

export function SettingsRouteLoading() {
  return (
    <main>
      <PageHeader
        title="Settings"
        description="Manage one company module at a time."
      />
      <div className="mt-4 flex gap-2 overflow-hidden">
        {[
          "Users",
          "Trades",
          "Skills",
          "Documents",
          "Leave types",
          "Import template",
          "Company",
        ].map((label) => (
          <span
            key={label}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            {label}
          </span>
        ))}
      </div>
      <SettingsContentSkeleton />
    </main>
  );
}

export function AuditRouteLoading() {
  return (
    <main>
      <PageHeader
        title="Audit log"
        description="Read company activity in plain language. Technical references stay collapsed."
      />
      <DirectoryContentSkeleton columns={4} filters={3} />
    </main>
  );
}

export function ImportsRouteLoading() {
  return (
    <main>
      <PageHeader
        title="Import center"
        description="Prepare, validate, and commit company records."
      />
      <div className="mt-4 h-12 rounded-lg border border-amber-200 bg-amber-50" />
      <FormContentSkeleton fields={3} />
      <section className="mt-6">
        <h2 className="font-heading text-lg font-semibold">
          Reconciliation history
        </h2>
        <ListResultsSkeleton columns={7} rows={4} />
      </section>
    </main>
  );
}

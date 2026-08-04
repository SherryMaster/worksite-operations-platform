import { CalendarDays } from "lucide-react";
import { Suspense } from "react";

import {
  AttendanceDailySummary,
  AttendanceRecordsSummary,
  AttendanceRecordsTables,
  AttendanceWorkerLedger,
  type AttendanceMonitorFilters,
} from "@/components/phase4/attendance-monitor";
import { AttendanceMonitorControls } from "@/components/phase4/attendance-monitor-controls";
import {
  AttendanceMonitorSummarySkeleton,
  AttendanceRecordsSummarySkeleton,
  AttendanceRecordsTableSkeleton,
  AttendanceWorkerLedgerSkeleton,
  DirectoryToolbarSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import {
  getDailyAttendanceMonitor,
  getMonthlyAttendanceMonitor,
  listAttendanceMonitorProjects,
} from "@/lib/phase4/attendance-monitor-data";

type AttendanceSearchParams = AttendanceMonitorFilters & {
  date?: string;
  month?: string;
  view?: string;
};

export default async function ForemanAttendancePage({
  searchParams,
}: {
  searchParams: Promise<AttendanceSearchParams>;
}) {
  const params = await searchParams;
  const today = malaysiaDateInputValue();
  const workDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? (params.date as string)
    : today;
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : today.slice(0, 7);
  const view =
    params.view === "month" || params.view === "records" ? "month" : "day";
  const projectsPromise = listAttendanceMonitorProjects();
  const monitorPromise =
    view === "day"
      ? getDailyAttendanceMonitor({ role: "FOREMAN", workDate })
      : getMonthlyAttendanceMonitor({ month, role: "FOREMAN" });
  const resultKey = [
    view,
    workDate,
    month,
    params.query,
    params.status,
    params.worker,
    params.page,
    params.workerPage,
  ]
    .map((value) => value ?? "")
    .join("|");
  return (
    <main>
      <PageHeader
        title="Attendance"
        description="Monitor workforce presence, recorded work hours, and attendance exceptions."
      />
      <Suspense fallback={<DirectoryToolbarSkeleton filters={2} />}>
        <ForemanControls
          projectsPromise={projectsPromise}
          date={workDate}
          month={month}
          today={today}
          view={view}
        />
      </Suspense>
      {view === "day" ? (
        <>
          <Suspense
            key={`summary:${resultKey}`}
            fallback={<AttendanceMonitorSummarySkeleton />}
          >
            <DailyRegion
              monitorPromise={
                monitorPromise as ReturnType<typeof getDailyAttendanceMonitor>
              }
              part="summary"
            />
          </Suspense>
          <Suspense
            key={`ledger:${resultKey}`}
            fallback={<AttendanceWorkerLedgerSkeleton />}
          >
            <DailyRegion
              monitorPromise={
                monitorPromise as ReturnType<typeof getDailyAttendanceMonitor>
              }
              part="ledger"
              params={params}
            />
          </Suspense>
        </>
      ) : (
        <>
          <Suspense
            key={`summary:${resultKey}`}
            fallback={<AttendanceRecordsSummarySkeleton />}
          >
            <RecordsRegion
              monitorPromise={
                monitorPromise as ReturnType<typeof getMonthlyAttendanceMonitor>
              }
              part="summary"
            />
          </Suspense>
          <Suspense
            key={`tables:${resultKey}`}
            fallback={<AttendanceRecordsTableSkeleton />}
          >
            <RecordsRegion
              monitorPromise={
                monitorPromise as ReturnType<typeof getMonthlyAttendanceMonitor>
              }
              part="tables"
              params={params}
            />
          </Suspense>
        </>
      )}
    </main>
  );
}

async function ForemanControls({
  projectsPromise,
  date,
  month,
  today,
  view,
}: {
  projectsPromise: ReturnType<typeof listAttendanceMonitorProjects>;
  date: string;
  month: string;
  today: string;
  view: "day" | "month";
}) {
  const projects = await projectsPromise;
  const project =
    projects.find((item) => ["ACTIVE", "PLANNED"].includes(item.status)) ??
    projects[0];
  return (
    <AttendanceMonitorControls
      basePath="/foreman/attendance"
      date={date}
      month={month}
      projectId={project?.id}
      projects={projects}
      role="FOREMAN"
      today={today}
      view={view}
    />
  );
}

function NoAssignedProject() {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <CalendarDays
        className="mx-auto size-8 text-slate-400"
        aria-hidden="true"
      />
      <h2 className="mt-3 font-semibold">No assigned project</h2>
      <p className="mt-1 text-sm text-slate-500">
        Attendance records become available after a current project is assigned.
      </p>
    </div>
  );
}

async function DailyRegion({
  monitorPromise,
  params = {},
  part,
}: {
  monitorPromise: ReturnType<typeof getDailyAttendanceMonitor>;
  params?: AttendanceSearchParams;
  part: "summary" | "ledger";
}) {
  const monitor = await monitorPromise;
  if (monitor.projects.length === 0)
    return part === "summary" ? <NoAssignedProject /> : null;
  if (part === "summary") return <AttendanceDailySummary monitor={monitor} />;
  return (
    <AttendanceWorkerLedger
      basePath="/foreman/attendance"
      filters={params}
      monitor={monitor}
    />
  );
}

async function RecordsRegion({
  monitorPromise,
  params = {},
  part,
}: {
  monitorPromise: ReturnType<typeof getMonthlyAttendanceMonitor>;
  params?: AttendanceSearchParams;
  part: "summary" | "tables";
}) {
  const monitor = await monitorPromise;
  if (monitor.projects.length === 0)
    return part === "summary" ? <NoAssignedProject /> : null;
  if (part === "summary") return <AttendanceRecordsSummary monitor={monitor} />;
  return (
    <AttendanceRecordsTables
      basePath="/foreman/attendance"
      filters={params}
      monitor={monitor}
    />
  );
}

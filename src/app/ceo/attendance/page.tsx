import { CalendarDays } from "lucide-react";
import { Suspense } from "react";

import { AttendanceMonitorControls } from "@/components/phase4/attendance-monitor-controls";
import {
  AttendanceDailySummary,
  AttendanceProjectComparison,
  AttendanceRecordsSummary,
  AttendanceRecordsTables,
  AttendanceWorkerLedger,
  type AttendanceMonitorFilters,
} from "@/components/phase4/attendance-monitor";
import {
  AttendanceMonitorSummarySkeleton,
  AttendanceProjectComparisonSkeleton,
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

function validDate(value: string | undefined, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? (value as string) : fallback;
}

export default async function CeoAttendancePage({
  searchParams,
}: {
  searchParams: Promise<AttendanceSearchParams>;
}) {
  const params = await searchParams;
  const today = malaysiaDateInputValue();
  const workDate = validDate(params.date, today);
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : today.slice(0, 7);
  const view =
    params.view === "month" || params.view === "records" ? "month" : "day";
  const projectsPromise = listAttendanceMonitorProjects();
  const monitorPromise =
    view === "day"
      ? getDailyAttendanceMonitor({
          projectId: params.project,
          role: "CEO",
          workDate,
        })
      : getMonthlyAttendanceMonitor({
          month,
          projectId: params.project,
          role: "CEO",
        });
  const resultKey = [
    view,
    workDate,
    month,
    params.project,
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
        <AttendanceControls
          projectsPromise={projectsPromise}
          params={params}
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
            key={`projects:${resultKey}`}
            fallback={<AttendanceProjectComparisonSkeleton />}
          >
            <DailyRegion
              monitorPromise={
                monitorPromise as ReturnType<typeof getDailyAttendanceMonitor>
              }
              part="projects"
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
            key={`records-summary:${resultKey}`}
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
            key={`records-tables:${resultKey}`}
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

async function AttendanceControls({
  projectsPromise,
  params,
  date,
  month,
  today,
  view,
}: {
  projectsPromise: ReturnType<typeof listAttendanceMonitorProjects>;
  params: AttendanceSearchParams;
  date: string;
  month: string;
  today: string;
  view: "day" | "month";
}) {
  const projects = await projectsPromise;
  const availableProjects =
    view === "day"
      ? projects.filter((project) => project.status === "ACTIVE")
      : projects;
  const projectId = availableProjects.some(
    (project) => project.id === params.project,
  )
    ? params.project
    : undefined;
  return (
    <AttendanceMonitorControls
      basePath="/ceo/attendance"
      date={date}
      month={month}
      projectId={projectId}
      projects={availableProjects}
      role="CEO"
      today={today}
      view={view}
    />
  );
}

function NoProjects() {
  return (
    <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
      <CalendarDays
        className="mx-auto size-8 text-slate-400"
        aria-hidden="true"
      />
      <h2 className="mt-3 font-semibold">No active projects</h2>
      <p className="mt-1 text-sm text-slate-500">
        Attendance monitoring begins after a project is active and workers are
        assigned.
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
  part: "summary" | "projects" | "ledger";
}) {
  const monitor = await monitorPromise;
  if (monitor.projects.length === 0)
    return part === "summary" ? <NoProjects /> : null;
  if (part === "summary") return <AttendanceDailySummary monitor={monitor} />;
  if (part === "projects")
    return (
      <AttendanceProjectComparison
        basePath="/ceo/attendance"
        monitor={monitor}
      />
    );
  const selectedProjectId =
    params.project && monitor.projects.length === 1
      ? monitor.projects[0]?.id
      : undefined;
  return (
    <AttendanceWorkerLedger
      basePath="/ceo/attendance"
      filters={params}
      monitor={monitor}
      projectId={selectedProjectId}
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
    return part === "summary" ? <NoProjects /> : null;
  if (part === "summary") return <AttendanceRecordsSummary monitor={monitor} />;
  const selectedProjectId =
    params.project && monitor.projects.length === 1
      ? monitor.projects[0]?.id
      : undefined;
  return (
    <AttendanceRecordsTables
      basePath="/ceo/attendance"
      filters={params}
      monitor={monitor}
      projectId={selectedProjectId}
    />
  );
}

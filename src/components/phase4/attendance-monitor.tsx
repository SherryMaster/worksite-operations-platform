import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Search,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AttendanceRecordDetail } from "@/components/phase4/attendance-record-detail";
import { WorkerAvatar } from "@/components/worker-avatar";
import type {
  AttendanceMonitorSummary,
  AttendanceProjectSummary,
  AttendanceWorkerDayRecord,
  AttendanceWorkerMonthRollup,
  DailyAttendanceMonitor,
  MonthlyAttendanceMonitor,
} from "@/lib/phase4/attendance-monitor-types";
import { formatMinutes } from "@/lib/phase4/calculations";
import { cn } from "@/lib/utils";

export type AttendanceMonitorFilters = {
  page?: string;
  project?: string;
  query?: string;
  status?: string;
  worker?: string;
  workerPage?: string;
};

const PAGE_SIZE = 50;

function presenceLabel(value: AttendanceWorkerDayRecord["presenceStatus"]) {
  return {
    ABSENT: "Absent",
    APPROVED_LEAVE: "Approved leave",
    NOT_APPLICABLE: "Not applicable",
    NO_ENTRY_YET: "No entry yet",
    PRESENT: "Present",
  }[value];
}

function liveLabel(value: AttendanceWorkerDayRecord["liveStatus"]) {
  return {
    EXITED: "Exited",
    NOT_ENTERED: "Not entered",
    ON_BREAK: "On break",
    ON_SITE: "On site",
  }[value];
}

function qualityLabel(value: AttendanceWorkerDayRecord["quality"]) {
  return {
    INCOMPLETE: "Incomplete",
    INVALID: "Invalid",
    LEAVE_CONFLICT: "Leave conflict",
    VALID: "Complete",
  }[value];
}

function dayTypeLabel(value: AttendanceWorkerDayRecord["dayType"]) {
  return {
    NORMAL: "Normal",
    PUBLIC_HOLIDAY: "Public holiday",
    SUNDAY: "Sunday",
  }[value];
}

function malaysiaTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function lastExitLabel(record: AttendanceWorkerDayRecord) {
  if (record.sessions.length === 0) return "—";
  return record.lastExitAt ? malaysiaTime(record.lastExitAt) : "Open";
}

function percentage(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(1)}%`;
}

function attendanceTone(value: AttendanceWorkerDayRecord["presenceStatus"]) {
  if (value === "PRESENT")
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (value === "APPROVED_LEAVE")
    return "border-blue-200 bg-blue-50 text-blue-800";
  if (value === "NO_ENTRY_YET")
    return "border-amber-200 bg-amber-50 text-amber-900";
  if (value === "ABSENT") return "border-red-200 bg-red-50 text-red-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function monitorHref(
  basePath: string,
  params: Record<string, string | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  return `${basePath}?${query.toString()}`;
}

function matchesRecordStatus(
  record: AttendanceWorkerDayRecord,
  status?: string,
) {
  if (!status || status === "all") return true;
  if (status === "present") return record.presenceStatus === "PRESENT";
  if (status === "missing") {
    return (
      record.presenceStatus === "NO_ENTRY_YET" ||
      record.presenceStatus === "ABSENT"
    );
  }
  if (status === "leave") return record.presenceStatus === "APPROVED_LEAVE";
  if (status === "on-site") return record.liveStatus === "ON_SITE";
  if (status === "on-break") return record.liveStatus === "ON_BREAK";
  if (status === "exited") return record.liveStatus === "EXITED";
  if (status === "issues") return record.quality !== "VALID";
  if (status === "incomplete") return record.quality === "INCOMPLETE";
  if (status === "invalid") return record.quality === "INVALID";
  if (status === "conflict") return record.quality === "LEAVE_CONFLICT";
  return true;
}

export function filterAttendanceRecords(
  records: AttendanceWorkerDayRecord[],
  filters: AttendanceMonitorFilters,
) {
  const query = filters.query?.trim().toLocaleLowerCase();
  return records.filter(
    (record) =>
      matchesRecordStatus(record, filters.status) &&
      (!filters.worker || record.workerId === filters.worker) &&
      (!query ||
        [
          record.workerName,
          record.projectName,
          record.tradeName,
          record.skillName,
        ].some((value) => value?.toLocaleLowerCase().includes(query))),
  );
}

function pagination(pageValue: string | undefined, count: number) {
  const requested = Number(pageValue ?? "1");
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const current = Math.min(page, pages);
  return {
    current,
    pages,
    start: (current - 1) * PAGE_SIZE,
    end: current * PAGE_SIZE,
  };
}

function PresenceSummary({
  scopeLabel,
  summary,
  workDate,
}: {
  scopeLabel: string;
  summary: AttendanceMonitorSummary;
  workDate: string;
}) {
  const missingLabel =
    summary.expected === 0 && summary.notApplicable > 0
      ? "Not applicable"
      : summary.noEntryYet > 0
        ? "No entry yet"
        : "Absent";
  const missingValue =
    missingLabel === "Not applicable"
      ? summary.notApplicable
      : summary.noEntryYet || summary.absent;
  const presentWidth = summary.expected
    ? Math.min(100, (summary.present / summary.expected) * 100)
    : 0;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Daily attendance · {workDate}
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-700">
            {scopeLabel}
          </p>
        </div>
        <p className="text-3xl font-semibold tabular-nums text-slate-950">
          {percentage(summary.attendancePercent)}
        </p>
      </div>
      {summary.allProjectsOffDay ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3">
          <p className="font-semibold">No regular attendance expected</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.offDayWorking}{" "}
            {summary.offDayWorking === 1 ? "worker is" : "workers are"} recorded
            as working off-day time. Absence is not applicable.
          </p>
        </div>
      ) : (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-4">
            {[
              ["Present", summary.present, "text-emerald-700"],
              [
                missingLabel,
                missingValue,
                missingLabel === "Absent"
                  ? "text-red-700"
                  : missingLabel === "No entry yet"
                    ? "text-amber-800"
                    : "text-slate-600",
              ],
              ["Approved leave", summary.approvedLeave, "text-blue-700"],
              ["Expected", summary.expected, "text-slate-900"],
            ].map(([label, value, tone]) => (
              <div key={String(label)}>
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd
                  className={cn(
                    "mt-1 text-xl font-semibold tabular-nums",
                    tone,
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"
            aria-label={`${percentage(summary.attendancePercent)} attendance`}
          >
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${presentWidth}%` }}
            />
          </div>
          {summary.offDayWorking > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Plus {summary.offDayWorking} working on Sunday or a public
              holiday.
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}

export function AttendanceDailySummary({
  monitor,
}: {
  monitor: DailyAttendanceMonitor;
}) {
  const { summary } = monitor;
  const specialMinutes = summary.sundayMinutes + summary.publicHolidayMinutes;
  return (
    <section
      aria-label="Daily attendance summary"
      className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-12"
    >
      <PresenceSummary
        scopeLabel={monitor.scopeLabel}
        summary={summary}
        workDate={monitor.workDate}
      />
      <article className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-2">
        <Users className="size-4 text-violet-700" aria-hidden="true" />
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {summary.activeSessions}
        </p>
        <h2 className="text-xs font-semibold">Active sessions</h2>
        <p className="mt-1 text-xs text-slate-500">
          {summary.onSite} on site · {summary.onBreak} on break
        </p>
        <p className="mt-1 text-xs text-slate-500">{summary.exited} exited</p>
      </article>
      <article className="rounded-lg border border-slate-200 bg-white p-3 lg:col-span-3">
        <Clock3 className="size-4 text-violet-700" aria-hidden="true" />
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {formatMinutes(summary.totalPayableMinutes)}
        </p>
        <h2 className="text-xs font-semibold">Valid recorded time</h2>
        <p className="mt-1 text-xs text-slate-500">
          {formatMinutes(summary.normalMinutes)} normal ·{" "}
          {formatMinutes(summary.overtimeMinutes)} overtime
        </p>
        {specialMinutes > 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            {formatMinutes(specialMinutes)} special-rate time
          </p>
        ) : null}
        <p className="mt-2 text-[0.6875rem] text-slate-400">
          Open or invalid intervals are excluded until complete.
        </p>
      </article>
      <article
        className={cn(
          "rounded-lg border bg-white p-3 lg:col-span-2",
          summary.recordsWithIssues > 0 ? "border-red-200" : "border-slate-200",
        )}
      >
        <AlertTriangle
          className={cn(
            "size-4",
            summary.recordsWithIssues > 0 ? "text-red-700" : "text-emerald-700",
          )}
          aria-hidden="true"
        />
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {summary.recordsWithIssues}
        </p>
        <h2 className="text-xs font-semibold">Need attention</h2>
        <p className="mt-1 text-xs text-slate-500">
          {summary.incomplete} incomplete · {summary.invalid} invalid
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {summary.leaveConflicts} leave conflict
        </p>
      </article>
    </section>
  );
}

function projectProblemLabel(project: AttendanceProjectSummary) {
  if (project.recordsWithIssues > 0)
    return `${project.recordsWithIssues} need attention`;
  if (project.allProjectsOffDay)
    return `${project.offDayWorking} off-day working`;
  return "Complete records";
}

export function AttendanceProjectComparison({
  basePath,
  monitor,
}: {
  basePath: string;
  monitor: DailyAttendanceMonitor;
}) {
  if (monitor.projects.length <= 1) return null;
  return (
    <section className="mt-4" aria-labelledby="project-attendance-title">
      <h2 id="project-attendance-title" className="text-base font-semibold">
        Project attendance
      </h2>
      <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white lg:hidden">
        {monitor.projectSummaries.map((project) => (
          <Link
            key={project.projectId}
            href={monitorHref(basePath, {
              date: monitor.workDate,
              project: project.projectId,
              view: "day",
            })}
            className="flex min-h-28 items-center gap-3 border-b border-slate-200 p-3 last:border-0 hover:bg-slate-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="truncate text-sm font-semibold">
                  {project.projectName}
                </h3>
                <span className="font-semibold tabular-nums">
                  {percentage(project.attendancePercent)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {dayTypeLabel(project.dayType)} ·{" "}
                {project.notApplicable > 0 && project.expected === 0
                  ? "N/A"
                  : project.expected}{" "}
                expected
              </p>
              <p className="mt-1 text-xs text-slate-700">
                {project.present || project.offDayWorking} present ·{" "}
                {project.notApplicable > 0 && project.expected === 0
                  ? "N/A"
                  : project.noEntryYet || project.absent}{" "}
                {project.notApplicable > 0 && project.expected === 0
                  ? "not applicable"
                  : project.noEntryYet
                    ? "no entry"
                    : "absent"}{" "}
                · {project.approvedLeave} leave
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {project.onSite} on site ·{" "}
                {formatMinutes(project.totalPayableMinutes)} recorded
              </p>
              <p
                className={cn(
                  "mt-1 text-xs font-medium",
                  project.recordsWithIssues > 0
                    ? "text-red-700"
                    : "text-slate-500",
                )}
              >
                {projectProblemLabel(project)}
              </p>
            </div>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
      <div className="mt-2 hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="w-full min-w-[72rem] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              {[
                "Project",
                "Day type",
                "Expected",
                "Present",
                "No entry / Absent",
                "Leave",
                "Attendance",
                "On site",
                "Recorded",
                "OT",
                "Issues",
              ].map((label) => (
                <th key={label} className="px-3 py-2.5 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitor.projectSummaries.map((project) => (
              <tr key={project.projectId} className="hover:bg-slate-50">
                <td className="px-3 py-2.5 font-semibold">
                  <Link
                    className="text-violet-700 hover:underline"
                    href={monitorHref(basePath, {
                      date: monitor.workDate,
                      project: project.projectId,
                      view: "day",
                    })}
                  >
                    {project.projectName}
                  </Link>
                </td>
                <td className="px-3 py-2.5">{dayTypeLabel(project.dayType)}</td>
                <td className="px-3 py-2.5 tabular-nums">
                  {project.allProjectsOffDay ||
                  (project.notApplicable > 0 && project.expected === 0)
                    ? "N/A"
                    : project.expected}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-emerald-700">
                  {project.present || project.offDayWorking}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {project.allProjectsOffDay ||
                  (project.notApplicable > 0 && project.expected === 0)
                    ? "N/A"
                    : project.noEntryYet || project.absent}
                </td>
                <td className="px-3 py-2.5 tabular-nums text-blue-700">
                  {project.approvedLeave}
                </td>
                <td className="px-3 py-2.5 font-semibold tabular-nums">
                  {percentage(project.attendancePercent)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">{project.onSite}</td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMinutes(project.totalPayableMinutes)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMinutes(project.overtimeMinutes)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 font-semibold tabular-nums",
                    project.recordsWithIssues > 0 && "text-red-700",
                  )}
                >
                  {project.recordsWithIssues}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const dailyFilters = [
  ["all", "All"],
  ["present", "Present"],
  ["missing", "No entry / Absent"],
  ["leave", "Leave"],
  ["on-site", "On site"],
  ["issues", "Needs attention"],
  ["on-break", "On break"],
  ["exited", "Exited"],
  ["incomplete", "Incomplete"],
  ["invalid", "Invalid"],
  ["conflict", "Leave conflict"],
] as const;

function AttendanceFilterToolbar({
  basePath,
  date,
  filters,
  month,
  projectId,
  view,
}: {
  basePath: string;
  date?: string;
  filters: AttendanceMonitorFilters;
  month?: string;
  projectId?: string;
  view: "day" | "month";
}) {
  const statusFilters =
    view === "day"
      ? dailyFilters
      : ([
          ["all", "All"],
          ["present", "Present"],
          ["missing", "Absent"],
          ["leave", "Leave"],
          ["issues", "Needs attention"],
        ] as const);
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 mt-3 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:static">
      <form className="flex gap-2">
        <input
          type="hidden"
          name="view"
          value={view === "month" ? "month" : "day"}
        />
        {date ? <input type="hidden" name="date" value={date} /> : null}
        {month ? <input type="hidden" name="month" value={month} /> : null}
        {projectId ? (
          <input type="hidden" name="project" value={projectId} />
        ) : null}
        {filters.status ? (
          <input type="hidden" name="status" value={filters.status} />
        ) : null}
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Search attendance records</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="query"
            type="search"
            defaultValue={filters.query}
            placeholder="Search worker, project, trade or skill…"
            className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-slate-200 px-3 text-xs font-semibold"
        >
          Search
        </button>
      </form>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
        {statusFilters.map(([value, label]) => (
          <Link
            key={value}
            aria-current={
              (filters.status ?? "all") === value ? "page" : undefined
            }
            href={monitorHref(basePath, {
              date,
              month,
              project: projectId,
              query: filters.query,
              status: value === "all" ? undefined : value,
              view: view === "month" ? "month" : "day",
            })}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center rounded-lg border px-3 text-xs font-semibold",
              (filters.status ?? "all") === value
                ? "border-violet-700 bg-violet-50 text-violet-800"
                : "border-slate-200 text-slate-700",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function AttendancePagination({
  basePath,
  current,
  filters,
  pageKey = "page",
  pages,
  routeState,
}: {
  basePath: string;
  current: number;
  filters: AttendanceMonitorFilters;
  pageKey?: "page" | "workerPage";
  pages: number;
  routeState: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const href = (page: number) =>
    monitorHref(basePath, {
      ...routeState,
      page: filters.page,
      query: filters.query,
      status: filters.status,
      worker: filters.worker,
      workerPage: filters.workerPage,
      [pageKey]: String(page),
    });
  return (
    <nav
      aria-label="Attendance record pages"
      className="mt-3 flex items-center justify-between gap-3"
    >
      <p className="text-xs text-slate-500">
        Page {current} of {pages}
      </p>
      <div className="flex gap-2">
        {current > 1 ? (
          <Link
            href={href(current - 1)}
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
          >
            Previous
          </Link>
        ) : null}
        {current < pages ? (
          <Link
            href={href(current + 1)}
            className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold"
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

function WorkerRows({
  records,
  showDate = false,
  showProject,
}: {
  records: AttendanceWorkerDayRecord[];
  showDate?: boolean;
  showProject: boolean;
}) {
  return (
    <>
      <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
        {records.map((record) => (
          <article
            key={`${record.projectId}:${record.workDate}:${record.workerId}:mobile`}
            className="flex min-h-24 items-center gap-3 border-b border-slate-100 p-3 last:border-0"
          >
            <WorkerAvatar
              workerId={record.workerId}
              photoId={record.workerPhotoId}
              name={record.workerName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="truncate text-sm font-semibold">
                  {record.workerName}
                </h3>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold",
                    attendanceTone(record.presenceStatus),
                  )}
                >
                  {presenceLabel(record.presenceStatus)}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {[record.tradeName, record.skillName]
                  .filter(Boolean)
                  .join(" · ") || "No classification"}
              </p>
              <p className="mt-1 truncate text-xs tabular-nums text-slate-600">
                {showDate ? `${record.workDate} · ` : ""}
                {showProject ? `${record.projectName} · ` : ""}
                {malaysiaTime(record.firstEntryAt)}–{lastExitLabel(record)} ·{" "}
                {formatMinutes(record.totalPayableMinutes)}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  record.quality === "VALID"
                    ? "text-slate-500"
                    : "font-medium text-red-700",
                )}
              >
                {liveLabel(record.liveStatus)} · {qualityLabel(record.quality)}
              </p>
            </div>
            <AttendanceRecordDetail record={record} />
          </article>
        ))}
      </div>
      <div className="mt-3 hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[64rem] text-left text-xs">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              {[
                "Worker",
                ...(showDate ? ["Date"] : []),
                ...(showProject ? ["Project"] : []),
                "Presence",
                "Current state",
                "First entry",
                "Last exit",
                "Recorded",
                "OT",
                "Quality",
                "Details",
              ].map((label) => (
                <th key={label} className="px-3 py-2.5 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.map((record) => (
              <tr
                key={`${record.projectId}:${record.workDate}:${record.workerId}`}
                className={cn(record.quality !== "VALID" && "bg-red-50/30")}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <WorkerAvatar
                      workerId={record.workerId}
                      photoId={record.workerPhotoId}
                      name={record.workerName}
                      size="xs"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {record.workerName}
                      </p>
                      <p className="truncate text-[0.6875rem] text-slate-500">
                        {[record.tradeName, record.skillName]
                          .filter(Boolean)
                          .join(" · ") || "No classification"}
                      </p>
                    </div>
                  </div>
                </td>
                {showDate ? (
                  <td className="px-3 py-2.5 tabular-nums">
                    {record.workDate}
                  </td>
                ) : null}
                {showProject ? (
                  <td className="px-3 py-2.5">{record.projectName}</td>
                ) : null}
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2 py-1 font-semibold",
                      attendanceTone(record.presenceStatus),
                    )}
                  >
                    {presenceLabel(record.presenceStatus)}
                  </span>
                </td>
                <td className="px-3 py-2.5">{liveLabel(record.liveStatus)}</td>
                <td className="px-3 py-2.5 tabular-nums">
                  {malaysiaTime(record.firstEntryAt)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {lastExitLabel(record)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMinutes(record.totalPayableMinutes)}
                </td>
                <td className="px-3 py-2.5 tabular-nums">
                  {formatMinutes(record.overtimeMinutes)}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 font-semibold",
                    record.quality === "VALID"
                      ? "text-emerald-700"
                      : "text-red-700",
                  )}
                >
                  {qualityLabel(record.quality)}
                </td>
                <td className="px-3 py-1">
                  <AttendanceRecordDetail record={record} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function AttendanceWorkerLedger({
  basePath,
  filters,
  monitor,
  projectId,
}: {
  basePath: string;
  filters: AttendanceMonitorFilters;
  monitor: DailyAttendanceMonitor;
  projectId?: string;
}) {
  const filtered = filterAttendanceRecords(monitor.records, filters);
  const paging = pagination(filters.page, filtered.length);
  const rows = filtered.slice(paging.start, paging.end);
  const showProject = monitor.projects.length > 1;
  return (
    <section
      className="mt-4 pb-24 md:pb-6"
      aria-labelledby="worker-records-title"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="worker-records-title" className="text-base font-semibold">
            Worker records
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {filtered.length} matching worker-day{" "}
            {filtered.length === 1 ? "record" : "records"}
          </p>
        </div>
      </div>
      <AttendanceFilterToolbar
        basePath={basePath}
        date={monitor.workDate}
        filters={filters}
        projectId={projectId}
        view="day"
      />
      {rows.length > 0 ? (
        <WorkerRows records={rows} showProject={showProject} />
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
          <CalendarDays
            className="mx-auto size-7 text-slate-400"
            aria-hidden="true"
          />
          <h3 className="mt-3 font-semibold">
            {monitor.records.length === 0
              ? "No expected workers"
              : "No worker records match"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {monitor.records.length === 0
              ? "No workers have an effective assignment and active employment period for this scope and date."
              : "Clear the search or choose another attendance filter."}
          </p>
        </div>
      )}
      <AttendancePagination
        basePath={basePath}
        current={paging.current}
        filters={filters}
        pages={paging.pages}
        routeState={{ date: monitor.workDate, project: projectId, view: "day" }}
      />
    </section>
  );
}

export function AttendanceRecordsSummary({
  monitor,
}: {
  monitor: MonthlyAttendanceMonitor;
}) {
  const summary = monitor.summary;
  return (
    <section
      aria-label="Monthly attendance summary"
      className="mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-4 xl:grid-cols-8"
    >
      {[
        ["Expected worker-days", summary.expected],
        ["Present", summary.present],
        [
          summary.noEntryYet > 0 ? "Absent / no entry" : "Absent",
          summary.absent + summary.noEntryYet,
        ],
        ["Approved leave", summary.approvedLeave],
        ["Valid time", formatMinutes(summary.totalPayableMinutes)],
        ["Overtime", formatMinutes(summary.overtimeMinutes)],
        ["Need attention", summary.recordsWithIssues],
        ["Off-day worked", summary.offDayWorking],
      ].map(([label, value], index) => (
        <div
          key={String(label)}
          className={cn(
            "min-h-20 border-b border-r border-slate-200 p-3",
            index % 2 === 1 && "border-r-0 sm:border-r",
            index >= 6 && "border-b-0",
          )}
        >
          <p className="text-lg font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-[0.6875rem] text-slate-500">{label}</p>
        </div>
      ))}
    </section>
  );
}

function filterRollups(
  rollups: AttendanceWorkerMonthRollup[],
  filters: AttendanceMonitorFilters,
) {
  const query = filters.query?.trim().toLowerCase();
  return rollups.filter((rollup) => {
    const statusMatch =
      !filters.status ||
      filters.status === "all" ||
      (filters.status === "present" && rollup.presentDays > 0) ||
      (filters.status === "missing" &&
        rollup.absentDays + rollup.noEntryYetDays > 0) ||
      (filters.status === "leave" && rollup.approvedLeaveDays > 0) ||
      (filters.status === "issues" && rollup.recordsWithIssues > 0);
    return (
      statusMatch &&
      (!query ||
        rollup.workerName.toLowerCase().includes(query) ||
        rollup.projectName.toLowerCase().includes(query))
    );
  });
}

export function AttendanceRecordsTables({
  basePath,
  filters,
  monitor,
  projectId,
}: {
  basePath: string;
  filters: AttendanceMonitorFilters;
  monitor: MonthlyAttendanceMonitor;
  projectId?: string;
}) {
  const rollups = filterRollups(monitor.rollups, filters);
  const records = filterAttendanceRecords(monitor.records, filters);
  const rollupPaging = pagination(filters.workerPage, rollups.length);
  const rollupRows = rollups.slice(rollupPaging.start, rollupPaging.end);
  const paging = pagination(filters.page, records.length);
  const register = records.slice(paging.start, paging.end);
  const showProject = monitor.projects.length > 1;
  return (
    <div className="pb-24 md:pb-6">
      <AttendanceFilterToolbar
        basePath={basePath}
        filters={filters}
        month={monitor.month}
        projectId={projectId}
        view="month"
      />
      <section className="mt-4" aria-labelledby="monthly-worker-records">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="monthly-worker-records" className="text-base font-semibold">
              Worker monthly records
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {rollups.length} worker{" "}
              {rollups.length === 1 ? "summary" : "summaries"}
            </p>
          </div>
          {filters.worker ? (
            <Link
              href={monitorHref(basePath, {
                month: monitor.month,
                project: projectId,
                query: filters.query,
                status: filters.status,
                view: "month",
              })}
              className="text-xs font-semibold text-violet-700"
            >
              Show all workers
            </Link>
          ) : null}
        </div>
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
          {rollupRows.map((rollup) => (
            <Link
              key={`${rollup.projectId}:${rollup.workerId}:mobile`}
              href={monitorHref(basePath, {
                month: monitor.month,
                project: rollup.projectId,
                query: filters.query,
                status: filters.status,
                view: "month",
                worker: rollup.workerId,
              })}
              className="flex min-h-24 items-center gap-3 border-b border-slate-100 p-3 last:border-0"
            >
              <WorkerAvatar
                workerId={rollup.workerId}
                photoId={rollup.workerPhotoId}
                name={rollup.workerName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <p className="truncate text-sm font-semibold">
                    {rollup.workerName}
                  </p>
                  <p className="shrink-0 text-xs font-semibold text-emerald-700">
                    {rollup.presentDays} present
                  </p>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {showProject ? `${rollup.projectName} · ` : ""}
                  {rollup.absentDays} absent · {rollup.noEntryYetDays} no entry
                  · {rollup.approvedLeaveDays} leave
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  {formatMinutes(rollup.totalPayableMinutes)} ·{" "}
                  {formatMinutes(rollup.overtimeMinutes)} OT ·{" "}
                  {rollup.recordsWithIssues} issues
                </p>
              </div>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
        </div>
        <div className="mt-2 hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
          <table className="w-full min-w-[62rem] text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                {[
                  "Worker",
                  ...(showProject ? ["Project"] : []),
                  "Present",
                  "Absent",
                  "No entry",
                  "Leave",
                  "Off-day",
                  "Hours",
                  "OT",
                  "Issues",
                  "Details",
                ].map((label) => (
                  <th key={label} className="px-3 py-2.5 font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rollupRows.map((rollup) => (
                <tr key={`${rollup.projectId}:${rollup.workerId}`}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <WorkerAvatar
                        workerId={rollup.workerId}
                        photoId={rollup.workerPhotoId}
                        name={rollup.workerName}
                        size="xs"
                      />
                      <span className="font-semibold">{rollup.workerName}</span>
                    </div>
                  </td>
                  {showProject ? (
                    <td className="px-3 py-2.5">{rollup.projectName}</td>
                  ) : null}
                  <td className="px-3 py-2.5 tabular-nums text-emerald-700">
                    {rollup.presentDays}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-red-700">
                    {rollup.absentDays}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-amber-800">
                    {rollup.noEntryYetDays}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-blue-700">
                    {rollup.approvedLeaveDays}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {rollup.offDayWorkedDays}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {formatMinutes(rollup.totalPayableMinutes)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums">
                    {formatMinutes(rollup.overtimeMinutes)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2.5 font-semibold tabular-nums",
                      rollup.recordsWithIssues > 0 && "text-red-700",
                    )}
                  >
                    {rollup.recordsWithIssues}
                  </td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={monitorHref(basePath, {
                        month: monitor.month,
                        project: rollup.projectId,
                        query: filters.query,
                        status: filters.status,
                        view: "month",
                        worker: rollup.workerId,
                      })}
                      className="font-semibold text-violet-700 hover:underline"
                    >
                      View days
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rollups.length === 0 ? (
          <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            No monthly worker records match these filters.
          </div>
        ) : null}
        <AttendancePagination
          basePath={basePath}
          current={rollupPaging.current}
          filters={filters}
          pageKey="workerPage"
          pages={rollupPaging.pages}
          routeState={{
            month: monitor.month,
            project: projectId,
            view: "month",
          }}
        />
      </section>
      <section className="mt-5" aria-labelledby="daily-register">
        <div>
          <h2 id="daily-register" className="text-base font-semibold">
            Daily register
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {records.length} worker-day{" "}
            {records.length === 1 ? "record" : "records"}
            {filters.worker ? " for the selected worker" : ""}
          </p>
        </div>
        {register.length > 0 ? (
          <WorkerRows records={register} showDate showProject={showProject} />
        ) : (
          <div className="mt-2 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <BriefcaseBusiness
              className="mx-auto size-7 text-slate-400"
              aria-hidden="true"
            />
            <p className="mt-2 text-sm text-slate-500">
              There are no expected worker-days or recorded off-day work in this
              month for the selected filters.
            </p>
          </div>
        )}
        <AttendancePagination
          basePath={basePath}
          current={paging.current}
          filters={filters}
          pages={paging.pages}
          routeState={{
            month: monitor.month,
            project: projectId,
            view: "month",
          }}
        />
      </section>
    </div>
  );
}

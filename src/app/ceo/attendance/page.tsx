import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Search,
} from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { WorkerAvatar } from "@/components/worker-avatar";
import { PageHeader } from "@/components/operations/page-header";
import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { formatMinutes } from "@/lib/phase4/calculations";
import {
  getAttendanceMonthRows,
  getAttendanceSnapshot,
  listAttendanceProjects,
} from "@/lib/phase4/data";
import { cn } from "@/lib/utils";

const MONTH_PAGE_SIZE = 50;

function currentMonth() {
  return malaysiaDateInputValue().slice(0, 7);
}

export default async function CeoAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    month?: string;
    page?: string;
    project?: string;
    query?: string;
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const projects = await listAttendanceProjects();
  const projectId = projects.some((project) => project.id === params.project)
    ? (params.project as string)
    : projects[0]?.id;
  const workDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "")
    ? (params.date as string)
    : malaysiaDateInputValue();
  const month = /^\d{4}-\d{2}$/.test(params.month ?? "")
    ? (params.month as string)
    : currentMonth();
  const view = params.view === "month" ? "month" : "day";
  const snapshot =
    projectId && view === "day"
      ? await getAttendanceSnapshot(projectId, workDate)
      : null;
  const allMonthRows =
    projectId && view === "month"
      ? await getAttendanceMonthRows(projectId, month)
      : [];
  const query = params.query?.trim().toLowerCase();
  const filteredMonthRows = allMonthRows.filter(
    (row) => !query || row.workerName.toLowerCase().includes(query),
  );
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageCount = Math.max(
    1,
    Math.ceil(filteredMonthRows.length / MONTH_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const monthRows = filteredMonthRows.slice(
    (currentPage - 1) * MONTH_PAGE_SIZE,
    currentPage * MONTH_PAGE_SIZE,
  );
  const pageHref = (target: number) => {
    const queryParams = new URLSearchParams();
    queryParams.set("view", "month");
    if (projectId) queryParams.set("project", projectId);
    queryParams.set("month", month);
    if (params.query) queryParams.set("query", params.query);
    queryParams.set("page", String(target));
    return `/ceo/attendance?${queryParams.toString()}`;
  };
  const exceptionRows = allMonthRows.filter(
    (row) => row.exceptionCount > 0,
  ).length;

  return (
    <main>
      <div>
        <PageHeader
          title="Attendance"
          description="Review daily records, payable time, and exceptions."
        />

        <form className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1.4fr_1fr_auto]">
          <input type="hidden" name="view" value={view} />
          <label className="text-xs font-semibold text-slate-600">
            Project
            <select
              name="project"
              defaultValue={projectId}
              className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            {view === "day" ? "Date" : "Month"}
            <input
              name={view === "day" ? "date" : "month"}
              type={view === "day" ? "date" : "month"}
              defaultValue={view === "day" ? workDate : month}
              className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
            />
          </label>
          <FormSubmitButton
            pendingLabel="Loading attendance…"
            className="h-10 self-end bg-violet-700 px-4 text-sm font-semibold text-white"
          >
            Show attendance
          </FormSubmitButton>
        </form>

        <div className="mt-3 flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
          <Link
            href={`/ceo/attendance?view=day&project=${projectId ?? ""}&date=${workDate}`}
            className={cn(
              "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:flex-none",
              view === "day"
                ? "bg-white text-violet-800 shadow-sm"
                : "text-slate-600",
            )}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Daily
          </Link>
          <Link
            href={`/ceo/attendance?view=month&project=${projectId ?? ""}&month=${month}`}
            className={cn(
              "inline-flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold sm:flex-none",
              view === "month"
                ? "bg-white text-violet-800 shadow-sm"
                : "text-slate-600",
            )}
          >
            <Clock3 className="size-4" aria-hidden="true" />
            Monthly
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="m-5 border border-dashed border-violet-100 bg-white p-10 text-center sm:m-8">
          <CalendarDays
            className="mx-auto size-8 text-slate-400"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold">No active project</h2>
          <p className="mt-2 text-sm text-slate-500">
            Create or reactivate a project before recording attendance.
          </p>
        </div>
      ) : view === "day" ? (
        <div className="mt-4 pb-4">
          <AttendanceWorkspace initialSnapshot={snapshot} mode="CEO" />
        </div>
      ) : (
        <section className="pt-4">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="border-r border-slate-200 p-2.5 sm:p-3">
              <CheckCircle2
                className="size-5 text-emerald-700"
                aria-hidden="true"
              />
              <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                {allMonthRows.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Recorded worker-days
              </p>
            </div>
            <div className="border-r border-slate-200 p-2.5 sm:p-3">
              <AlertTriangle
                className="size-5 text-red-700"
                aria-hidden="true"
              />
              <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                {exceptionRows}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Days needing correction
              </p>
            </div>
            <div className="p-2.5 sm:p-3">
              <Clock3 className="size-5 text-violet-700" aria-hidden="true" />
              <p className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">
                {formatMinutes(
                  allMonthRows.reduce(
                    (total, row) => total + row.totalMinutes,
                    0,
                  ),
                )}
              </p>
              <p className="mt-1 text-xs text-slate-500">Valid payable time</p>
            </div>
          </div>

          <form className="mt-4">
            <input type="hidden" name="view" value="month" />
            <input type="hidden" name="project" value={projectId} />
            <input type="hidden" name="month" value={month} />
            <label className="relative block max-w-md">
              <span className="sr-only">Search workers</span>
              <Search
                className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                name="query"
                defaultValue={params.query}
                placeholder="Search worker…"
                className="h-11 w-full border border-violet-100 bg-white pl-10 pr-3 text-sm"
              />
            </label>
          </form>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
            {monthRows.map((row) => (
              <details
                key={`${row.date}:${row.workerId}:mobile`}
                className="group border-b border-slate-200 last:border-0"
              >
                <summary className="flex min-h-20 cursor-pointer list-none items-center gap-3 px-3 py-2.5">
                  <WorkerAvatar
                    workerId={row.workerId}
                    photoId={row.workerPhotoId}
                    name={row.workerName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {row.workerName}
                      </p>
                      <span
                        className={cn(
                          "shrink-0 text-xs font-semibold",
                          row.status === "LEAVE"
                            ? "text-blue-700"
                            : row.exceptionCount > 0
                              ? "text-red-700"
                              : "text-emerald-700",
                        )}
                      >
                        {row.status === "LEAVE"
                          ? "On leave"
                          : row.exceptionCount > 0
                            ? "Needs correction"
                            : "Complete"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs tabular-nums text-slate-500">
                      {row.date} · {formatMinutes(row.totalMinutes)} payable
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-90"
                    aria-hidden="true"
                  />
                </summary>
                <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 p-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Normal</dt>
                    <dd className="mt-1 font-semibold">
                      {formatMinutes(row.normalMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">After 5 PM</dt>
                    <dd className="mt-1 font-semibold">
                      {formatMinutes(row.overtimeMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Sunday</dt>
                    <dd className="mt-1 font-semibold">
                      {formatMinutes(row.sundayMinutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Public holiday</dt>
                    <dd className="mt-1 font-semibold">
                      {formatMinutes(row.publicHolidayMinutes)}
                    </dd>
                  </div>
                </dl>
                {row.status === "LEAVE" ? (
                  <p className="mt-3 text-xs text-blue-700">
                    Approved leave · {row.leaveTypeName}
                  </p>
                ) : null}
                <Link
                  href={`/ceo/attendance?view=day&project=${projectId}&date=${row.date}`}
                  className="m-3 mt-0 inline-flex min-h-10 items-center justify-center rounded-lg bg-violet-50 px-4 text-sm font-semibold text-violet-800"
                >
                  Inspect day
                </Link>
              </details>
            ))}
            {monthRows.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-violet-200 bg-white px-5 py-10 text-center text-sm text-slate-500">
                No recorded attendance matches this month and search.
              </p>
            ) : null}
          </div>

          <div className="mt-4 hidden overflow-x-auto border border-violet-100 bg-white md:block">
            <table className="w-full min-w-[54rem] text-left text-sm">
              <thead className="border-b border-violet-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Worker</th>
                  <th className="px-4 py-3 font-semibold">Normal</th>
                  <th className="px-4 py-3 font-semibold">After 5 PM</th>
                  <th className="px-4 py-3 font-semibold">Sunday</th>
                  <th className="px-4 py-3 font-semibold">Public holiday</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthRows.map((row) => (
                  <tr key={`${row.date}:${row.workerId}`}>
                    <td className="px-4 py-3 tabular-nums">{row.date}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <WorkerAvatar
                          workerId={row.workerId}
                          photoId={row.workerPhotoId}
                          name={row.workerName}
                          size="xs"
                        />
                        <span className="font-semibold">{row.workerName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {formatMinutes(row.normalMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMinutes(row.overtimeMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMinutes(row.sundayMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMinutes(row.publicHolidayMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex border px-2 py-1 text-xs font-semibold",
                          row.status === "LEAVE"
                            ? "border-blue-200 bg-blue-50 text-blue-800"
                            : row.exceptionCount > 0
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800",
                        )}
                      >
                        {row.status === "LEAVE"
                          ? `Approved leave · ${row.leaveTypeName}`
                          : row.exceptionCount > 0
                            ? "Needs correction"
                            : "Complete"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/ceo/attendance?view=day&project=${projectId}&date=${row.date}`}
                        className="font-semibold text-amber-800 underline-offset-4 hover:underline"
                      >
                        Inspect day
                      </Link>
                    </td>
                  </tr>
                ))}
                {monthRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-12 text-center text-slate-500"
                    >
                      No recorded attendance matches this month and search.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {pageCount > 1 ? (
            <nav
              aria-label="Monthly attendance pages"
              className="mt-4 flex items-center justify-between"
            >
              <p className="text-xs text-slate-500">
                Page {currentPage} of {pageCount} · {filteredMonthRows.length}{" "}
                records
              </p>
              <div className="flex gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={pageHref(currentPage - 1)}
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                  >
                    Previous
                  </Link>
                ) : null}
                {currentPage < pageCount ? (
                  <Link
                    href={pageHref(currentPage + 1)}
                    className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                  >
                    Next
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </section>
      )}
    </main>
  );
}

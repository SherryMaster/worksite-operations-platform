import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
} from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { AttendanceWorkspace } from "@/components/phase4/attendance-workspace";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { formatMinutes } from "@/lib/phase4/calculations";
import {
  getAttendanceMonthRows,
  getAttendanceSnapshot,
  getAttendanceSyncExceptions,
  listAttendanceProjects,
} from "@/lib/phase4/data";
import { cn } from "@/lib/utils";

function currentMonth() {
  return malaysiaDateInputValue().slice(0, 7);
}

export default async function CeoAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string;
    month?: string;
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
  const monthRows = allMonthRows.filter(
    (row) => !query || row.workerName.toLowerCase().includes(query),
  );
  const exceptionRows = allMonthRows.filter(
    (row) => row.exceptionCount > 0,
  ).length;
  const syncExceptions = projectId
    ? await getAttendanceSyncExceptions(projectId)
    : [];

  return (
    <main>
      <div className="px-5 pt-8 sm:px-8 lg:pt-10">
        <div className="border-b border-violet-100 pb-7">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
            Company attendance
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
            Worksite time
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Review daily attendance, payable minute categories, incomplete
            records, and permanent corrections across every project. Attendance
            has no separate approval step.
          </p>
        </div>

        <form className="mt-5 grid gap-3 border border-violet-100 bg-white p-4 lg:grid-cols-[1.4fr_1fr_auto]">
          <input type="hidden" name="view" value={view} />
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Project
            <select
              name="project"
              defaultValue={projectId}
              className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            {view === "day" ? "Date" : "Month"}
            <input
              name={view === "day" ? "date" : "month"}
              type={view === "day" ? "date" : "month"}
              defaultValue={view === "day" ? workDate : month}
              className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
            />
          </label>
          <FormSubmitButton
            pendingLabel="Loading attendance…"
            className="min-h-11 self-end bg-violet-700 px-5 text-sm font-semibold text-white"
          >
            Show attendance
          </FormSubmitButton>
        </form>

        <div className="mt-3 flex gap-2">
          <Link
            href={`/ceo/attendance?view=day&project=${projectId ?? ""}&date=${workDate}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold",
              view === "day"
                ? "border-violet-950 bg-violet-950 text-white"
                : "border-violet-100 bg-white",
            )}
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Daily
          </Link>
          <Link
            href={`/ceo/attendance?view=month&project=${projectId ?? ""}&month=${month}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 border px-4 text-sm font-semibold",
              view === "month"
                ? "border-violet-950 bg-violet-950 text-white"
                : "border-violet-100 bg-white",
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
        <div className="mx-auto mt-1 max-w-3xl pb-10">
          {syncExceptions.length > 0 ? (
            <details className="mx-4 mt-5 border border-red-200 bg-red-50 p-4 sm:mx-6">
              <summary className="cursor-pointer text-sm font-semibold text-red-900">
                {syncExceptions.length} synchronized{" "}
                {syncExceptions.length === 1 ? "action needs" : "actions need"}{" "}
                review
              </summary>
              <ol className="mt-3 divide-y divide-red-100 text-xs text-red-950">
                {syncExceptions.map((exception) => (
                  <li key={exception.client_action_id} className="py-3">
                    <p className="font-semibold">
                      {exception.action_type.replaceAll("_", " ").toLowerCase()}{" "}
                      · {exception.status.toLowerCase()}
                    </p>
                    <p className="mt-1">{exception.message}</p>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          <AttendanceWorkspace initialSnapshot={snapshot} mode="CEO" />
        </div>
      ) : (
        <section className="px-5 pb-10 pt-6 sm:px-8">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="border border-violet-100 bg-white p-4">
              <CheckCircle2
                className="size-5 text-emerald-700"
                aria-hidden="true"
              />
              <p className="mt-4 text-3xl font-semibold">
                {allMonthRows.length}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                Recorded worker-days
              </p>
            </div>
            <div className="border border-violet-100 bg-white p-4">
              <AlertTriangle
                className="size-5 text-red-700"
                aria-hidden="true"
              />
              <p className="mt-4 text-3xl font-semibold">{exceptionRows}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                Days needing correction
              </p>
            </div>
            <div className="border border-violet-100 bg-white p-4">
              <Clock3 className="size-5 text-violet-700" aria-hidden="true" />
              <p className="mt-4 text-3xl font-semibold">
                {formatMinutes(
                  allMonthRows.reduce(
                    (total, row) => total + row.totalMinutes,
                    0,
                  ),
                )}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">
                Valid payable time
              </p>
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

          <div className="mt-4 grid gap-3 md:hidden">
            {monthRows.map((row) => (
              <article
                key={`${row.date}:${row.workerId}:mobile`}
                className="border border-violet-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.workerName}</p>
                    <p className="mt-1 text-xs tabular-nums text-slate-500">
                      {row.date}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                      row.status === "LEAVE"
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : row.exceptionCount > 0
                          ? "border-red-200 bg-red-50 text-red-800"
                          : "border-emerald-200 bg-emerald-50 text-emerald-800",
                    )}
                  >
                    {row.status === "LEAVE"
                      ? "On leave"
                      : row.exceptionCount > 0
                        ? "Needs correction"
                        : "Complete"}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
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
                  className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-violet-50 px-4 text-sm font-semibold text-violet-800"
                >
                  Inspect day
                </Link>
              </article>
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
                    <td className="px-4 py-3 font-semibold">
                      {row.workerName}
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
        </section>
      )}
    </main>
  );
}

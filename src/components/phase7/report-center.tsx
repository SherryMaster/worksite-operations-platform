import { BarChart3, Download, FileSearch, Filter, Sheet } from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { listAttendanceProjects } from "@/lib/phase4/data";
import { listWorkers } from "@/lib/phase3/data";
import {
  reportDefinitions,
  reportsForRole,
  type ReportRole,
} from "@/lib/phase7/report-definitions";
import { loadReport } from "@/lib/phase7/reports";
import { parseReportRequest } from "@/lib/phase7/validation";

type SearchValues = Record<string, string | string[] | undefined>;

function currentMonth() {
  return new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  })
    .format(new Date())
    .slice(0, 7);
}

function currentDate() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).format(new Date());
}

function exportHref(reportId: string, values: SearchValues) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (key === "report") return;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) query.set(key, single);
  });
  return `/api/reports/${reportId}/export?${query.toString()}`;
}

function reportDescription(reportId: string) {
  return reportDefinitions.find((item) => item.id === reportId)?.description;
}

export async function ReportCenter({
  role,
  searchParams,
}: {
  role: ReportRole;
  searchParams: SearchValues;
}) {
  const parsed = parseReportRequest(
    typeof searchParams.report === "string" ? searchParams.report : undefined,
    role,
    searchParams,
  );
  const [report, projects, workers] = await Promise.all([
    loadReport(parsed.reportId, parsed.filters),
    listAttendanceProjects(),
    listWorkers(),
  ]);
  const permittedReports = reportsForRole(role);
  const usesProject = !["audit-activity"].includes(parsed.reportId);
  const usesWorker = ![
    "project-workforce",
    "attendance-exceptions",
    "audit-activity",
  ].includes(parsed.reportId);
  const usesDate = parsed.reportId === "daily-attendance";
  const usesMonth = [
    "monthly-attendance",
    "attendance-exceptions",
    "payroll-adjustments",
    "payment-status",
  ].includes(parsed.reportId);
  const usesRange = ["leave", "worker-history", "audit-activity"].includes(
    parsed.reportId,
  );
  const usesStatus = [
    "current-workforce",
    "project-workforce",
    "leave",
    "payroll-adjustments",
    "payment-status",
  ].includes(parsed.reportId);
  const previewRows = report.rows.slice(0, 100);
  const previewLimited = report.rows.length > previewRows.length;

  return (
    <main className="px-4 py-7 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-violet-100 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
            Operational visibility
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold uppercase leading-none sm:text-6xl">
            Reports Center
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Choose a predefined report, narrow it to the work you need, and
            download the same filtered rows as an Excel workbook.
          </p>
        </div>
        {role === "CEO" ? (
          <Link
            href="/ceo/imports"
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-violet-950 bg-white px-4 text-sm font-semibold hover:bg-violet-50"
          >
            <Sheet className="size-4" aria-hidden="true" />
            Open Import Center
          </Link>
        ) : null}
      </div>

      <form
        className="mt-6 grid gap-4 border border-violet-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-4"
        action={role === "CEO" ? "/ceo/reports" : "/foreman/reports"}
      >
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 md:col-span-2">
          Report
          <select
            name="report"
            defaultValue={parsed.reportId}
            className="mt-2 h-11 w-full border border-violet-100 bg-white px-3 text-sm font-medium normal-case tracking-normal"
          >
            {permittedReports.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 md:col-span-2">
          Search within results
          <input
            name="query"
            defaultValue={parsed.filters.query}
            placeholder="Worker, project, status, reference…"
            className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-normal normal-case tracking-normal"
          />
        </label>

        {usesProject ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Project
            <select
              name="projectId"
              defaultValue={parsed.filters.projectId ?? ""}
              className="mt-2 h-11 w-full border border-violet-100 bg-white px-3 text-sm font-medium normal-case tracking-normal"
            >
              <option value="">All accessible projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {usesWorker ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Worker
            <select
              name="workerId"
              defaultValue={parsed.filters.workerId ?? ""}
              className="mt-2 h-11 w-full border border-violet-100 bg-white px-3 text-sm font-medium normal-case tracking-normal"
            >
              <option value="">All accessible workers</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.legal_name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {usesDate ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Work date
            <input
              name="date"
              type="date"
              defaultValue={parsed.filters.date ?? currentDate()}
              className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
            />
          </label>
        ) : null}

        {usesMonth ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Month
            <input
              name="month"
              type="month"
              defaultValue={parsed.filters.month ?? currentMonth()}
              className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
            />
          </label>
        ) : null}

        {usesRange ? (
          <>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              From date
              <input
                name="dateFrom"
                type="date"
                defaultValue={parsed.filters.dateFrom}
                className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
              />
            </label>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              To date
              <input
                name="dateTo"
                type="date"
                defaultValue={parsed.filters.dateTo}
                className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-medium normal-case tracking-normal"
              />
            </label>
          </>
        ) : null}

        {parsed.reportId === "audit-activity" ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Changed by
            <input
              name="actor"
              defaultValue={parsed.filters.actor}
              placeholder="Person’s name…"
              className="mt-2 h-11 w-full border border-violet-100 px-3 text-sm font-normal normal-case tracking-normal"
            />
          </label>
        ) : null}

        {usesStatus ? (
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Status
            <select
              name="status"
              defaultValue={parsed.filters.status ?? ""}
              className="mt-2 h-11 w-full border border-violet-100 bg-white px-3 text-sm font-medium normal-case tracking-normal"
            >
              <option value="">All statuses</option>
              {parsed.reportId === "leave" ? (
                <>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </>
              ) : parsed.reportId === "payment-status" ? (
                <>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PAID">Paid</option>
                </>
              ) : parsed.reportId === "payroll-adjustments" ? (
                <>
                  <option value="DRAFT">Draft</option>
                  <option value="NEEDS_REVIEW">Needs review</option>
                  <option value="APPROVED">Approved</option>
                </>
              ) : parsed.reportId === "project-workforce" ? (
                <>
                  <option value="PLANNED">Planned</option>
                  <option value="ACTIVE">Active</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="ARCHIVED">Archived</option>
                </>
              ) : (
                <>
                  <option value="ACTIVE">Active</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="LEFT_COMPANY">Left company</option>
                  <option value="ARCHIVED">Archived</option>
                </>
              )}
            </select>
          </label>
        ) : null}

        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-1">
          <FormSubmitButton
            pendingLabel="Loading report…"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-violet-700 px-5 text-sm font-semibold text-white"
          >
            <Filter className="size-4" aria-hidden="true" />
            Show Report
          </FormSubmitButton>
          <Link
            href={role === "CEO" ? "/ceo/reports" : "/foreman/reports"}
            className="inline-flex min-h-11 items-center border border-violet-100 px-4 text-sm font-semibold"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="mt-6" aria-labelledby="report-result-title">
        <div className="flex flex-col gap-4 border-b border-violet-100 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              {report.rows.length} {report.rows.length === 1 ? "row" : "rows"}
            </p>
            <h2
              id="report-result-title"
              className="mt-1 font-heading text-2xl font-semibold uppercase sm:text-3xl"
            >
              {report.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              {reportDescription(report.reportId)}
            </p>
          </div>
          <a
            href={exportHref(report.reportId, searchParams)}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800"
          >
            <Download className="size-4" aria-hidden="true" />
            Download Excel
          </a>
        </div>

        {report.truncated ? (
          <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            This view reached the 5,000-row safety limit. Narrow the filters
            before exporting.
          </p>
        ) : null}

        {previewLimited ? (
          <p className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-950">
            Showing the first 100 of {report.rows.length.toLocaleString()} rows
            to keep this preview responsive. Narrow the filters or download the
            Excel file to review every row.
          </p>
        ) : null}

        {report.rows.length === 0 ? (
          <div className="mt-4 border border-dashed border-violet-100 bg-white px-6 py-14 text-center">
            <FileSearch
              className="mx-auto size-8 text-slate-300"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-heading text-xl font-semibold uppercase">
              No matching records
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a wider date range or clear one of the filters.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto border border-violet-100 bg-white md:block">
              <table className="w-full min-w-max border-collapse text-left text-sm">
                <thead className="bg-violet-950 text-white">
                  <tr>
                    {report.columns.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className="border-r border-violet-700 px-3 py-3 text-xs font-semibold uppercase tracking-wider last:border-r-0"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {previewRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="align-top">
                      {report.columns.map((column) => (
                        <td
                          key={column.key}
                          className="max-w-80 whitespace-pre-wrap px-3 py-3 text-slate-700"
                        >
                          {row[column.key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ol className="mt-4 space-y-3 md:hidden">
              {previewRows.map((row, rowIndex) => (
                <li
                  key={rowIndex}
                  className="border border-violet-100 bg-white p-4"
                >
                  <BarChart3
                    className="size-4 text-violet-700"
                    aria-hidden="true"
                  />
                  <dl className="mt-3 grid gap-3">
                    {report.columns.map((column) => (
                      <div key={column.key}>
                        <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                          {column.label}
                        </dt>
                        <dd className="mt-1 break-words text-sm text-slate-900">
                          {row[column.key] ?? "—"}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}

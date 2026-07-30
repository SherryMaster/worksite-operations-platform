import { Download, FileSearch, Filter } from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { DataViewToolbar } from "@/components/operations/data-view-toolbar";
import { PageHeader } from "@/components/operations/page-header";
import { ReportDesktopTable } from "@/components/phase7/report-desktop-table";
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
const REPORT_PAGE_SIZE = 50;

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
  const requestedPage = Number(
    typeof searchParams.page === "string" ? searchParams.page : "1",
  );
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageCount = Math.max(
    1,
    Math.ceil(report.rows.length / REPORT_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const previewRows = report.rows.slice(
    (currentPage - 1) * REPORT_PAGE_SIZE,
    currentPage * REPORT_PAGE_SIZE,
  );
  const previewLimited = report.rows.length > previewRows.length;
  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      const single = Array.isArray(value) ? value[0] : value;
      if (single) query.set(key, single);
    });
    query.set("page", String(target));
    return `${role === "CEO" ? "/ceo/reports" : "/foreman/reports"}?${query.toString()}`;
  };

  return (
    <main>
      <PageHeader
        title="Reports"
        description="Browse predefined operational reports and export the filtered results."
      />

      <form
        className="mt-4"
        action={role === "CEO" ? "/ceo/reports" : "/foreman/reports"}
      >
        <DataViewToolbar
          action={role === "CEO" ? "/ceo/reports" : "/foreman/reports"}
          searchName="query"
          searchDefaultValue={parsed.filters.query}
          searchPlaceholder="Search within results"
          filterTitle="Report options"
        >
          <label className="min-w-56 text-xs font-semibold text-slate-600">
            <span className="sr-only">Report</span>
            <select
              name="report"
              defaultValue={parsed.reportId}
              className="h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              {permittedReports.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          {usesProject ? (
            <label className="min-w-40 text-xs font-semibold text-slate-600">
              <span className="sr-only">Project</span>
              <select
                name="projectId"
                defaultValue={parsed.filters.projectId ?? ""}
                className="h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
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
            <label className="min-w-40 text-xs font-semibold text-slate-600">
              <span className="sr-only">Worker</span>
              <select
                name="workerId"
                defaultValue={parsed.filters.workerId ?? ""}
                className="h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
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
            <label className="text-xs font-semibold text-slate-600">
              Work date
              <input
                name="date"
                type="date"
                defaultValue={parsed.filters.date ?? currentDate()}
                className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
              />
            </label>
          ) : null}

          {usesMonth ? (
            <label className="text-xs font-semibold text-slate-600">
              Month
              <input
                name="month"
                type="month"
                defaultValue={parsed.filters.month ?? currentMonth()}
                className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
              />
            </label>
          ) : null}

          {usesRange ? (
            <>
              <label className="text-xs font-semibold text-slate-600">
                From date
                <input
                  name="dateFrom"
                  type="date"
                  defaultValue={parsed.filters.dateFrom}
                  className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
                />
              </label>
              <label className="text-xs font-semibold text-slate-600">
                To date
                <input
                  name="dateTo"
                  type="date"
                  defaultValue={parsed.filters.dateTo}
                  className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-medium"
                />
              </label>
            </>
          ) : null}

          {parsed.reportId === "audit-activity" ? (
            <label className="text-xs font-semibold text-slate-600">
              Changed by
              <input
                name="actor"
                defaultValue={parsed.filters.actor}
                placeholder="Person’s name…"
                className="mt-1 h-10 w-full border border-slate-200 px-3 text-sm font-normal"
              />
            </label>
          ) : null}

          {usesStatus ? (
            <label className="text-xs font-semibold text-slate-600">
              Status
              <select
                name="status"
                defaultValue={parsed.filters.status ?? ""}
                className="mt-1 h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
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
              className="inline-flex h-10 flex-1 items-center justify-center gap-2 bg-violet-700 px-4 text-sm font-semibold text-white"
            >
              <Filter className="size-4" aria-hidden="true" />
              Show report
            </FormSubmitButton>
            <Link
              href={role === "CEO" ? "/ceo/reports" : "/foreman/reports"}
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold"
            >
              Clear
            </Link>
          </div>
        </DataViewToolbar>
      </form>

      <section className="mt-4" aria-labelledby="report-result-title">
        <div className="flex items-end justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <p className="text-[0.6875rem] font-semibold text-violet-700">
              {report.rows.length} {report.rows.length === 1 ? "row" : "rows"}
            </p>
            <h2
              id="report-result-title"
              className="font-heading text-base font-semibold sm:text-lg"
            >
              {report.title}
            </h2>
            <p className="mt-1 hidden max-w-3xl text-sm text-slate-500 sm:block">
              {reportDescription(report.reportId)}
            </p>
          </div>
          <a
            href={exportHref(report.reportId, searchParams)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="size-4" aria-hidden="true" />
            Export
          </a>
        </div>

        {report.truncated ? (
          <p className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            This view reached the 5,000-row safety limit. Narrow the filters
            before exporting.
          </p>
        ) : null}

        {previewLimited ? (
          <p className="mt-3 border-l-2 border-violet-400 pl-3 text-xs text-slate-600">
            Showing page {currentPage} of {pageCount} ·{" "}
            {report.rows.length.toLocaleString()} total rows. Narrow the filters
            or download the Excel file to review every row.
          </p>
        ) : null}

        {report.rows.length === 0 ? (
          <div className="mt-4 border border-dashed border-violet-100 bg-white px-6 py-14 text-center">
            <FileSearch
              className="mx-auto size-8 text-slate-300"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-heading text-xl font-semibold">
              No matching records
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Try a wider date range or clear one of the filters.
            </p>
          </div>
        ) : (
          <>
            <ReportDesktopTable columns={report.columns} rows={previewRows} />

            <ol className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
              {previewRows.map((row, rowIndex) => (
                <li
                  key={rowIndex}
                  className="border-b border-slate-200 p-3 last:border-0"
                >
                  <dl>
                    {report.columns.slice(0, 1).map((column) => (
                      <div key={column.key}>
                        <dt className="sr-only">{column.label}</dt>
                        <dd className="truncate text-sm font-semibold text-slate-900">
                          {row[column.key] ?? "—"}
                        </dd>
                      </div>
                    ))}
                    <div className="mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      {report.columns.slice(1, 3).map((column) => (
                        <div key={column.key} className="min-w-0 truncate">
                          <dt className="sr-only">{column.label}</dt>
                          <dd className="truncate">{row[column.key] ?? "—"}</dd>
                        </div>
                      ))}
                    </div>
                  </dl>
                  {report.columns.length > 3 ? (
                    <details className="mt-2 border-t border-slate-100 pt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-violet-800">
                        More fields
                      </summary>
                      <dl className="mt-2 grid gap-2">
                        {report.columns.slice(3).map((column) => (
                          <div key={column.key}>
                            <dt className="text-[0.65rem] font-semibold text-slate-500">
                              {column.label}
                            </dt>
                            <dd className="mt-0.5 break-words text-sm text-slate-900">
                              {row[column.key] ?? "—"}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : null}
                </li>
              ))}
            </ol>
          </>
        )}

        {pageCount > 1 ? (
          <nav
            aria-label="Report pages"
            className="mt-4 flex items-center justify-between"
          >
            <p className="text-xs text-slate-500">
              Page {currentPage} of {pageCount}
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
    </main>
  );
}

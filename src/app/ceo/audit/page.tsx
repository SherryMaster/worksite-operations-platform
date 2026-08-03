import {
  CalendarDays,
  ChevronDown,
  ClipboardClock,
  Filter,
  History,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import { DataViewToolbar } from "@/components/operations/data-view-toolbar";
import { ListResultsSkeleton } from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { StatusChip } from "@/components/operations/status-chip";
import { presentAuditEntry } from "@/lib/phase2/audit";
import {
  findAuditActorIds,
  findAuditEntityIds,
  getAuditEntries,
  getAuditEntryCount,
} from "@/lib/phase2/data";
import { formatDateTime } from "@/lib/phase2/format";

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    area?: string;
    date?: string;
    page?: string;
    query?: string;
  }>;
}) {
  const params = await searchParams;
  const filtersActive = Boolean(
    params.actor || params.area || params.date || params.query,
  );
  const activeFilterCount = [params.actor, params.area, params.date].filter(
    Boolean,
  ).length;

  return (
    <main>
      <PageHeader
        icon={ShieldCheck}
        title="Audit log"
        description="Read company activity in plain language. Technical references stay collapsed."
      />

      <form action="/ceo/audit" className="mt-4">
        <DataViewToolbar
          action="/ceo/audit"
          searchDefaultValue={params.query}
          searchName="query"
          searchPlaceholder="Search activity"
          activeFilterCount={activeFilterCount}
          filterTitle="Filter activity"
        >
          <label className="relative block min-w-40 flex-1">
            <span className="sr-only">Changed by</span>
            <UserRound
              className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              name="actor"
              defaultValue={params.actor}
              placeholder="Person’s name…"
              autoComplete="off"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950"
            />
          </label>
          <label className="relative block min-w-36">
            <span className="sr-only">Area</span>
            <select
              name="area"
              defaultValue={params.area ?? ""}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-sm text-slate-950"
            >
              <option value="">All areas</option>
              <option value="projects">Projects</option>
              <option value="assignments">Foreman assignments</option>
              <option value="users">User accounts</option>
              <option value="categories">Trades & skills</option>
              <option value="settings">Company settings</option>
              <option value="workers">Workers</option>
              <option value="worker_assignments">Worker assignments</option>
              <option value="worker_rates">Worker rates</option>
              <option value="documents">Worker documents</option>
              <option value="attendance">Attendance</option>
              <option value="attendance_day_types">Attendance day types</option>
              <option value="leave">Leave</option>
              <option value="payroll">Payroll & payments</option>
              <option value="exports">Report exports</option>
              <option value="imports">Data imports</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-3 size-4 text-slate-500"
              aria-hidden="true"
            />
          </label>
          <label className="relative block min-w-40">
            <span className="sr-only">Date</span>
            <CalendarDays
              className="pointer-events-none absolute left-3 top-3 size-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              name="date"
              type="date"
              defaultValue={params.date}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-950"
            />
          </label>
          <FormSubmitButton
            pendingLabel="Applying…"
            className="inline-flex h-10 items-center justify-center gap-2 bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            <Filter className="size-4" aria-hidden="true" />
            Apply
          </FormSubmitButton>
          {filtersActive ? (
            <Link
              href="/ceo/audit"
              className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50"
            >
              Clear
            </Link>
          ) : null}
        </DataViewToolbar>
      </form>

      <Suspense
        key={JSON.stringify(params)}
        fallback={<ListResultsSkeleton columns={4} rows={9} />}
      >
        <AuditResults params={params} />
      </Suspense>
    </main>
  );
}

async function AuditResults({
  params,
}: {
  params: {
    actor?: string;
    area?: string;
    date?: string;
    page?: string;
    query?: string;
  };
}) {
  const query = params.query?.trim().toLowerCase();
  const actor = params.actor?.trim().toLowerCase();
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [actorIds, entityIds] = await Promise.all([
    findAuditActorIds(params.actor),
    findAuditEntityIds(params.query),
  ]);
  const databaseFilters = {
    actorIds,
    date: params.date,
    entityIds,
    module: params.area,
    query: params.query,
  };
  const [auditEntries, total] = await Promise.all([
    getAuditEntries(PAGE_SIZE, {
      ...databaseFilters,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getAuditEntryCount(databaseFilters),
  ]);
  const allEntries = auditEntries.map((entry) => ({
    ...entry,
    presentation: presentAuditEntry({
      action: entry.action,
      actorName: entry.actorName,
      afterData: entry.after_data,
      beforeData: entry.before_data,
      entityType: entry.entity_type,
      foremanName: entry.foremanName,
      module: entry.module,
      projectName: entry.projectName,
      source: entry.source,
      workerName: entry.workerName,
    }),
  }));
  const entries = allEntries.filter((entry) => {
    const searchableText = [
      entry.presentation.title,
      entry.presentation.summary,
      entry.presentation.area,
      entry.actorName,
      entry.workerName,
      entry.entity_id,
      entry.action,
    ]
      .join(" ")
      .toLowerCase();

    return (
      (!params.area || entry.module === params.area) &&
      (!actor || entry.actorName.toLowerCase().includes(actor)) &&
      (!query || searchableText.includes(query))
    );
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageHref = (target: number) => {
    const next = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    );
    next.set("page", String(target));
    return `/ceo/audit?${next.toString()}`;
  };

  return (
    <>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-600" aria-live="polite">
          Showing <strong className="text-slate-950">{entries.length}</strong>{" "}
          activities on this page · {total} total
        </p>
        <p className="hidden text-xs text-slate-500 sm:block">
          Times shown in Malaysia time
        </p>
      </div>

      <section className="mt-4">
        {entries.length === 0 ? (
          <div className="border border-dashed border-violet-100 bg-white px-6 py-16 text-center">
            <ClipboardClock
              className="mx-auto size-8 text-violet-700"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-heading text-2xl font-semibold">
              No matching activity
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try clearing a filter or searching for a broader term.
            </p>
          </div>
        ) : (
          <ol className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="border-b border-slate-200 p-3 last:border-0 sm:p-4"
              >
                <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:gap-4">
                  <div>
                    <time className="text-xs font-medium tabular-nums text-slate-500">
                      {formatDateTime(entry.occurred_at)}
                    </time>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {entry.presentation.source}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-pretty text-sm font-semibold text-slate-950">
                      {entry.presentation.title}
                    </h2>
                    <p className="mt-0.5 text-pretty text-sm leading-5 text-slate-600">
                      {entry.presentation.summary}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                      <UserRound className="size-3.5" aria-hidden="true" />
                      Changed by {entry.actorName}
                    </p>
                  </div>

                  <StatusChip className="h-fit w-fit">
                    {entry.presentation.area}
                  </StatusChip>
                </div>

                <details className="group mt-3 border-t border-slate-100 pt-3">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
                    <History className="size-4" aria-hidden="true" />
                    View change details
                    <ChevronDown
                      className="ml-1 size-4 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  {entry.presentation.changes.length > 0 ? (
                    <>
                      <dl className="mt-4 space-y-3 md:hidden">
                        {entry.presentation.changes.map((change) => (
                          <div
                            key={change.field}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <dt className="text-sm font-semibold text-slate-900">
                              {change.field}
                            </dt>
                            <dd className="mt-2 grid grid-cols-2 gap-3 text-sm">
                              <span className="min-w-0 break-words text-slate-500">
                                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider">
                                  Previous
                                </span>
                                {change.from ?? "—"}
                              </span>
                              <span className="min-w-0 break-words font-medium text-slate-950">
                                <span className="block text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">
                                  New
                                </span>
                                {change.to}
                              </span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <div className="mt-4 hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                          <thead>
                            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                              <th className="py-2 pr-4 font-semibold">Field</th>
                              <th className="px-4 py-2 font-semibold">
                                Previous
                              </th>
                              <th className="py-2 pl-4 font-semibold">New</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {entry.presentation.changes.map((change) => (
                              <tr key={change.field}>
                                <th className="py-3 pr-4 font-medium text-slate-700">
                                  {change.field}
                                </th>
                                <td className="break-words px-4 py-3 text-slate-500">
                                  {change.from ?? "—"}
                                </td>
                                <td className="break-words py-3 pl-4 font-medium text-slate-950">
                                  {change.to}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      No field-level details were recorded for this activity.
                    </p>
                  )}

                  <details className="mt-4 border-l-2 border-slate-200 pl-4 text-xs text-slate-500">
                    <summary className="cursor-pointer font-semibold text-slate-600">
                      Technical reference
                    </summary>
                    <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div>
                        <dt>Activity ID</dt>
                        <dd
                          className="mt-0.5 break-all font-mono"
                          translate="no"
                        >
                          {entry.id}
                        </dd>
                      </div>
                      <div>
                        <dt>Record ID</dt>
                        <dd
                          className="mt-0.5 break-all font-mono"
                          translate="no"
                        >
                          {entry.entity_id}
                        </dd>
                      </div>
                      <div>
                        <dt>Internal action</dt>
                        <dd className="mt-0.5 font-mono" translate="no">
                          {entry.action}
                        </dd>
                      </div>
                    </dl>
                  </details>
                </details>
              </li>
            ))}
          </ol>
        )}
      </section>

      {pageCount > 1 ? (
        <nav
          aria-label="Audit log pages"
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
    </>
  );
}

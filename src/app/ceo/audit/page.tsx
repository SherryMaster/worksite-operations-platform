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

import { presentAuditEntry } from "@/lib/phase2/audit";
import { getAuditEntries } from "@/lib/phase2/data";
import { formatDateTime } from "@/lib/phase2/format";

function malaysiaDateKey(timestamp: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    area?: string;
    date?: string;
    query?: string;
  }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim().toLowerCase();
  const actor = params.actor?.trim().toLowerCase();
  const allEntries = (await getAuditEntries()).map((entry) => ({
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
      (!query || searchableText.includes(query)) &&
      (!params.date || malaysiaDateKey(entry.occurred_at) === params.date)
    );
  });
  const filtersActive = Boolean(
    params.actor || params.area || params.date || params.query,
  );

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="border-b border-stone-300 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Company activity history
        </p>
        <h1 className="mt-3 text-balance font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Audit Log
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-stone-600">
          See who changed company records, what happened, and the values before
          and after each change. Technical references remain available when
          support needs them.
        </p>
      </div>

      <form
        action="/ceo/audit"
        className="mt-6 grid gap-4 border border-stone-300 bg-white p-4 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr_auto]"
      >
        <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Search Activity
          <input
            name="query"
            defaultValue={params.query}
            placeholder="Project, account, or change…"
            autoComplete="off"
            className="mt-2 h-11 w-full border border-stone-300 bg-stone-50 px-3 text-sm font-normal normal-case tracking-normal text-stone-950 focus-visible:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/20"
          />
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Changed By
          <span className="relative mt-2 block">
            <UserRound
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-stone-400"
              aria-hidden="true"
            />
            <input
              name="actor"
              defaultValue={params.actor}
              placeholder="Person’s name…"
              autoComplete="off"
              className="h-11 w-full border border-stone-300 bg-stone-50 pl-10 pr-3 text-sm font-normal normal-case tracking-normal text-stone-950 focus-visible:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/20"
            />
          </span>
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Area
          <span className="relative mt-2 block">
            <select
              name="area"
              defaultValue={params.area ?? ""}
              className="h-11 w-full appearance-none border border-stone-300 bg-stone-50 px-3 pr-10 text-sm font-normal normal-case tracking-normal text-stone-950 focus-visible:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/20"
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
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-3.5 size-4 text-stone-500"
              aria-hidden="true"
            />
          </span>
        </label>
        <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          Date
          <span className="relative mt-2 block">
            <CalendarDays
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-stone-400"
              aria-hidden="true"
            />
            <input
              name="date"
              type="date"
              defaultValue={params.date}
              className="h-11 w-full border border-stone-300 bg-stone-50 pl-10 pr-3 text-sm font-normal normal-case tracking-normal text-stone-950 focus-visible:border-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/20"
            />
          </span>
        </label>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="inline-flex h-11 flex-1 touch-manipulation items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
          >
            <Filter className="size-4" aria-hidden="true" />
            Apply Filters
          </button>
          {filtersActive ? (
            <Link
              href="/ceo/audit"
              className="inline-flex h-11 items-center border border-stone-300 px-4 text-sm font-semibold hover:border-stone-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-stone-600" aria-live="polite">
          Showing <strong className="text-stone-950">{entries.length}</strong>{" "}
          of {allEntries.length} recent activities
        </p>
        <p className="hidden text-xs text-stone-500 sm:block">
          Times shown in Malaysia time
        </p>
      </div>

      <section className="mt-4">
        {entries.length === 0 ? (
          <div className="border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
            <ClipboardClock
              className="mx-auto size-8 text-amber-700"
              aria-hidden="true"
            />
            <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
              No Matching Activity
            </h2>
            <p className="mt-2 text-sm text-stone-500">
              Try clearing a filter or searching for a broader term.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="border border-stone-300 bg-white p-5 sm:p-6"
              >
                <div className="grid gap-5 lg:grid-cols-[11rem_minmax(0,1fr)_auto]">
                  <div>
                    <time className="text-xs font-medium tabular-nums text-stone-500">
                      {formatDateTime(entry.occurred_at)}
                    </time>
                    <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <ShieldCheck className="size-3.5" aria-hidden="true" />
                      {entry.presentation.source}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-pretty text-lg font-semibold text-stone-950">
                      {entry.presentation.title}
                    </h2>
                    <p className="mt-1 text-pretty text-sm leading-6 text-stone-600">
                      {entry.presentation.summary}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-xs text-stone-500">
                      <UserRound className="size-3.5" aria-hidden="true" />
                      Changed by {entry.actorName}
                    </p>
                  </div>

                  <span className="h-fit w-fit border border-stone-200 bg-stone-50 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-stone-600">
                    {entry.presentation.area}
                  </span>
                </div>

                <details className="group mt-5 border-t border-stone-200 pt-4">
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600">
                    <History className="size-4" aria-hidden="true" />
                    View Change Details
                    <ChevronDown
                      className="ml-1 size-4 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>

                  {entry.presentation.changes.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
                            <th className="py-2 pr-4 font-semibold">Field</th>
                            <th className="px-4 py-2 font-semibold">
                              Previous
                            </th>
                            <th className="py-2 pl-4 font-semibold">New</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {entry.presentation.changes.map((change) => (
                            <tr key={change.field}>
                              <th className="py-3 pr-4 font-medium text-stone-700">
                                {change.field}
                              </th>
                              <td className="break-words px-4 py-3 text-stone-500">
                                {change.from ?? "—"}
                              </td>
                              <td className="break-words py-3 pl-4 font-medium text-stone-950">
                                {change.to}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-stone-500">
                      No field-level details were recorded for this activity.
                    </p>
                  )}

                  <details className="mt-4 border-l-2 border-stone-200 pl-4 text-xs text-stone-500">
                    <summary className="cursor-pointer font-semibold text-stone-600">
                      Technical Reference
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
    </main>
  );
}

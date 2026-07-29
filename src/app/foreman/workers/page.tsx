import { AlertTriangle, ArrowUpRight, Search, Users } from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  CompactRecord,
  CompactRecordList,
} from "@/components/operations/compact-record-list";
import { PageHeader } from "@/components/operations/page-header";
import { StatusChip } from "@/components/operations/status-chip";
import { listWorkersPage } from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";

export default async function ForemanWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; query?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const workers = await listWorkersPage({
    page,
    pageSize: 50,
    query: params.query,
  });
  const pageHref = (target: number) => {
    const query = new URLSearchParams();
    if (params.query) query.set("query", params.query);
    query.set("page", String(target));
    return `/foreman/workers?${query.toString()}`;
  };

  return (
    <main>
      <PageHeader
        eyebrow="Current project"
        title="Workers"
        description="Read-only details for workers currently assigned to your project."
      />

      <form action="/foreman/workers" className="relative mt-4 max-w-xl">
        <label>
          <span className="sr-only">Search current workers</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="query"
            defaultValue={params.query}
            placeholder="Search name, phone, or identity…"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-24 text-sm"
          />
        </label>
        <FormSubmitButton
          pendingLabel="Searching…"
          className="absolute right-1 top-1 h-9 bg-violet-700 px-4 text-sm font-semibold text-white"
        >
          Search
        </FormSubmitButton>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        <strong className="tabular-nums text-slate-950">{workers.total}</strong>{" "}
        assigned workers
      </p>

      {workers.items.length === 0 ? (
        <section className="mt-5 border border-dashed border-violet-100 bg-white px-5 py-14 text-center">
          <Users className="mx-auto size-7 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-xl font-semibold">
            No workers found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            No current assignment matches this search.
          </p>
        </section>
      ) : (
        <CompactRecordList label="Assigned workers" className="mt-3">
          {workers.items.map((worker) => (
            <CompactRecord
              key={worker.id}
              action={
                <ArrowUpRight
                  className="size-4 shrink-0 text-slate-400"
                  aria-hidden="true"
                />
              }
            >
              <Link
                href={`/foreman/workers/${worker.id}`}
                className="block rounded-md focus-visible:outline-none"
              >
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">
                    {worker.legal_name}
                  </p>
                  {["EXPIRED", "EXPIRING"].includes(worker.documentWarning) ? (
                    <StatusChip tone="warning">
                      <AlertTriangle
                        className="mr-1 size-3"
                        aria-hidden="true"
                      />
                      Document alert
                    </StatusChip>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {worker.tradeName ?? "No trade"} ·{" "}
                  {worker.skillName ?? "No skill level"} ·{" "}
                  {maskIdentifier(worker.cnic_number ?? worker.passport_number)}
                </p>
              </Link>
            </CompactRecord>
          ))}
        </CompactRecordList>
      )}

      {workers.pageCount > 1 ? (
        <nav
          aria-label="Worker pages"
          className="mt-4 flex items-center justify-between"
        >
          <p className="text-xs text-slate-500">
            Page {workers.page} of {workers.pageCount}
          </p>
          <div className="flex gap-2">
            {workers.page > 1 ? (
              <Link
                href={pageHref(workers.page - 1)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                Previous
              </Link>
            ) : null}
            {workers.page < workers.pageCount ? (
              <Link
                href={pageHref(workers.page + 1)}
                className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </main>
  );
}

import { AlertTriangle, ArrowUpRight, Search, Users } from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { listWorkers } from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";

export default async function ForemanWorkersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const workers = await listWorkers({ query: params.query });

  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-7">
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
        Current project
      </p>
      <h1 className="mt-2 font-heading text-4xl font-semibold uppercase leading-none">
        Workers
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Read-only details for workers currently assigned to your project.
      </p>

      <form action="/foreman/workers" className="relative mt-6">
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
            className="h-12 w-full border border-violet-100 bg-white pl-10 pr-24 text-sm"
          />
        </label>
        <FormSubmitButton
          pendingLabel="Searching…"
          className="absolute right-1 top-1 h-11 bg-violet-700 px-4 text-sm font-semibold text-white"
        >
          Search
        </FormSubmitButton>
      </form>

      {workers.length === 0 ? (
        <section className="mt-5 border border-dashed border-violet-100 bg-white px-5 py-14 text-center">
          <Users className="mx-auto size-7 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-xl font-semibold uppercase">
            No Workers Found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            No current assignment matches this search.
          </p>
        </section>
      ) : (
        <ol className="mt-5 space-y-3">
          {workers.map((worker) => (
            <li key={worker.id}>
              <Link
                href={`/foreman/workers/${worker.id}`}
                className="block border border-violet-100 bg-white p-4 active:bg-amber-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{worker.legal_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {worker.tradeName ?? "No trade"} ·{" "}
                      {worker.skillName ?? "No skill level"}
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3 text-xs">
                  <span className="text-slate-500">
                    {maskIdentifier(
                      worker.cnic_number ?? worker.passport_number,
                    )}
                  </span>
                  {["EXPIRED", "EXPIRING"].includes(worker.documentWarning) ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                      Document alert
                    </span>
                  ) : (
                    <span className="font-semibold text-emerald-700">
                      No document alert
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}

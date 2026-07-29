import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { getWorkerOptions, listWorkers } from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";

const PAGE_SIZE = 25;

function statusLabel(status: string | undefined) {
  return status
    ? status
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "No status";
}

export default async function WorkersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    project?: string;
    query?: string;
    skill?: string;
    status?: string;
    trade?: string;
  }>;
}) {
  const params = await searchParams;
  const [workers, options] = await Promise.all([
    listWorkers(params),
    getWorkerOptions(),
  ]);
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageCount = Math.max(1, Math.ceil(workers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleWorkers = workers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const queryParams = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  const pageHref = (target: number) => {
    queryParams.set("page", String(target));
    return `/ceo/workers?${queryParams.toString()}`;
  };

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-violet-100 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
            Controlled workforce
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
            Workers
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Search permanent worker identities, current assignments, employment
            state, and document warnings.
          </p>
        </div>
        <Link
          href="/ceo/workers/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-violet-700 px-5 text-sm font-semibold text-white hover:bg-violet-800"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Create Worker
        </Link>
      </div>

      <form
        action="/ceo/workers"
        className="mt-6 grid gap-3 border border-violet-100 bg-white p-4 md:grid-cols-2 xl:grid-cols-[1.5fr_repeat(4,1fr)_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search workers</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
            aria-hidden="true"
          />
          <input
            name="query"
            defaultValue={params.query}
            placeholder="Name, phone, CNIC, passport…"
            autoComplete="off"
            className="h-11 w-full border border-violet-100 bg-slate-50 pl-10 pr-3 text-sm"
          />
        </label>
        <select
          name="project"
          defaultValue={params.project ?? ""}
          aria-label="Filter by project"
          className="h-11 border border-violet-100 bg-slate-50 px-3 text-sm"
        >
          <option value="">All projects</option>
          {options.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          name="trade"
          defaultValue={params.trade ?? ""}
          aria-label="Filter by trade"
          className="h-11 border border-violet-100 bg-slate-50 px-3 text-sm"
        >
          <option value="">All trades</option>
          {options.trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
        <select
          name="skill"
          defaultValue={params.skill ?? ""}
          aria-label="Filter by skill"
          className="h-11 border border-violet-100 bg-slate-50 px-3 text-sm"
        >
          <option value="">All skills</option>
          {options.skills.map((skill) => (
            <option key={skill.id} value={skill.id}>
              {skill.name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          aria-label="Filter by employment status"
          className="h-11 border border-violet-100 bg-slate-50 px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="LEFT_COMPANY">Left Company</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <FormSubmitButton
          pendingLabel="Filtering…"
          className="h-11 bg-violet-700 px-5 text-sm font-semibold text-white"
        >
          Filter
        </FormSubmitButton>
      </form>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-slate-600">
          <strong className="text-slate-950">{workers.length}</strong> matching
          workers
        </p>
        <p className="text-xs text-slate-500">
          Page {currentPage} of {pageCount}
        </p>
      </div>

      {visibleWorkers.length === 0 ? (
        <section className="mt-4 border border-dashed border-violet-100 bg-white px-6 py-16 text-center">
          <Users className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-2xl font-semibold uppercase">
            No Workers Found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Clear the filters or create the first worker.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-4 hidden overflow-x-auto border border-violet-100 bg-white md:block">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Worker</th>
                  <th className="px-4 py-3">Trade / Skill</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Documents</th>
                  <th className="px-5 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {visibleWorkers.map((worker) => (
                  <tr key={worker.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">{worker.legal_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {maskIdentifier(
                          worker.cnic_number ?? worker.passport_number,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {worker.tradeName ?? "Not classified"}
                      <p className="text-xs text-slate-500">
                        {worker.skillName}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      {worker.projectName ?? "Awaiting assignment"}
                    </td>
                    <td className="px-4 py-4">
                      {statusLabel(worker.currentEmployment?.status)}
                    </td>
                    <td className="px-4 py-4">
                      {worker.documentWarning === "EXPIRED" ||
                      worker.documentWarning === "EXPIRING" ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-800">
                          <AlertTriangle
                            className="size-4"
                            aria-hidden="true"
                          />
                          {worker.documentWarning === "EXPIRED"
                            ? "Expired"
                            : "Expiring"}
                        </span>
                      ) : (
                        "No warning"
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/ceo/workers/${worker.id}`}
                        aria-label={`Open ${worker.legal_name}`}
                        className="inline-flex size-9 items-center justify-center border border-violet-100"
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid gap-3 md:hidden">
            {visibleWorkers.map((worker) => (
              <Link
                key={worker.id}
                href={`/ceo/workers/${worker.id}`}
                className="border border-violet-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{worker.legal_name}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {maskIdentifier(
                        worker.cnic_number ?? worker.passport_number,
                      )}
                    </p>
                  </div>
                  <span className="text-xs font-medium">
                    {statusLabel(worker.currentEmployment?.status)}
                  </span>
                </div>
                <p className="mt-4 flex items-center gap-2 text-sm">
                  <BriefcaseBusiness
                    className="size-4 text-violet-700"
                    aria-hidden="true"
                  />
                  {worker.projectName ?? "Awaiting assignment"}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {worker.tradeName ?? "Not classified"} ·{" "}
                  {worker.skillName ?? "No skill"}
                </p>
              </Link>
            ))}
          </div>
        </>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Worker pages"
          className="mt-6 flex items-center justify-end gap-2"
        >
          {currentPage > 1 ? (
            <Link
              href={pageHref(currentPage - 1)}
              className="border border-violet-100 bg-white px-4 py-2 text-sm font-semibold"
            >
              Previous
            </Link>
          ) : null}
          {currentPage < pageCount ? (
            <Link
              href={pageHref(currentPage + 1)}
              className="border border-violet-100 bg-white px-4 py-2 text-sm font-semibold"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}

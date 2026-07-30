import {
  AlertTriangle,
  ArrowUpRight,
  ChevronRight,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import {
  CompactRecord,
  CompactRecordList,
} from "@/components/operations/compact-record-list";
import { DataViewToolbar } from "@/components/operations/data-view-toolbar";
import { PageHeader } from "@/components/operations/page-header";
import { StatusChip } from "@/components/operations/status-chip";
import { getWorkerOptions, listWorkersPage } from "@/lib/phase3/data";
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
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [workerPage, options] = await Promise.all([
    listWorkersPage({ ...params, page, pageSize: PAGE_SIZE }),
    getWorkerOptions(),
  ]);
  const {
    items: visibleWorkers,
    page: currentPage,
    pageCount,
    total,
  } = workerPage;
  const queryParams = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] =>
      Boolean(entry[1]),
    ),
  );
  const pageHref = (target: number) => {
    queryParams.set("page", String(target));
    return `/ceo/workers?${queryParams.toString()}`;
  };
  const activeFilterCount = [
    params.project,
    params.trade,
    params.skill,
    params.status,
  ].filter(Boolean).length;

  return (
    <main>
      <PageHeader
        title="Workers"
        description={`${total} matching workers`}
        action={
          <Link
            href="/ceo/workers/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            <UserPlus className="size-4" aria-hidden="true" />
            Add worker
          </Link>
        }
      />

      <form action="/ceo/workers" className="mt-4">
        <DataViewToolbar
          action="/ceo/workers"
          searchDefaultValue={params.query}
          searchName="query"
          searchPlaceholder="Search workers"
          activeFilterCount={activeFilterCount}
          filterTitle="Filter workers"
        >
          <select
            name="project"
            defaultValue={params.project ?? ""}
            aria-label="Filter by project"
            className="h-10 min-w-36 border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 min-w-32 border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 min-w-32 border border-slate-200 bg-white px-3 text-sm"
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
            className="h-10 min-w-32 border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="LEFT_COMPANY">Left company</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <FormSubmitButton
            pendingLabel="Applying…"
            className="h-10 bg-violet-700 px-4 text-sm font-semibold text-white"
          >
            Apply
          </FormSubmitButton>
        </DataViewToolbar>
      </form>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Showing {visibleWorkers.length} of {total}
        </p>
        <p className="text-xs text-slate-500">
          Page {currentPage} of {pageCount}
        </p>
      </div>

      {visibleWorkers.length === 0 ? (
        <section className="mt-4 border border-dashed border-violet-100 bg-white px-6 py-16 text-center">
          <Users className="mx-auto size-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-4 font-heading text-2xl font-semibold">
            No workers found
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Clear the filters or create the first worker.
          </p>
        </section>
      ) : (
        <>
          <div className="mt-3 hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="w-full min-w-[58rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
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
                    <td className="px-5 py-2.5">
                      <p className="font-semibold">{worker.legal_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {maskIdentifier(
                          worker.cnic_number ?? worker.passport_number,
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      {worker.tradeName ?? "Not classified"}
                      <p className="text-xs text-slate-500">
                        {worker.skillName}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      {worker.projectName ?? "Awaiting assignment"}
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusChip
                        tone={
                          worker.currentEmployment?.status === "ACTIVE"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {statusLabel(worker.currentEmployment?.status)}
                      </StatusChip>
                    </td>
                    <td className="px-4 py-2.5">
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
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link
                        href={`/ceo/workers/${worker.id}`}
                        aria-label={`Open ${worker.legal_name}`}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-50"
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CompactRecordList label="Workers" className="mt-3 md:hidden">
            {visibleWorkers.map((worker) => (
              <CompactRecord
                key={worker.id}
                action={
                  <ChevronRight
                    className="size-4 text-slate-400"
                    aria-hidden="true"
                  />
                }
              >
                <Link
                  href={`/ceo/workers/${worker.id}`}
                  className="block rounded-md focus-visible:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">
                      {worker.legal_name}
                    </h2>
                    <StatusChip
                      tone={
                        worker.currentEmployment?.status === "ACTIVE"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {statusLabel(worker.currentEmployment?.status)}
                    </StatusChip>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {worker.projectName ?? "Awaiting assignment"} ·{" "}
                    {worker.tradeName ?? "Not classified"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {maskIdentifier(
                      worker.cnic_number ?? worker.passport_number,
                    )}
                  </p>
                </Link>
              </CompactRecord>
            ))}
          </CompactRecordList>
        </>
      )}

      {pageCount > 1 ? (
        <nav
          aria-label="Worker pages"
          className="mt-4 flex items-center justify-between gap-2"
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

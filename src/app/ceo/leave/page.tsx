import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { FormSubmitButton } from "@/components/form-submit-button";
import { DataViewToolbar } from "@/components/operations/data-view-toolbar";
import {
  DirectoryToolbarSkeleton,
  FormContentSkeleton,
  ListResultsSkeleton,
} from "@/components/operations/loading-skeletons";
import { PageHeader } from "@/components/operations/page-header";
import { LeaveRequestForm } from "@/components/phase5/leave-request-form";
import { LeaveRequestList } from "@/components/phase5/leave-request-list";
import {
  getLeaveSubmissionOptions,
  listLeaveRequests,
} from "@/lib/phase5/data";

const resultMessages: Record<string, string> = {
  conflict:
    "The request was not submitted. Check the worker assignment, overlapping leave, and selected dates.",
  failed: "The leave request could not be submitted. Please retry.",
  invalid: "Check the worker, dates, leave type, notes, and optional file.",
  submitted: "Leave request submitted for CEO review.",
  "submitted-file-failed":
    "The leave request was submitted, but the supporting file could not be attached.",
};
const PAGE_SIZE = 25;

export default async function CeoLeavePage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    page?: string;
    result?: string;
    status?: string;
    worker?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedStatus = ["ALL", "PENDING", "APPROVED", "REJECTED"].includes(
    params.status ?? "",
  )
    ? (params.status as "ALL" | "PENDING" | "APPROVED" | "REJECTED")
    : "PENDING";
  const resultMessage = params.result
    ? resultMessages[params.result]
    : undefined;
  const reviewKey = [params.project, params.worker, selectedStatus, params.page]
    .map((value) => value ?? "")
    .join("|");
  const optionsPromise = getLeaveSubmissionOptions();
  const requestsPromise = listLeaveRequests({
    projectId: params.project,
    status: selectedStatus === "ALL" ? undefined : selectedStatus,
    workerId: params.worker,
  });

  return (
    <main>
      <PageHeader
        title="Leave review"
        description="Review pending full-day unpaid leave requests first."
      />

      {resultMessage ? (
        <p
          role="status"
          className={`mt-5 border p-3 text-sm ${
            params.result === "submitted"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {resultMessage}
        </p>
      ) : null}

      <Suspense
        fallback={
          <>
            <FormContentSkeleton fields={4} />
            <DirectoryToolbarSkeleton filters={3} />
          </>
        }
      >
        <LeaveReviewContent
          optionsPromise={optionsPromise}
          params={params}
          part="controls"
          requestsPromise={requestsPromise}
          selectedStatus={selectedStatus}
        />
      </Suspense>
      <Suspense
        key={reviewKey}
        fallback={<ListResultsSkeleton columns={5} rows={6} />}
      >
        <LeaveReviewContent
          optionsPromise={optionsPromise}
          params={params}
          part="results"
          requestsPromise={requestsPromise}
          selectedStatus={selectedStatus}
        />
      </Suspense>
    </main>
  );
}

async function LeaveReviewContent({
  optionsPromise,
  params,
  part,
  requestsPromise,
  selectedStatus,
}: {
  optionsPromise: ReturnType<typeof getLeaveSubmissionOptions>;
  params: {
    project?: string;
    page?: string;
    result?: string;
    status?: string;
    worker?: string;
  };
  part: "controls" | "results";
  requestsPromise: ReturnType<typeof listLeaveRequests>;
  selectedStatus: "ALL" | "PENDING" | "APPROVED" | "REJECTED";
}) {
  const options =
    part === "controls"
      ? await optionsPromise
      : { leaveTypes: [], projects: [], workers: [] };
  const requests = part === "results" ? await requestsPromise : [];
  const requestedPage = Number(params.page ?? "1");
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageCount = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visibleRequests = requests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const pageHref = (target: number) => {
    const query = new URLSearchParams(
      Object.entries(params).filter((entry): entry is [string, string] =>
        Boolean(entry[1]),
      ),
    );
    query.set("page", String(target));
    return `/ceo/leave?${query.toString()}`;
  };

  return (
    <>
      {part === "controls" ? (
        <>
          <details className="mt-4 rounded-lg border border-slate-200 bg-white">
            <summary className="flex cursor-pointer items-center gap-2 p-4 font-semibold">
              <Plus className="size-4 text-violet-700" aria-hidden="true" />
              Submit leave on behalf of a worker
            </summary>
            <div className="border-t border-slate-200 p-5">
              <LeaveRequestForm
                leaveTypes={options.leaveTypes}
                workers={options.workers}
              />
            </div>
          </details>

          <form className="mt-4">
            <DataViewToolbar
              action="/ceo/leave"
              searchName="unused"
              searchPlaceholder="Filter leave requests"
              className="[&_input[type=search]]:hidden [&_label:has(input[type=search])]:hidden"
              activeFilterCount={
                [params.project, params.worker].filter(Boolean).length
              }
              filterTitle="Filter leave requests"
            >
              <label className="text-xs font-semibold text-slate-600">
                <span className="sr-only">Status</span>
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="h-10 w-full min-w-32 border border-slate-200 px-3 text-sm font-normal"
                >
                  <option value="ALL">All statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                <span className="sr-only">Project</span>
                <select
                  name="project"
                  defaultValue={params.project ?? ""}
                  className="h-10 w-full min-w-36 border border-slate-200 px-3 text-sm font-normal"
                >
                  <option value="">All projects</option>
                  {options.projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                <span className="sr-only">Worker</span>
                <select
                  name="worker"
                  defaultValue={params.worker ?? ""}
                  className="h-10 w-full min-w-36 border border-slate-200 px-3 text-sm font-normal"
                >
                  <option value="">All workers</option>
                  {options.workers.map((worker) => (
                    <option
                      key={`${worker.id}:${worker.projectId}`}
                      value={worker.id}
                    >
                      {worker.name}
                    </option>
                  ))}
                </select>
              </label>
              <FormSubmitButton
                pendingLabel="Filtering…"
                className="h-10 bg-violet-700 px-4 text-sm font-semibold text-white"
              >
                Filter
              </FormSubmitButton>
            </DataViewToolbar>
          </form>
        </>
      ) : null}
      {part === "results" ? (
        <section className="mt-5" aria-label="Leave requests">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">Requests</h2>
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              <ClipboardList className="size-4" aria-hidden="true" />
              {requests.length} shown
            </span>
          </div>
          <LeaveRequestList requests={visibleRequests} canDecide />
          {pageCount > 1 ? (
            <nav
              aria-label="Leave request pages"
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
      ) : null}
    </>
  );
}

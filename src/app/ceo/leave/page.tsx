import { ClipboardList, Plus } from "lucide-react";

import { FormSubmitButton } from "@/components/form-submit-button";
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

export default async function CeoLeavePage({
  searchParams,
}: {
  searchParams: Promise<{
    project?: string;
    result?: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
    worker?: string;
  }>;
}) {
  const params = await searchParams;
  const [options, requests] = await Promise.all([
    getLeaveSubmissionOptions(),
    listLeaveRequests({
      projectId: params.project,
      status: params.status,
      workerId: params.worker,
    }),
  ]);
  const resultMessage = params.result
    ? resultMessages[params.result]
    : undefined;

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="border-b border-stone-300 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Full-day unpaid leave
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Leave review
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
          Submit requests, review pending leave first, resolve attendance
          conflicts, and approve or reject with a permanent audit history.
          Approved days have zero payable hours.
        </p>
      </div>

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

      <details className="mt-6 border border-stone-300 bg-white">
        <summary className="flex cursor-pointer items-center gap-2 p-5 font-semibold">
          <Plus className="size-4 text-amber-700" aria-hidden="true" />
          Submit leave on behalf of a worker
        </summary>
        <div className="border-t border-stone-200 p-5">
          <LeaveRequestForm
            leaveTypes={options.leaveTypes}
            workers={options.workers}
          />
        </div>
      </details>

      <form className="mt-6 grid gap-3 border border-stone-300 bg-white p-4 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          Status
          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="mt-2 h-11 w-full border border-stone-300 px-3 text-sm normal-case tracking-normal"
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          Project
          <select
            name="project"
            defaultValue={params.project ?? ""}
            className="mt-2 h-11 w-full border border-stone-300 px-3 text-sm normal-case tracking-normal"
          >
            <option value="">All projects</option>
            {options.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
          Worker
          <select
            name="worker"
            defaultValue={params.worker ?? ""}
            className="mt-2 h-11 w-full border border-stone-300 px-3 text-sm normal-case tracking-normal"
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
          className="min-h-11 self-end bg-stone-950 px-5 text-sm font-semibold text-white"
        >
          Filter
        </FormSubmitButton>
      </form>

      <section className="mt-6" aria-label="Leave requests">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-2xl font-semibold uppercase">
            Requests
          </h2>
          <span className="inline-flex items-center gap-2 text-sm text-stone-500">
            <ClipboardList className="size-4" aria-hidden="true" />
            {requests.length} shown
          </span>
        </div>
        <LeaveRequestList requests={requests} canDecide />
      </section>
    </main>
  );
}

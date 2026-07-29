import { ClipboardList } from "lucide-react";

import { LeaveRequestForm } from "@/components/phase5/leave-request-form";
import { LeaveRequestList } from "@/components/phase5/leave-request-list";
import {
  getLeaveSubmissionOptions,
  listLeaveRequests,
} from "@/lib/phase5/data";

const resultMessages: Record<string, string> = {
  conflict:
    "The request was not submitted. Check the dates, worker assignment, and overlapping leave.",
  failed: "The leave request could not be submitted. Please retry.",
  invalid: "Check the dates, leave type, notes, and optional file.",
  submitted: "Leave request sent to the CEO for review.",
  "submitted-file-failed":
    "The request was submitted, but the supporting file could not be attached.",
};

export default async function ForemanLeavePage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string }>;
}) {
  const params = await searchParams;
  const [options, requests] = await Promise.all([
    getLeaveSubmissionOptions(),
    listLeaveRequests(),
  ]);
  const resultMessage = params.result
    ? resultMessages[params.result]
    : undefined;

  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-7">
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-violet-700">
        Current project
      </p>
      <h1 className="mt-2 font-heading text-4xl font-semibold uppercase leading-none">
        Worker leave
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Submit full calendar days for an assigned worker. Every approved day is
        unpaid and has zero payable hours.
      </p>

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

      <section className="mt-6 border border-violet-100 bg-white p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardList
            className="size-5 text-violet-700"
            aria-hidden="true"
          />
          New request
        </h2>
        <div className="mt-4">
          <LeaveRequestForm
            compact
            leaveTypes={options.leaveTypes}
            workers={options.workers}
          />
        </div>
      </section>

      <section className="mt-7" aria-label="Project leave requests">
        <h2 className="mb-4 font-heading text-2xl font-semibold uppercase">
          Request history
        </h2>
        <LeaveRequestList requests={requests} />
      </section>
    </main>
  );
}

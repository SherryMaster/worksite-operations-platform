import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/operations/page-header";
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
  searchParams: Promise<{ result?: string; view?: string }>;
}) {
  const params = await searchParams;
  const [options, requests] = await Promise.all([
    getLeaveSubmissionOptions(),
    listLeaveRequests(),
  ]);
  const resultMessage = params.result
    ? resultMessages[params.result]
    : undefined;
  const showingForm =
    params.view === "new" ||
    Boolean(params.result && !params.result.startsWith("submitted"));

  return (
    <main>
      <PageHeader
        eyebrow="Current project"
        title={showingForm ? "New leave request" : "Leave requests"}
        description={
          showingForm
            ? "Approved leave is a full unpaid calendar day with zero payable hours."
            : undefined
        }
        action={
          <Link
            href={showingForm ? "/foreman/leave" : "/foreman/leave?view=new"}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            {showingForm ? (
              <ArrowLeft className="size-4" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            {showingForm ? "Back to requests" : "New request"}
          </Link>
        }
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

      {showingForm ? (
        <section className="mt-4 max-w-3xl rounded-lg border border-slate-200 bg-white p-4">
          <LeaveRequestForm
            compact
            leaveTypes={options.leaveTypes}
            workers={options.workers}
          />
        </section>
      ) : (
        <section className="mt-4" aria-label="Project leave requests">
          <LeaveRequestList requests={requests} />
        </section>
      )}
    </main>
  );
}

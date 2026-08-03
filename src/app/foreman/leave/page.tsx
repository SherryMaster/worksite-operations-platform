import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import {
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
  searchParams: Promise<{
    result?: string;
    status?: "ALL" | "APPROVED" | "PENDING" | "REJECTED";
    view?: string;
  }>;
}) {
  const params = await searchParams;
  const resultMessage = params.result
    ? resultMessages[params.result]
    : undefined;
  const showingForm =
    params.view === "new" ||
    Boolean(params.result && !params.result.startsWith("submitted"));

  return (
    <main>
      <PageHeader
        title={showingForm ? "New leave request" : "Leave"}
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

      <Suspense
        key={JSON.stringify(params)}
        fallback={
          showingForm ? (
            <FormContentSkeleton fields={5} />
          ) : (
            <ListResultsSkeleton columns={4} rows={6} className="mt-3" />
          )
        }
      >
        <ForemanLeaveContent params={params} showingForm={showingForm} />
      </Suspense>
    </main>
  );
}

async function ForemanLeaveContent({
  params,
  showingForm,
}: {
  params: {
    result?: string;
    status?: "ALL" | "APPROVED" | "PENDING" | "REJECTED";
    view?: string;
  };
  showingForm: boolean;
}) {
  const [options, requests] = await Promise.all([
    getLeaveSubmissionOptions(),
    listLeaveRequests(),
  ]);
  const selectedStatus = params.status ?? "PENDING";
  const visibleRequests =
    selectedStatus === "ALL"
      ? requests
      : requests.filter((request) => request.status === selectedStatus);
  const statuses = [
    ["PENDING", "Pending"],
    ["APPROVED", "Approved"],
    ["REJECTED", "Rejected"],
    ["ALL", "All"],
  ] as const;

  return (
    <>
      {showingForm ? (
        <section className="mt-3 max-w-3xl rounded-lg border border-slate-200 bg-white p-4">
          <LeaveRequestForm
            compact
            leaveTypes={options.leaveTypes}
            workers={options.workers}
          />
        </section>
      ) : (
        <section className="mt-3" aria-label="Project leave requests">
          <nav
            aria-label="Leave request status"
            className="mb-3 grid grid-cols-4 border-b border-slate-200"
          >
            {statuses.map(([value, label]) => {
              const count =
                value === "ALL"
                  ? requests.length
                  : requests.filter((request) => request.status === value)
                      .length;
              const active = selectedStatus === value;
              return (
                <Link
                  key={value}
                  href={`/foreman/leave?status=${value}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center justify-center gap-1 border-b-2 px-1 text-xs font-semibold ${
                    active
                      ? "border-violet-700 text-violet-700"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {label}
                  <span className="tabular-nums">{count}</span>
                </Link>
              );
            })}
          </nav>
          <LeaveRequestList requests={visibleRequests} />
        </section>
      )}
    </>
  );
}

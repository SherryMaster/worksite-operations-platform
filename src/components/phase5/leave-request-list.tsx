import {
  AlertTriangle,
  CalendarDays,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { decideLeaveRequestAction } from "@/app/leave/actions";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { formatDate, formatDateTime } from "@/lib/phase2/format";
import type { LeaveRequestView } from "@/lib/phase5/data";
import { cn } from "@/lib/utils";

function statusClasses(status: LeaveRequestView["status"]) {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  if (status === "REJECTED") {
    return "border-red-200 bg-red-50 text-red-800";
  }
  return "border-amber-200 bg-amber-50 text-amber-900";
}

export function LeaveRequestList({
  canDecide = false,
  requests,
}: {
  canDecide?: boolean;
  requests: LeaveRequestView[];
}) {
  if (requests.length === 0) {
    return (
      <div className="border border-dashed border-violet-100 bg-white p-10 text-center">
        <CalendarDays
          className="mx-auto size-7 text-slate-400"
          aria-hidden="true"
        />
        <h2 className="mt-3 font-semibold">No leave requests found</h2>
        <p className="mt-1 text-sm text-slate-500">
          Submitted requests and their decisions will appear here.
        </p>
      </div>
    );
  }

  return (
    <ol className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {requests.map((request) => (
        <li
          key={request.id}
          className="border-b border-slate-200 p-3 last:border-0 sm:p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-semibold">
                  {request.workerName}
                </h2>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold capitalize",
                    statusClasses(request.status),
                  )}
                >
                  {request.status.toLowerCase()}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">
                {request.projectName} · {request.leaveTypeName}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-700">
                {formatDate(request.starts_on)}
                {request.ends_on !== request.starts_on
                  ? ` – ${formatDate(request.ends_on)}`
                  : ""}
              </p>
              <p className="mt-1 text-[0.6875rem] text-slate-400">
                Submitted {formatDateTime(request.created_at)}
              </p>
            </div>
          </div>

          {request.attendanceConflict && request.status === "PENDING" ? (
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-800">
              <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
              Attendance conflict requires review
            </p>
          ) : null}

          <details className="group mt-2 border-t border-slate-100 pt-2">
            <summary className="inline-flex min-h-9 cursor-pointer items-center text-xs font-semibold text-violet-800">
              View request details
            </summary>

            {request.reason || request.notes ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {request.reason ? (
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-xs font-semibold text-slate-500">
                      Reason
                    </dt>
                    <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {request.reason}
                    </dd>
                  </div>
                ) : null}
                {request.notes ? (
                  <div className="rounded-md bg-slate-50 p-3">
                    <dt className="text-xs font-semibold text-slate-500">
                      Notes
                    </dt>
                    <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                      {request.notes}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {request.document ? (
              <Link
                href={`/api/leave-requests/${request.id}/documents/${request.document.id}`}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold hover:bg-slate-50"
              >
                <FileText className="size-4" aria-hidden="true" />
                Open supporting file
              </Link>
            ) : null}

            {request.attendanceConflict && request.status === "PENDING" ? (
              <div className="mt-3 flex gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-950">
                <AlertTriangle
                  className="mt-0.5 size-5 shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">Attendance conflict</p>
                  <p className="mt-1">
                    This worker already has attendance on a selected date. Clear
                    it with an audited correction before approval.
                  </p>
                  {canDecide ? (
                    <Link
                      href={`/ceo/attendance?view=day&project=${request.project_id}&date=${request.starts_on}`}
                      className="mt-2 inline-block font-semibold underline"
                    >
                      Review attendance
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {request.status === "APPROVED" ? (
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Approved full-day unpaid leave · 0 payable hours
              </p>
            ) : null}

            {request.decision_note ? (
              <p className="mt-3 border-l-2 border-violet-100 pl-3 text-sm text-slate-600">
                CEO note: {request.decision_note}
              </p>
            ) : null}

            {canDecide && request.status === "PENDING" ? (
              <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 lg:grid-cols-2">
                {!request.attendanceConflict ? (
                  <div>
                    <ActionButton
                      action={decideLeaveRequestAction.bind(
                        null,
                        request.id,
                        "APPROVED",
                      )}
                      label="Approve full-day unpaid leave"
                      pendingLabel="Approving…"
                      confirmMessage={`Approve unpaid leave for ${request.workerName}? Each approved day will have zero payable time.`}
                    />
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-red-800">
                    Approval is blocked until attendance is cleared.
                  </p>
                )}
                <ManagedForm
                  action={decideLeaveRequestAction.bind(
                    null,
                    request.id,
                    "REJECTED",
                  )}
                  submitLabel="Reject request"
                  className="space-y-2"
                >
                  <label className="block text-xs font-semibold text-slate-600">
                    Rejection note (optional)
                    <input
                      name="decisionNote"
                      minLength={2}
                      maxLength={500}
                      className="mt-1 h-11 w-full border border-violet-100 px-3 text-sm"
                    />
                  </label>
                </ManagedForm>
              </div>
            ) : null}
          </details>
        </li>
      ))}
    </ol>
  );
}

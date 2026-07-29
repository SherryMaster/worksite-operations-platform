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
    <ol className="space-y-4">
      {requests.map((request) => (
        <li key={request.id} className="border border-violet-100 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "border px-2 py-1 text-xs font-semibold uppercase tracking-wider",
                    statusClasses(request.status),
                  )}
                >
                  {request.status.toLowerCase()}
                </span>
                <span className="text-xs text-slate-500">
                  Submitted {formatDateTime(request.created_at)}
                </span>
              </div>
              <h2 className="mt-3 text-xl font-semibold">
                {request.workerName}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {request.projectName} · {request.leaveTypeName}
              </p>
            </div>
            <div className="border border-slate-200 bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Full calendar days
              </p>
              <p className="mt-1 font-semibold">
                {formatDate(request.starts_on)}
                {request.ends_on !== request.starts_on
                  ? ` – ${formatDate(request.ends_on)}`
                  : ""}
              </p>
            </div>
          </div>

          <dl className="mt-4 grid gap-px border border-slate-200 bg-slate-200 sm:grid-cols-2">
            <div className="bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reason
              </dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {request.reason ?? "No reason provided."}
              </dd>
            </div>
            <div className="bg-white p-4">
              <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Notes
              </dt>
              <dd className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                {request.notes ?? "No additional notes."}
              </dd>
            </div>
          </dl>

          {request.document ? (
            <Link
              href={`/api/leave-requests/${request.id}/documents/${request.document.id}`}
              className="mt-4 inline-flex min-h-11 items-center gap-2 border border-violet-100 px-3 text-sm font-semibold hover:border-violet-950"
            >
              <FileText className="size-4" aria-hidden="true" />
              Open supporting file
            </Link>
          ) : null}

          {request.attendanceConflict && request.status === "PENDING" ? (
            <div className="mt-4 flex gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-950">
              <AlertTriangle
                className="mt-0.5 size-5 shrink-0"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold">Attendance conflict</p>
                <p className="mt-1">
                  This worker already has attendance on a selected date. Clear
                  it with an audited attendance correction before approval.
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
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
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
            <div className="mt-5 grid gap-4 border-t border-slate-200 pt-5 lg:grid-cols-2">
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
        </li>
      ))}
    </ol>
  );
}

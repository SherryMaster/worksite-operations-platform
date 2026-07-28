"use client";

import { Paperclip, Send } from "lucide-react";
import { useMemo, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { malaysiaDateInputValue } from "@/lib/phase2/format";

type WorkerOption = {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
};

export function LeaveRequestForm({
  compact = false,
  leaveTypes,
  workers,
}: {
  compact?: boolean;
  leaveTypes: Array<{ id: string; name: string }>;
  workers: WorkerOption[];
}) {
  const [workerId, setWorkerId] = useState(workers[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);
  const selectedWorker = useMemo(
    () => workers.find((worker) => worker.id === workerId),
    [workerId, workers],
  );
  const today = malaysiaDateInputValue();
  const unavailable = workers.length === 0 || leaveTypes.length === 0;

  return (
    <form
      action="/api/leave-requests"
      method="post"
      encType="multipart/form-data"
      className="space-y-4"
      onSubmit={() => setSubmitting(true)}
    >
      <input
        type="hidden"
        name="projectId"
        value={selectedWorker?.projectId ?? ""}
      />
      <div className={compact ? "space-y-4" : "grid gap-4 md:grid-cols-2"}>
        <label className="space-y-2 text-sm font-medium">
          <span>Worker</span>
          <select
            name="workerId"
            required
            value={workerId}
            onChange={(event) => setWorkerId(event.target.value)}
            className="h-11 w-full border border-stone-300 bg-white px-3"
          >
            {workers.length === 0 ? (
              <option value="">No active assigned workers</option>
            ) : (
              workers.map((worker) => (
                <option
                  key={`${worker.id}:${worker.projectId}`}
                  value={worker.id}
                >
                  {worker.name} · {worker.projectName}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Leave type</span>
          <select
            name="leaveTypeId"
            required
            defaultValue={leaveTypes[0]?.id ?? ""}
            className="h-11 w-full border border-stone-300 bg-white px-3"
          >
            {leaveTypes.length === 0 ? (
              <option value="">No active leave types</option>
            ) : (
              leaveTypes.map((leaveType) => (
                <option key={leaveType.id} value={leaveType.id}>
                  {leaveType.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>First full day</span>
          <input
            type="date"
            name="startsOn"
            required
            defaultValue={today}
            className="h-11 w-full border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          <span>Last full day</span>
          <input
            type="date"
            name="endsOn"
            required
            defaultValue={today}
            className="h-11 w-full border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="space-y-2 text-sm font-medium md:col-span-2">
          <span>Reason (optional)</span>
          <input
            name="reason"
            minLength={2}
            maxLength={500}
            placeholder="Plain-English reason for this request"
            className="h-11 w-full border border-stone-300 bg-white px-3"
          />
        </label>
        <label className="space-y-2 text-sm font-medium md:col-span-2">
          <span>Additional notes (optional)</span>
          <textarea
            name="notes"
            maxLength={2000}
            className="min-h-24 w-full border border-stone-300 bg-white p-3"
          />
        </label>
        <label className="space-y-2 text-sm font-medium md:col-span-2">
          <span className="inline-flex items-center gap-2">
            <Paperclip className="size-4" aria-hidden="true" />
            Supporting file (optional)
          </span>
          <input
            type="file"
            name="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="block w-full border border-stone-300 bg-white p-3 text-sm file:mr-3 file:border-0 file:bg-stone-100 file:px-3 file:py-2"
          />
          <span className="block text-xs font-normal text-stone-500">
            PDF, JPEG, or PNG up to 10 MB. Stored privately.
          </span>
        </label>
      </div>
      {leaveTypes.length === 0 ? (
        <p className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          The CEO must add an active leave type in Settings before requests can
          be submitted.
        </p>
      ) : null}
      <button
        type="submit"
        disabled={unavailable || submitting}
        aria-busy={submitting}
        className="inline-flex min-h-12 items-center justify-center gap-2 bg-stone-950 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {submitting ? (
          <Spinner aria-hidden="true" />
        ) : (
          <Send className="size-4" aria-hidden="true" />
        )}
        {submitting ? "Submitting request…" : "Submit for CEO review"}
      </button>
    </form>
  );
}

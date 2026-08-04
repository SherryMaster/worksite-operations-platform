"use client";

import {
  AlertTriangle,
  ChevronRight,
  CircleCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { WorkerAvatar } from "@/components/worker-avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { AttendanceWorkerDayRecord } from "@/lib/phase4/attendance-monitor-types";
import { calculateAttendance, formatMinutes } from "@/lib/phase4/calculations";
import {
  malaysiaInputFromIso,
  malaysiaIsoFromInput,
  validateCorrectionSessions,
} from "@/lib/phase4/sync-issues";
import { cn } from "@/lib/utils";

type EditableBreak = { endedAt: string; key: string; startedAt: string };
type EditableSession = {
  breaks: EditableBreak[];
  enteredAt: string;
  exitedAt: string;
  key: string;
};

function time(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(value));
}

function presenceLabel(value: AttendanceWorkerDayRecord["presenceStatus"]) {
  return {
    ABSENT: "Absent",
    APPROVED_LEAVE: "Approved leave",
    NOT_APPLICABLE: "Not applicable",
    NO_ENTRY_YET: "No entry yet",
    PRESENT: "Present",
  }[value];
}

function liveLabel(value: AttendanceWorkerDayRecord["liveStatus"]) {
  return {
    EXITED: "Exited",
    NOT_ENTERED: "Not entered",
    ON_BREAK: "On break",
    ON_SITE: "On site",
  }[value];
}

function qualityLabel(value: AttendanceWorkerDayRecord["quality"]) {
  return {
    INCOMPLETE: "Incomplete",
    INVALID: "Invalid",
    LEAVE_CONFLICT: "Leave conflict",
    VALID: "Complete",
  }[value];
}

function dayTypeLabel(value: AttendanceWorkerDayRecord["dayType"]) {
  return {
    NORMAL: "Normal day",
    PUBLIC_HOLIDAY: "Public holiday",
    SUNDAY: "Sunday",
  }[value];
}

function correctionDefaults(record: AttendanceWorkerDayRecord) {
  return record.sessions.map((session) => ({
    breaks: session.breaks.map((attendanceBreak) => ({
      endedAt: malaysiaInputFromIso(attendanceBreak.endedAt),
      key: attendanceBreak.id,
      startedAt: malaysiaInputFromIso(attendanceBreak.startedAt),
    })),
    enteredAt: malaysiaInputFromIso(session.enteredAt),
    exitedAt: malaysiaInputFromIso(session.exitedAt),
    key: session.id,
  }));
}

function AttendanceCorrection({
  onCancel,
  onSaved,
  record,
}: {
  onCancel: () => void;
  onSaved: () => void;
  record: AttendanceWorkerDayRecord;
}) {
  const online = useOnlineStatus();
  const [sessions, setSessions] = useState<EditableSession[]>(() =>
    correctionDefaults(record),
  );
  const [note, setNote] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const problems = useMemo(
    () =>
      validateCorrectionSessions(
        sessions.map((session) => ({
          breaks: session.breaks.map((attendanceBreak) => ({
            endedAt: attendanceBreak.endedAt,
            startedAt: attendanceBreak.startedAt,
          })),
          enteredAt: session.enteredAt,
          exitedAt: session.exitedAt,
        })),
        record.workDate,
      ),
    [record.workDate, sessions],
  );
  const validNote = note.trim().length >= 3 && note.trim().length <= 500;

  const updateSession = (
    key: string,
    update: (session: EditableSession) => EditableSession,
  ) =>
    setSessions((current) =>
      current.map((session) =>
        session.key === key ? update(session) : session,
      ),
    );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setMessage(null);
    if (!online || !validNote || problems.length > 0) return;
    setSaving(true);
    const clientActionId = crypto.randomUUID();
    try {
      const response = await fetch("/api/attendance/sync", {
        body: JSON.stringify({
          actions: [
            {
              actionType: "CORRECT_DAY",
              clientActionId,
              payload: {
                note: note.trim(),
                sessions: sessions.map((session) => ({
                  breaks: session.breaks.map((attendanceBreak) => ({
                    endedAt: attendanceBreak.endedAt
                      ? malaysiaIsoFromInput(attendanceBreak.endedAt)
                      : null,
                    id: crypto.randomUUID(),
                    startedAt: malaysiaIsoFromInput(attendanceBreak.startedAt),
                  })),
                  enteredAt: malaysiaIsoFromInput(session.enteredAt),
                  exitedAt: session.exitedAt
                    ? malaysiaIsoFromInput(session.exitedAt)
                    : null,
                  id: crypto.randomUUID(),
                })),
                workerId: record.workerId,
                workDate: record.workDate,
              },
              projectId: record.projectId,
            },
          ],
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as {
        results?: Array<{ result?: { message?: string; status?: string } }>;
      } | null;
      const result = body?.results?.[0]?.result;
      if (response.ok && result?.status === "SYNCED") {
        setMessage("Attendance correction saved.");
        onSaved();
        return;
      }
      setMessage(
        result?.message ??
          "The correction could not be saved. Review the times and try again.",
      );
    } catch {
      setMessage("Connect to the internet and submit the correction again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-violet-700">
          Online correction
        </p>
        <h3 className="mt-1 text-lg font-semibold">Correct record</h3>
        <p className="mt-1 text-xs text-slate-500">
          Changes save directly to the audited server record.
        </p>
      </div>

      {sessions.map((session, sessionIndex) => (
        <section
          key={session.key}
          className="rounded-lg border border-slate-200 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">
              Session {sessionIndex + 1}
            </h4>
            <button
              type="button"
              onClick={() =>
                setSessions((current) =>
                  current.filter((item) => item.key !== session.key),
                )
              }
              className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-red-700"
            >
              <Trash2 className="size-3.5" aria-hidden="true" /> Remove
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-600">
              Enter
              <input
                required
                step={1}
                type="datetime-local"
                value={session.enteredAt}
                onChange={(event) =>
                  updateSession(session.key, (current) => ({
                    ...current,
                    enteredAt: event.target.value,
                  }))
                }
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Exit (optional)
              <input
                step={1}
                type="datetime-local"
                value={session.exitedAt}
                onChange={(event) =>
                  updateSession(session.key, (current) => ({
                    ...current,
                    exitedAt: event.target.value,
                  }))
                }
                className="mt-1 h-11 w-full rounded-md border border-slate-200 px-2 text-xs"
              />
            </label>
          </div>
          {session.breaks.map((attendanceBreak, breakIndex) => (
            <div
              key={attendanceBreak.key}
              className="mt-3 rounded-md border border-amber-100 bg-amber-50/40 p-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">Break {breakIndex + 1}</p>
                <button
                  type="button"
                  onClick={() =>
                    updateSession(session.key, (current) => ({
                      ...current,
                      breaks: current.breaks.filter(
                        (item) => item.key !== attendanceBreak.key,
                      ),
                    }))
                  }
                  className="min-h-9 text-xs font-semibold text-red-700"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-600">
                  Start
                  <input
                    required
                    step={1}
                    type="datetime-local"
                    value={attendanceBreak.startedAt}
                    onChange={(event) =>
                      updateSession(session.key, (current) => ({
                        ...current,
                        breaks: current.breaks.map((item) =>
                          item.key === attendanceBreak.key
                            ? { ...item, startedAt: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                  />
                </label>
                <label className="text-xs text-slate-600">
                  End (optional)
                  <input
                    step={1}
                    type="datetime-local"
                    value={attendanceBreak.endedAt}
                    onChange={(event) =>
                      updateSession(session.key, (current) => ({
                        ...current,
                        breaks: current.breaks.map((item) =>
                          item.key === attendanceBreak.key
                            ? { ...item, endedAt: event.target.value }
                            : item,
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-xs"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateSession(session.key, (current) => ({
                ...current,
                breaks: [
                  ...current.breaks,
                  {
                    endedAt: "",
                    key: crypto.randomUUID(),
                    startedAt: `${record.workDate}T12:00:00`,
                  },
                ],
              }))
            }
            disabled={session.breaks.length >= 12}
            className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-violet-700 disabled:text-slate-400"
          >
            <Plus className="size-3.5" aria-hidden="true" /> Add break
          </button>
        </section>
      ))}

      <button
        type="button"
        onClick={() =>
          setSessions((current) => [
            ...current,
            {
              breaks: [],
              enteredAt: `${record.workDate}T08:00:00`,
              exitedAt: "",
              key: crypto.randomUUID(),
            },
          ])
        }
        disabled={sessions.length >= 12}
        className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-violet-700 disabled:text-slate-400"
      >
        <Plus className="size-3.5" aria-hidden="true" /> Add session
      </button>

      {attempted && problems.length > 0 ? (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          <p className="font-semibold">Fix the record before saving</p>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {problems.map((problem) => (
              <li
                key={`${problem.sessionIndex}:${problem.breakIndex}:${problem.field}:${problem.message}`}
              >
                {problem.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <label className="block text-xs font-semibold text-slate-600">
        Correction reason
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={500}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-200 p-3 text-sm"
        />
      </label>
      {attempted && !validNote ? (
        <p className="text-xs font-medium text-red-700">
          Add a reason of at least 3 characters so the audit history is useful.
        </p>
      ) : null}
      {!online ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900">
          Connect to correct this record.
        </p>
      ) : null}
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="text-xs font-medium text-slate-700"
        >
          {message}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg border border-slate-200 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!online || saving}
          className="min-h-11 rounded-lg bg-violet-700 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {saving ? "Saving…" : "Save correction"}
        </button>
      </div>
    </form>
  );
}

export function AttendanceRecordDetail({
  label = "View details",
  record,
}: {
  label?: string;
  record: AttendanceWorkerDayRecord;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const online = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            aria-label={`${label} for ${record.workerName} on ${record.workDate}`}
            className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold text-violet-700 hover:bg-violet-50"
          />
        }
      >
        <span className="hidden sm:inline">{label}</span>
        <ChevronRight className="size-4" aria-hidden="true" />
      </SheetTrigger>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 overflow-y-auto p-0",
          isMobile
            ? "max-h-[92dvh] w-full rounded-t-xl pb-[env(safe-area-inset-bottom)]"
            : "w-full sm:max-w-xl",
        )}
      >
        <SheetHeader className="border-b border-slate-200 p-4 pr-12 text-left">
          <div className="flex items-center gap-3">
            <WorkerAvatar
              workerId={record.workerId}
              photoId={record.workerPhotoId}
              name={record.workerName}
              size="md"
            />
            <div className="min-w-0">
              <SheetTitle className="truncate">{record.workerName}</SheetTitle>
              <SheetDescription>
                {record.projectName} · {record.workDate} ·{" "}
                {dayTypeLabel(record.dayType)}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-5 p-4">
          {savedMessage ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800"
            >
              {savedMessage}
            </p>
          ) : null}
          {correcting ? (
            <AttendanceCorrection
              record={record}
              onCancel={() => setCorrecting(false)}
              onSaved={() => {
                router.refresh();
                setCorrecting(false);
                setSavedMessage("Attendance correction saved.");
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-800">
                  {presenceLabel(record.presenceStatus)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">
                  {liveLabel(record.liveStatus)}
                </span>
                <span
                  className={cn(
                    "rounded-full border px-2 py-1",
                    record.quality === "VALID"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-800",
                  )}
                >
                  {qualityLabel(record.quality)}
                </span>
              </div>

              <section>
                <h3 className="text-sm font-semibold">Recorded time</h3>
                <dl className="mt-2 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 p-3 text-xs sm:grid-cols-3">
                  {[
                    ["First entry", time(record.firstEntryAt)],
                    [
                      "Last exit",
                      record.lastExitAt
                        ? time(record.lastExitAt)
                        : "Open / none",
                    ],
                    ["Total valid", formatMinutes(record.totalPayableMinutes)],
                    ["Normal", formatMinutes(record.normalMinutes)],
                    ["Overtime", formatMinutes(record.overtimeMinutes)],
                    [
                      "Special rate",
                      formatMinutes(
                        record.sundayMinutes + record.publicHolidayMinutes,
                      ),
                    ],
                  ].map(([term, value]) => (
                    <div key={term}>
                      <dt className="text-slate-500">{term}</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold">Sessions</h3>
                <div className="mt-2 space-y-2">
                  {record.sessions.map((session, index) => {
                    const calculation = calculateAttendance(
                      [session],
                      record.dayType,
                      record.workDate,
                    );
                    const grossMinutes = session.exitedAt
                      ? Math.max(
                          0,
                          Math.floor(
                            (new Date(session.exitedAt).getTime() -
                              new Date(session.enteredAt).getTime()) /
                              60_000,
                          ),
                        )
                      : 0;
                    return (
                      <article
                        key={session.id}
                        className="rounded-lg border border-slate-200 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">Session {index + 1}</p>
                          <span
                            className={
                              session.exitedAt
                                ? "text-emerald-700"
                                : "text-amber-800"
                            }
                          >
                            {session.exitedAt ? "Complete" : "Incomplete"}
                          </span>
                        </div>
                        <p className="mt-1 tabular-nums text-slate-700">
                          {time(session.enteredAt)} →{" "}
                          {session.exitedAt ? time(session.exitedAt) : "Open"}
                        </p>
                        <p className="mt-1 text-slate-500">
                          {session.exitedAt
                            ? `${formatMinutes(grossMinutes)} gross · ${formatMinutes(calculation.totalPayableMinutes)} valid contribution`
                            : "Open sessions are not included in payable time."}
                        </p>
                        {session.breaks.length > 0 ? (
                          <ul className="mt-2 space-y-1 border-l-2 border-amber-300 pl-2 text-slate-600">
                            {session.breaks.map(
                              (attendanceBreak, breakIndex) => (
                                <li key={attendanceBreak.id}>
                                  Break {breakIndex + 1}:{" "}
                                  {time(attendanceBreak.startedAt)} →{" "}
                                  {attendanceBreak.endedAt
                                    ? time(attendanceBreak.endedAt)
                                    : "Open"}
                                </li>
                              ),
                            )}
                          </ul>
                        ) : null}
                      </article>
                    );
                  })}
                  {record.sessions.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                      No attendance session was recorded for this worker-day.
                    </p>
                  ) : null}
                </div>
              </section>

              {record.approvedLeaveType ? (
                <section className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
                  <p className="font-semibold">Approved leave</p>
                  <p className="mt-1">{record.approvedLeaveType}</p>
                </section>
              ) : null}

              {record.issues.length > 0 ? (
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-red-800">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    Record issues
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {record.issues.map((issue, index) => (
                      <li
                        key={`${issue.type}:${issue.sessionId}:${index}`}
                        className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
                      >
                        {issue.message}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : (
                <p className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <CircleCheck className="size-4" aria-hidden="true" /> Record
                  is complete.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setSavedMessage(null);
                  setCorrecting(true);
                }}
                disabled={!online}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <Pencil className="size-4" aria-hidden="true" />
                {online ? "Correct record" : "Connect to correct this record"}
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

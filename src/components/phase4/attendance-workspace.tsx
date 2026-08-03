"use client";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  ChevronRight,
  Coffee,
  LoaderCircle,
  LogIn,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AttendanceWorkspaceSkeleton } from "@/components/operations/loading-skeletons";
import { WorkerAvatar } from "@/components/worker-avatar";
import { AttendanceSyncIssues } from "@/components/phase4/attendance-sync-issues";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { calculateAttendance, formatMinutes } from "@/lib/phase4/calculations";
import { applyLocalAttendanceAction } from "@/lib/phase4/local-actions";
import {
  deleteAttendanceActions,
  listAttendanceActions,
  loadAttendanceSnapshot,
  loadLatestAttendanceSnapshot,
  pruneSyncedAttendanceActions,
  saveAttendanceAction,
  saveAttendanceSnapshot,
} from "@/lib/phase4/offline-store";
import {
  buildAttendanceIssueGroups,
  classifyIssue,
  inferLegacyActionMetadata,
  issueGroupKey,
  malaysiaInputFromIso,
  presentAttendanceIssue,
  primaryReviewAction,
  selectResolutionsAfterCorrection,
  selectRetryableActionIds,
  validateCorrectionSessions,
  type EditableCorrectionSession,
} from "@/lib/phase4/sync-issues";
import type {
  AttendanceActionState,
  AttendanceActionType,
  AttendanceIssueKind,
  AttendanceQueueAction,
  AttendanceSession,
  AttendanceSnapshot,
  AttendanceWorker,
} from "@/lib/phase4/types";
import { cn } from "@/lib/utils";

type WorkerFilter =
  | "ALL"
  | "NOT_ENTERED"
  | "ON_SITE"
  | "ON_BREAK"
  | "EXITED"
  | "LEAVE"
  | "INCOMPLETE"
  | "INVALID";

const SYNC_REQUEST_TIMEOUT_MS = 15_000;
const SYNC_RETRY_DELAY_MS = 5_000;
const ATTENDANCE_PAGE_SIZE = 20;

const workerFilters = [
  ["ALL", "All"],
  ["NOT_ENTERED", "Not entered"],
  ["ON_SITE", "On site"],
  ["ON_BREAK", "On break"],
  ["EXITED", "Exited"],
  ["LEAVE", "Approved leave"],
  ["INCOMPLETE", "Incomplete"],
  ["INVALID", "Invalid"],
] as const satisfies ReadonlyArray<readonly [WorkerFilter, string]>;

function malaysiaTime(timestamp: string | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(timestamp));
}

function malaysiaDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return value || "—";
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
  }).format(parsed);
}

function inputToIso(value: string) {
  // `datetime-local` may supply `HH:mm` or `HH:mm:ss`. Pad with `:00`
  // seconds so the wall clock round-trips without re-shifting.
  const timePart = value.includes("T")
    ? value.slice(value.indexOf("T") + 1)
    : value;
  const segments = timePart.split(":");
  if (segments.length === 2) segments.push("00");
  const normalized = `${value.slice(0, value.indexOf("T") + 1)}${segments.join(":")}`;
  return new Date(`${normalized}+08:00`).toISOString();
}

function workerState(sessions: AttendanceSession[]) {
  const ordered = [...sessions].sort((left, right) =>
    left.enteredAt.localeCompare(right.enteredAt),
  );
  const openSession = ordered.findLast((session) => !session.exitedAt) ?? null;
  const openBreak =
    openSession?.breaks.findLast(
      (attendanceBreak) => !attendanceBreak.endedAt,
    ) ?? null;
  return {
    label: openBreak
      ? "On break"
      : openSession
        ? "On site"
        : ordered.length > 0
          ? "Exited"
          : "Not entered",
    openBreak,
    openSession,
    ordered,
  };
}

function actionStateLabel(action: AttendanceQueueAction) {
  if (action.state === "PENDING") return "Saved on device";
  if (action.state === "SYNCING") return "Syncing";
  if (action.state === "SYNCED") return "Synced";
  if (action.state === "RETRYABLE") return "Retry when ready";
  return "Needs review";
}

function AttendanceListSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
      aria-label="Loading attendance"
      aria-busy="true"
    >
      {[0, 1, 2, 3, 4, 5].map((item) => (
        <div
          key={item}
          className="flex min-h-18 items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0"
        >
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-9 w-16 shrink-0" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading attendance for the selected date.
      </span>
    </div>
  );
}

function AttendanceFilterSheet({
  filter,
  onChange,
}: {
  filter: WorkerFilter;
  onChange: (filter: WorkerFilter) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700"
          />
        }
      >
        <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        More filters
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="max-h-[82dvh] overflow-y-auto overscroll-contain rounded-t-xl border-slate-200 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-b border-slate-200 px-4 py-4 text-left">
          <SheetTitle>Filter workers</SheetTitle>
          <SheetDescription>
            Show the attendance state you need to act on.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-2 p-4">
          {workerFilters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => {
                onChange(value);
                setOpen(false);
              }}
              className={cn(
                "min-h-11 rounded-lg border px-3 text-left text-sm font-semibold",
                filter === value
                  ? "border-violet-700 bg-violet-50 text-violet-800"
                  : "border-slate-200 bg-white text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type EditableBreak = {
  endedAt: string;
  key: string;
  startedAt: string;
};

type EditableSession = {
  breaks: EditableBreak[];
  enteredAt: string;
  exitedAt: string;
  key: string;
};

function CorrectionPanel({
  onClose,
  onSave,
  sessions,
  worker,
  workDate,
}: {
  onClose: () => void;
  onSave: (
    sessions: Array<Omit<AttendanceSession, "workerId">>,
    note: string,
  ) => void;
  sessions: AttendanceSession[];
  worker: AttendanceWorker;
  workDate: string;
}) {
  const [note, setNote] = useState("");
  const [editable, setEditable] = useState<EditableSession[]>(() =>
    sessions.map((session) => ({
      breaks: session.breaks.map((attendanceBreak) => ({
        endedAt: malaysiaInputFromIso(attendanceBreak.endedAt),
        key: attendanceBreak.id,
        startedAt: malaysiaInputFromIso(attendanceBreak.startedAt),
      })),
      enteredAt: malaysiaInputFromIso(session.enteredAt),
      exitedAt: malaysiaInputFromIso(session.exitedAt),
      key: session.id,
    })),
  );
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const defaultTime = `${workDate}T08:00:00`;
  const enterInputRefs = useRef<Map<string, HTMLInputElement | null>>(
    new Map(),
  );
  const exitInputRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const breakStartRefs = useRef<Map<string, HTMLInputElement | null>>(
    new Map(),
  );
  const breakEndRefs = useRef<Map<string, HTMLInputElement | null>>(new Map());
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  // The validation helper is the same one the issue drawer uses to
  // explain a previously rejected correction, so the wording stays in
  // sync. The mapped projection lives inside the memo so the memo
  // depends on the stable `editable` array, not on a new array
  // produced on every render.
  const problems = useMemo(() => {
    const forValidation: EditableCorrectionSession[] = editable.map(
      (session) => ({
        breaks: session.breaks.map((attendanceBreak) => ({
          endedAt: attendanceBreak.endedAt,
          startedAt: attendanceBreak.startedAt,
        })),
        enteredAt: session.enteredAt,
        exitedAt: session.exitedAt,
      }),
    );
    return validateCorrectionSessions(forValidation, workDate);
  }, [editable, workDate]);
  const showProblems = attemptedSubmit && problems.length > 0;
  const noteTrimmedLength = note.trim().length;
  const noteError = attemptedSubmit && noteTrimmedLength < 3;
  const canSubmit = problems.length === 0 && noteTrimmedLength >= 3;

  const enterProblems = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const problem of problems) {
      if (problem.field !== "enter") continue;
      const list = map.get(problem.sessionIndex) ?? [];
      list.push(problem.message);
      map.set(problem.sessionIndex, list);
    }
    return map;
  }, [problems]);
  const exitProblems = useMemo(() => {
    const map = new Map<number, string[]>();
    for (const problem of problems) {
      if (problem.field !== "exit") continue;
      const list = map.get(problem.sessionIndex) ?? [];
      list.push(problem.message);
      map.set(problem.sessionIndex, list);
    }
    return map;
  }, [problems]);
  const breakStartProblems = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const problem of problems) {
      if (problem.field !== "breakStart" || problem.breakIndex === undefined) {
        continue;
      }
      const key = `${problem.sessionIndex}:${problem.breakIndex}`;
      const list = map.get(key) ?? [];
      list.push(problem.message);
      map.set(key, list);
    }
    return map;
  }, [problems]);
  const breakEndProblems = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const problem of problems) {
      if (problem.field !== "breakEnd" || problem.breakIndex === undefined) {
        continue;
      }
      const key = `${problem.sessionIndex}:${problem.breakIndex}`;
      const list = map.get(key) ?? [];
      list.push(problem.message);
      map.set(key, list);
    }
    return map;
  }, [problems]);

  function updateSession(
    key: string,
    update: (session: EditableSession) => EditableSession,
  ) {
    setEditable((current) =>
      current.map((session) =>
        session.key === key ? update(session) : session,
      ),
    );
  }

  function focusFirstProblem() {
    if (problems.length > 0) {
      const first = problems[0]!;
      if (first.field === "enter") {
        enterInputRefs.current
          .get(editable[first.sessionIndex]?.key ?? "")
          ?.focus();
        return;
      }
      if (first.field === "exit") {
        exitInputRefs.current
          .get(editable[first.sessionIndex]?.key ?? "")
          ?.focus();
        return;
      }
      if (first.field === "breakStart" && first.breakIndex !== undefined) {
        const sessionKey = editable[first.sessionIndex]?.key ?? "";
        const breakKey =
          editable[first.sessionIndex]?.breaks[first.breakIndex]?.key ?? "";
        breakStartRefs.current.get(`${sessionKey}:${breakKey}`)?.focus();
        return;
      }
      if (first.field === "breakEnd" && first.breakIndex !== undefined) {
        const sessionKey = editable[first.sessionIndex]?.key ?? "";
        const breakKey =
          editable[first.sessionIndex]?.breaks[first.breakIndex]?.key ?? "";
        breakEndRefs.current.get(`${sessionKey}:${breakKey}`)?.focus();
        return;
      }
    }
    // Sessions are valid but the reason is missing or too short.
    // Move focus to the reason textarea so the user sees why saving
    // is blocked.
    if (noteTrimmedLength < 3) {
      noteRef.current?.focus();
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttemptedSubmit(true);
    if (!canSubmit) {
      focusFirstProblem();
      return;
    }
    onSave(
      editable.map((session) => ({
        breaks: session.breaks.map((attendanceBreak) => ({
          endedAt: attendanceBreak.endedAt
            ? inputToIso(attendanceBreak.endedAt)
            : null,
          id: crypto.randomUUID(),
          startedAt: inputToIso(attendanceBreak.startedAt),
        })),
        enteredAt: inputToIso(session.enteredAt),
        exitedAt: session.exitedAt ? inputToIso(session.exitedAt) : null,
        id: crypto.randomUUID(),
      })),
      note.trim(),
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-slate-950/35 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-title"
    >
      <form
        onSubmit={submit}
        noValidate
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-2xl sm:rounded-xl sm:border sm:border-slate-200 sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-violet-700">
              Attendance correction
            </p>
            <h2 id="correction-title" className="mt-1 text-xl font-semibold">
              Correct attendance
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {worker.legalName} · {workDate} · Malaysia time
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close correction"
            className="grid size-11 shrink-0 place-items-center border border-violet-100"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {showProblems ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            <p className="font-semibold">
              Fix {problems.length === 1 ? "this" : "these"} before saving
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {problems.map((problem) => (
                <li
                  key={`${problem.sessionIndex}-${problem.field}-${problem.breakIndex ?? "s"}-${problem.message}`}
                >
                  {problem.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {editable.map((session, sessionIndex) => {
            const enterErrors = enterProblems.get(sessionIndex) ?? [];
            const exitErrors = exitProblems.get(sessionIndex) ?? [];
            const enterInvalid = attemptedSubmit && enterErrors.length > 0;
            const exitInvalid = attemptedSubmit && exitErrors.length > 0;
            const enterErrorId = enterInvalid
              ? `correction-enter-error-${sessionIndex}`
              : undefined;
            const exitErrorId = exitInvalid
              ? `correction-exit-error-${sessionIndex}`
              : undefined;
            return (
              <section
                key={session.key}
                className="border border-violet-100 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Session {sessionIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setEditable((current) =>
                        current.filter((item) => item.key !== session.key),
                      )
                    }
                    className="inline-flex min-h-11 items-center gap-2 px-2 text-sm text-red-700"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Remove
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-slate-600">
                    Enter
                    <input
                      required
                      step={1}
                      type="datetime-local"
                      value={session.enteredAt}
                      aria-invalid={enterInvalid || undefined}
                      aria-describedby={enterErrorId}
                      onChange={(event) =>
                        updateSession(session.key, (current) => ({
                          ...current,
                          enteredAt: event.target.value,
                        }))
                      }
                      ref={(element) => {
                        enterInputRefs.current.set(session.key, element);
                      }}
                      className={cn(
                        "mt-1 h-11 w-full border px-3 text-sm",
                        enterInvalid
                          ? "border-red-400 bg-red-50"
                          : "border-violet-100",
                      )}
                    />
                    {enterInvalid ? (
                      <p
                        id={enterErrorId}
                        className="mt-1 text-[0.6875rem] font-medium text-red-700"
                      >
                        {enterErrors.join(" ")}
                      </p>
                    ) : null}
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Exit (leave blank if incomplete)
                    <input
                      step={1}
                      type="datetime-local"
                      value={session.exitedAt}
                      aria-invalid={exitInvalid || undefined}
                      aria-describedby={exitErrorId}
                      onChange={(event) =>
                        updateSession(session.key, (current) => ({
                          ...current,
                          exitedAt: event.target.value,
                        }))
                      }
                      ref={(element) => {
                        exitInputRefs.current.set(session.key, element);
                      }}
                      className={cn(
                        "mt-1 h-11 w-full border px-3 text-sm",
                        exitInvalid
                          ? "border-red-400 bg-red-50"
                          : "border-violet-100",
                      )}
                    />
                    {exitInvalid ? (
                      <p
                        id={exitErrorId}
                        className="mt-1 text-[0.6875rem] font-medium text-red-700"
                      >
                        {exitErrors.join(" ")}
                      </p>
                    ) : null}
                  </label>
                </div>

                {session.breaks.map((attendanceBreak, breakIndex) => {
                  const breakKey = `${session.key}:${attendanceBreak.key}`;
                  const startErrors =
                    breakStartProblems.get(`${sessionIndex}:${breakIndex}`) ??
                    [];
                  const endErrors =
                    breakEndProblems.get(`${sessionIndex}:${breakIndex}`) ?? [];
                  const startInvalid =
                    attemptedSubmit && startErrors.length > 0;
                  const endInvalid = attemptedSubmit && endErrors.length > 0;
                  const startErrorId = startInvalid
                    ? `correction-break-start-error-${sessionIndex}-${breakIndex}`
                    : undefined;
                  const endErrorId = endInvalid
                    ? `correction-break-end-error-${sessionIndex}-${breakIndex}`
                    : undefined;
                  return (
                    <div
                      key={attendanceBreak.key}
                      className="mt-3 grid gap-3 border-l-2 border-amber-300 pl-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <label className="text-xs font-semibold text-slate-600">
                        Break {breakIndex + 1} start
                        <input
                          required
                          step={1}
                          type="datetime-local"
                          value={attendanceBreak.startedAt}
                          aria-invalid={startInvalid || undefined}
                          aria-describedby={startErrorId}
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
                          ref={(element) => {
                            breakStartRefs.current.set(breakKey, element);
                          }}
                          className={cn(
                            "mt-1 h-11 w-full border px-3 text-sm",
                            startInvalid
                              ? "border-red-400 bg-red-50"
                              : "border-violet-100",
                          )}
                        />
                        {startInvalid ? (
                          <p
                            id={startErrorId}
                            className="mt-1 text-[0.6875rem] font-medium text-red-700"
                          >
                            {startErrors.join(" ")}
                          </p>
                        ) : null}
                      </label>
                      <label className="text-xs font-semibold text-slate-600">
                        Break end
                        <input
                          step={1}
                          type="datetime-local"
                          value={attendanceBreak.endedAt}
                          aria-invalid={endInvalid || undefined}
                          aria-describedby={endErrorId}
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
                          ref={(element) => {
                            breakEndRefs.current.set(breakKey, element);
                          }}
                          className={cn(
                            "mt-1 h-11 w-full border px-3 text-sm",
                            endInvalid
                              ? "border-red-400 bg-red-50"
                              : "border-violet-100",
                          )}
                        />
                        {endInvalid ? (
                          <p
                            id={endErrorId}
                            className="mt-1 text-[0.6875rem] font-medium text-red-700"
                          >
                            {endErrors.join(" ")}
                          </p>
                        ) : null}
                      </label>
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
                        aria-label={`Remove break ${breakIndex + 1}`}
                        className="mt-auto grid size-11 place-items-center border border-violet-100 text-red-700"
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
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
                          startedAt: defaultTime,
                        },
                      ],
                    }))
                  }
                  className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-amber-800"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add break
                </button>
              </section>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() =>
            setEditable((current) => [
              ...current,
              {
                breaks: [],
                enteredAt: defaultTime,
                exitedAt: "",
                key: crypto.randomUUID(),
              },
            ])
          }
          className="mt-4 inline-flex min-h-11 items-center gap-2 border border-violet-100 px-4 text-sm font-semibold"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add session
        </button>

        <label className="mt-5 block text-sm font-semibold">
          Reason for correction
          <textarea
            required
            minLength={3}
            maxLength={500}
            value={note}
            aria-invalid={noteError || undefined}
            aria-describedby={noteError ? "correction-note-error" : undefined}
            onChange={(event) => setNote(event.target.value)}
            ref={noteRef}
            placeholder="Explain what was corrected for the audit history…"
            className={cn(
              "mt-2 min-h-24 w-full border p-3 text-sm",
              noteError ? "border-red-400 bg-red-50" : "border-violet-100",
            )}
          />
          {noteError ? (
            <p
              id="correction-note-error"
              className="mt-1 text-[0.6875rem] font-medium text-red-700"
            >
              Add a reason of at least 3 characters so the audit history is
              useful.
            </p>
          ) : null}
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 border border-violet-100 px-4 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-12 bg-violet-700 px-4 font-semibold text-white"
          >
            Save correction
          </button>
        </div>
      </form>
    </div>
  );
}

type SyncResult = {
  clientActionId: string;
  result: {
    message: string;
    status: "SYNCED" | "FAILED" | "CONFLICT";
  };
};

type Classification = {
  issueKind: AttendanceIssueKind | null;
  message: string | null;
  state: AttendanceActionState;
};

function classifySyncResult(
  action: AttendanceQueueAction,
  result: SyncResult["result"] | null,
): Classification {
  if (result?.status === "SYNCED") {
    return {
      issueKind: null,
      message: null,
      state: "SYNCED",
    };
  }
  if (result?.status === "CONFLICT") {
    return {
      issueKind: "CONFLICT",
      message: result.message,
      state: "REVIEW_REQUIRED",
    };
  }
  if (result?.status === "FAILED") {
    return {
      issueKind: classifyIssue({
        ...action,
        message: result.message,
        serverStatus: result.status,
      }),
      message: result.message,
      state: "REVIEW_REQUIRED",
    };
  }
  return {
    issueKind: "UNKNOWN",
    message: "No server response was received.",
    state: "RETRYABLE",
  };
}

export function AttendanceWorkspace({
  context = "today",
  initialSnapshot,
  mode = "FOREMAN",
}: {
  context?: "history" | "today";
  initialSnapshot: AttendanceSnapshot | null;
  mode?: "CEO" | "FOREMAN";
}) {
  const WorkspaceRoot = mode === "CEO" ? "div" : "main";
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [actions, setActions] = useState<AttendanceQueueAction[]>([]);
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WorkerFilter>("ALL");
  const [visibleCount, setVisibleCount] = useState(ATTENDANCE_PAGE_SIZE);
  const [message, setMessage] = useState<string | null>(null);
  const [correctingWorker, setCorrectingWorker] =
    useState<AttendanceWorker | null>(null);
  const [hydratingDevice, setHydratingDevice] = useState(!initialSnapshot);
  const [loadingDate, setLoadingDate] = useState(false);
  const [selectedWorkDate, setSelectedWorkDate] = useState(
    initialSnapshot?.workDate ?? "",
  );
  const [syncingNow, setSyncingNow] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [focusedIssueKey, setFocusedIssueKey] = useState<string | null>(null);
  const synchronizing = useRef(false);
  const retryTimer = useRef<number | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const reloadActions = useCallback(async (projectId?: string) => {
    const stored = await listAttendanceActions(projectId);
    const snapshot = snapshotRef.current;
    if (snapshot) {
      const { actions: normalized, inferred } = inferLegacyActionMetadata(
        stored,
        snapshot,
      );
      if (inferred) {
        // `inferLegacyActionMetadata` preserves the input identity for
        // unchanged rows and returns a new object only when workerId or
        // workDate was repaired, so identity comparison is the right
        // (and cheaper) signal for "this row needs to be persisted".
        const repaired = normalized.filter(
          (action, index) => action !== stored[index],
        );
        await Promise.all(
          repaired.map((action) => saveAttendanceAction(action)),
        );
      }
      setActions(normalized);
    } else {
      setActions(stored);
    }
  }, []);

  const refreshSnapshot = useCallback(
    async (projectId: string, workDate: string) => {
      const response = await fetch(
        `/api/attendance/bootstrap?date=${encodeURIComponent(workDate)}&project=${encodeURIComponent(projectId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error("Attendance could not be refreshed.");
      }
      const data = (await response.json()) as {
        snapshot: AttendanceSnapshot | null;
      };
      if (data.snapshot) {
        const deviceActions = await listAttendanceActions(projectId);
        const updatedSnapshot = deviceActions
          .filter(
            (action) =>
              action.state === "PENDING" || action.state === "SYNCING",
          )
          .reduce(
            (current, action) => applyLocalAttendanceAction(current, action),
            data.snapshot,
          );
        setSnapshot(updatedSnapshot);
        setSelectedWorkDate(updatedSnapshot.workDate);
        snapshotRef.current = updatedSnapshot;
        await saveAttendanceSnapshot(updatedSnapshot);
      }
    },
    [],
  );

  const synchronize = useCallback(
    async (projectId: string, workDate: string) => {
      if (synchronizing.current || !navigator.onLine) return;
      synchronizing.current = true;
      setSyncingNow(true);
      let retryAfterMs: number | null = null;
      let requestTimeout: number | null = null;
      try {
        const stored = await listAttendanceActions(projectId);
        const pending = stored.filter(
          (action) => action.state === "PENDING" || action.state === "SYNCING",
        );
        if (pending.length === 0) return;

        const pendingIds = new Set(
          pending.map((action) => action.clientActionId),
        );
        const reset: AttendanceQueueAction[] = pending.map((action) => ({
          ...action,
          issueKind: null,
          lastAttemptAt: new Date().toISOString(),
          message: null,
          state: "SYNCING",
        }));
        setActions((current) =>
          current.map((action) =>
            pendingIds.has(action.clientActionId)
              ? {
                  ...action,
                  issueKind: null,
                  lastAttemptAt: new Date().toISOString(),
                  message: null,
                  state: "SYNCING",
                }
              : action,
          ),
        );
        await Promise.all(reset.map((action) => saveAttendanceAction(action)));

        const controller = new AbortController();
        requestTimeout = window.setTimeout(
          () => controller.abort(),
          SYNC_REQUEST_TIMEOUT_MS,
        );
        try {
          const response = await fetch("/api/attendance/sync", {
            body: JSON.stringify({
              actions: pending.map((action) => ({
                actionType: action.actionType,
                clientActionId: action.clientActionId,
                payload: action.payload,
                projectId: action.projectId,
              })),
            }),
            headers: { "Content-Type": "application/json" },
            method: "POST",
            signal: controller.signal,
          });

          if (response.status === 401 || response.status === 403) {
            const updated: AttendanceQueueAction[] = pending.map((action) => ({
              ...action,
              issueKind: "AUTHORIZATION",
              message: "Sign in again or restore project access, then retry.",
              serverStatus: null,
              state: "RETRYABLE",
            }));
            await Promise.all(
              updated.map((action) => saveAttendanceAction(action)),
            );
            setActions((current) =>
              current.map((action) =>
                pendingIds.has(action.clientActionId)
                  ? (updated.find(
                      (u) => u.clientActionId === action.clientActionId,
                    ) ?? action)
                  : action,
              ),
            );
            setMessage("Sign in again or restore project access, then retry.");
            return;
          }

          if (!response.ok) {
            if (response.status >= 500) {
              throw new Error("The attendance service is temporarily busy.");
            }
            // 408 and 429 are transient and should retry on the next
            // sync; do not change state to REVIEW_REQUIRED.
            if (response.status === 408 || response.status === 429) {
              throw new Error("The attendance service is temporarily busy.");
            }
            // Other non-OK 4xx responses are deterministic for the
            // same payload (e.g. 400, 404, 409, 422). Mark them
            // REVIEW_REQUIRED so a retry does not silently resend the
            // same malformed request forever.
            let responseMessage: string | null = null;
            try {
              const body = (await response.clone().json()) as {
                message?: unknown;
              };
              if (body && typeof body.message === "string" && body.message) {
                responseMessage = body.message;
              }
            } catch {
              responseMessage = null;
            }
            const fallbackMessage =
              "The server could not process these changes.";
            const updated: AttendanceQueueAction[] = pending.map((action) => ({
              ...action,
              issueKind: "UNKNOWN",
              message: responseMessage ?? fallbackMessage,
              serverStatus: null,
              state: "REVIEW_REQUIRED",
            }));
            await Promise.all(
              updated.map((action) => saveAttendanceAction(action)),
            );
            setActions((current) =>
              current.map((action) =>
                pendingIds.has(action.clientActionId)
                  ? (updated.find(
                      (u) => u.clientActionId === action.clientActionId,
                    ) ?? action)
                  : action,
              ),
            );
            setMessage(responseMessage ?? fallbackMessage);
            return;
          }

          const body = (await response.json()) as { results: SyncResult[] };
          const results = new Map(
            body.results.map((result) => [
              result.clientActionId,
              result.result,
            ]),
          );
          const next = pending.map((action) => {
            const result = results.get(action.clientActionId) ?? null;
            const classification = classifySyncResult(action, result);
            return {
              ...action,
              issueKind: classification.issueKind,
              lastAttemptAt: new Date().toISOString(),
              message: classification.message,
              serverStatus: result?.status ?? null,
              state: classification.state,
            } satisfies AttendanceQueueAction;
          });
          await Promise.all(next.map((action) => saveAttendanceAction(action)));
          setActions((current) => {
            const nextMap = new Map(
              next.map((action) => [action.clientActionId, action]),
            );
            return current.map(
              (action) => nextMap.get(action.clientActionId) ?? action,
            );
          });

          let hasRetryable = false;
          for (const action of next) {
            if (action.state === "RETRYABLE") {
              hasRetryable = true;
            }
          }
          // The red issue banner above the summary already explains
          // review-required actions, so we do not duplicate that copy
          // in the page-level message strip.
          if (hasRetryable) {
            setMessage("Some changes could not be sent and can be retried.");
          } else {
            setMessage("Attendance synchronized.");
          }
          // A successful CORRECT_DAY resolves every older REVIEW_REQUIRED
          // action for the same project, worker, and work date. Delete the
          // resolved queue rows now so the grouped issue card disappears.
          // The correction action itself remains in the queue and is
          // pruned by `pruneSyncedAttendanceActions` once the snapshot is
          // refreshed.
          //
          // Older terminal REVIEW_REQUIRED actions are not in `next` (which
          // only holds the just-classified pending actions). Merge `next`
          // into the stored queue so the cleanup can see them.
          const nextMap = new Map(
            next.map((action) => [action.clientActionId, action]),
          );
          const mergedQueue = stored.map(
            (action) => nextMap.get(action.clientActionId) ?? action,
          );
          const successfulCorrections = next.filter(
            (action) =>
              action.actionType === "CORRECT_DAY" && action.state === "SYNCED",
          );
          if (successfulCorrections.length > 0) {
            const removableIds = new Set<string>();
            for (const correction of successfulCorrections) {
              const ids = selectResolutionsAfterCorrection(
                mergedQueue,
                correction,
              );
              for (const id of ids) {
                if (id !== correction.clientActionId) {
                  removableIds.add(id);
                }
              }
            }
            if (removableIds.size > 0) {
              await deleteAttendanceActions([...removableIds]);
              setActions((current) =>
                current.filter(
                  (action) => !removableIds.has(action.clientActionId),
                ),
              );
            }
          }
          try {
            await refreshSnapshot(projectId, workDate);
            await pruneSyncedAttendanceActions(projectId);
            await reloadActions(projectId);
          } catch {
            setMessage(
              "Attendance synchronized, but the latest view could not be refreshed.",
            );
          }
        } catch {
          await Promise.all(
            pending.map((action) =>
              saveAttendanceAction({
                ...action,
                issueKind: null,
                lastAttemptAt: new Date().toISOString(),
                message: "Sync paused. It will retry automatically.",
                serverStatus: null,
                state: "PENDING",
              }),
            ),
          );
          setActions((current) =>
            current.map((action) =>
              pendingIds.has(action.clientActionId)
                ? {
                    ...action,
                    issueKind: null,
                    lastAttemptAt: new Date().toISOString(),
                    message: "Sync paused. It will retry automatically.",
                    serverStatus: null,
                    state: "PENDING",
                  }
                : action,
            ),
          );
          setMessage(
            "Sync paused. Your attendance is safe on this device and will retry automatically.",
          );
          retryAfterMs = SYNC_RETRY_DELAY_MS;
        } finally {
          if (requestTimeout !== null) {
            window.clearTimeout(requestTimeout);
          }
        }
      } finally {
        synchronizing.current = false;
        setSyncingNow(false);
        const remaining = await listAttendanceActions(projectId);
        if (
          navigator.onLine &&
          remaining.some(
            (action) =>
              action.state === "PENDING" || action.state === "SYNCING",
          )
        ) {
          if (retryTimer.current !== null) {
            window.clearTimeout(retryTimer.current);
          }
          retryTimer.current = window.setTimeout(() => {
            void synchronize(projectId, workDate);
          }, retryAfterMs ?? 0);
        }
      }
    },
    [refreshSnapshot, reloadActions],
  );

  useEffect(() => {
    const current = initialSnapshot;

    async function initialize() {
      try {
        if (current) {
          await saveAttendanceSnapshot(current);
          await reloadActions(current.projectId);
          if (navigator.onLine) {
            await synchronize(current.projectId, current.workDate);
          }
        } else {
          const cached = await loadLatestAttendanceSnapshot();
          setSnapshot(cached);
          setSelectedWorkDate(cached?.workDate ?? "");
          snapshotRef.current = cached;
          await reloadActions(cached?.projectId);
        }
      } catch {
        setMessage(
          "Saved attendance could not be opened on this device. Reload the page to try again.",
        );
      } finally {
        setHydratingDevice(false);
      }
    }
    void initialize();

    function onlineHandler() {
      const currentSnapshot = snapshotRef.current;
      if (currentSnapshot) {
        void synchronize(currentSnapshot.projectId, currentSnapshot.workDate);
      }
    }
    window.addEventListener("online", onlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
      }
    };
    // The initial cache hydration should run once for this mounted workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(
    async (
      actionType: AttendanceActionType,
      payload: Record<string, unknown>,
    ) => {
      const currentSnapshot = snapshotRef.current;
      if (!currentSnapshot) return;
      const workerId =
        typeof payload.workerId === "string" ? payload.workerId : null;
      const workDate =
        typeof payload.workDate === "string"
          ? payload.workDate
          : currentSnapshot.workDate;
      const action: AttendanceQueueAction = {
        actionType,
        clientActionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: {
          ...payload,
          capturedOffline: !navigator.onLine,
        },
        projectId: currentSnapshot.projectId,
        serverStatus: null,
        state: "PENDING",
        workDate,
        workerId,
      };
      const next = applyLocalAttendanceAction(currentSnapshot, action);
      snapshotRef.current = next;
      setSnapshot(next);
      setActions((current) => [...current, action]);
      setMessage(
        navigator.onLine
          ? "Saved. Synchronizing with the server."
          : "Saved on this device. It will synchronize when the connection returns.",
      );
      try {
        await Promise.all([
          saveAttendanceAction(action),
          saveAttendanceSnapshot(next),
        ]);
        if (navigator.onLine) {
          void synchronize(currentSnapshot.projectId, currentSnapshot.workDate);
        }
      } catch {
        // Local persistence failed: roll the optimistic snapshot back
        // to the pre-action view so the worker row no longer shows an
        // entrance, exit, or break that the user never confirmed, then
        // mark the action review-required with the existing device
        // storage message.
        snapshotRef.current = currentSnapshot;
        setSnapshot(currentSnapshot);
        setActions((current) =>
          current.map((item) =>
            item.clientActionId === action.clientActionId
              ? {
                  ...item,
                  issueKind: "LOCAL_STORAGE",
                  message: "This action could not be saved on this device.",
                  state: "REVIEW_REQUIRED",
                }
              : item,
          ),
        );
        setMessage(
          "This action could not be saved on this device. Check device storage and try again.",
        );
      }
    },
    [synchronize],
  );

  async function changeDate(workDate: string) {
    if (!snapshot) return;
    setSelectedWorkDate(workDate);
    setVisibleCount(ATTENDANCE_PAGE_SIZE);
    setLoadingDate(true);
    try {
      if (navigator.onLine) {
        await refreshSnapshot(snapshot.projectId, workDate);
        return;
      }
      const cached = await loadAttendanceSnapshot(snapshot.projectId, workDate);
      if (cached) {
        setSnapshot(cached);
        snapshotRef.current = cached;
        setMessage("Showing the saved attendance copy for this date.");
      } else {
        setSelectedWorkDate(snapshot.workDate);
        setMessage("This date is not saved on the device yet.");
      }
    } catch {
      setSelectedWorkDate(snapshot.workDate);
      setMessage("Attendance for this date could not be loaded. Try again.");
    } finally {
      setLoadingDate(false);
    }
  }

  const projectActions = useMemo(
    () =>
      snapshot
        ? actions.filter((action) => action.projectId === snapshot.projectId)
        : actions,
    [actions, snapshot],
  );

  const actionsByWorker = useMemo(() => {
    const map = new Map<string, AttendanceQueueAction[]>();
    if (!snapshot) return map;
    for (const action of projectActions) {
      if (action.workDate !== snapshot.workDate) continue;
      if (!action.workerId) continue;
      const list = map.get(action.workerId);
      if (list) {
        list.push(action);
      } else {
        map.set(action.workerId, [action]);
      }
    }
    return map;
  }, [projectActions, snapshot]);

  const workerViews = useMemo(() => {
    if (!snapshot) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return snapshot.workers
      .map((worker) => {
        const sessions = snapshot.sessions.filter(
          (session) => session.workerId === worker.id,
        );
        const state = workerState(sessions);
        const calculation = calculateAttendance(
          sessions,
          snapshot.dayType,
          snapshot.workDate,
        );
        const workerActions = actionsByWorker.get(worker.id) ?? [];
        const reviewAction = primaryReviewAction(workerActions);
        const latest = [...workerActions].sort((left, right) =>
          right.createdAt.localeCompare(left.createdAt),
        )[0];
        const localAction =
          latest && latest.state !== "SYNCED" ? latest : undefined;
        return {
          calculation,
          localAction,
          reviewAction,
          sessions,
          state,
          worker,
        };
      })
      .filter(({ calculation, state, worker }) => {
        const searchable = [
          worker.legalName,
          worker.tradeName,
          worker.skillName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const filterMatches =
          filter === "ALL" ||
          (filter === "NOT_ENTERED" && state.label === "Not entered") ||
          (filter === "ON_SITE" && state.label === "On site") ||
          (filter === "ON_BREAK" && state.label === "On break") ||
          (filter === "EXITED" && state.label === "Exited") ||
          (filter === "LEAVE" && Boolean(worker.approvedLeaveType)) ||
          (filter === "INCOMPLETE" &&
            calculation.status === "INCOMPLETE" &&
            (context !== "today" || !state.openSession)) ||
          (filter === "INVALID" && calculation.status === "INVALID");
        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          filterMatches
        );
      })
      .sort((left, right) => {
        const leftIssue =
          (left.calculation.status === "INCOMPLETE" &&
            (context !== "today" || !left.state.openSession)) ||
          left.calculation.status === "INVALID" ||
          left.reviewAction !== null;
        const rightIssue =
          (right.calculation.status === "INCOMPLETE" &&
            (context !== "today" || !right.state.openSession)) ||
          right.calculation.status === "INVALID" ||
          right.reviewAction !== null;
        return Number(rightIssue) - Number(leftIssue);
      });
  }, [actionsByWorker, context, filter, query, snapshot]);

  const pendingCount = projectActions.filter(
    (action) => action.state === "PENDING" || action.state === "SYNCING",
  ).length;
  const retryableCount = projectActions.filter(
    (action) => action.state === "RETRYABLE",
  ).length;
  const reviewGroups = useMemo(
    () => buildAttendanceIssueGroups(projectActions),
    [projectActions],
  );
  const reviewGroupKeyByWorkerDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const group of reviewGroups) {
      const workerKey = group.workerId ?? "unknown";
      const composite = `${workerKey}::${group.workDate}`;
      map.set(composite, issueGroupKey(group));
    }
    return map;
  }, [reviewGroups]);
  const reviewCount = reviewGroups.length;
  const reviewDeviceActionCount = reviewGroups.reduce(
    (sum, group) => sum + group.actionCount,
    0,
  );
  const retryableActionIds = useMemo(
    () => selectRetryableActionIds(projectActions),
    [projectActions],
  );
  const liveSummary = snapshot
    ? snapshot.workers.reduce(
        (summary, worker) => {
          if (worker.approvedLeaveType) {
            return summary;
          }
          const workerSessions = snapshot.sessions.filter(
            (session) => session.workerId === worker.id,
          );
          const state = workerState(workerSessions);
          const calculation = calculateAttendance(
            workerSessions,
            snapshot.dayType,
            snapshot.workDate,
          );
          if (state.label === "On site") {
            summary.onSite += 1;
          } else if (state.label === "On break") {
            summary.onBreak += 1;
          } else if (state.label === "Exited") {
            summary.exited += 1;
          } else {
            summary.notEntered += 1;
          }
          if (
            calculation.status === "INVALID" ||
            (calculation.status === "INCOMPLETE" && !state.openSession)
          ) {
            summary.issues += 1;
          }
          return summary;
        },
        {
          exited: 0,
          issues: 0,
          notEntered: 0,
          onBreak: 0,
          onSite: 0,
        },
      )
    : { exited: 0, issues: 0, notEntered: 0, onBreak: 0, onSite: 0 };

  if (!snapshot && hydratingDevice) {
    return <AttendanceWorkspaceSkeleton compact />;
  }

  if (!snapshot) {
    return (
      <WorkspaceRoot className="px-4 pb-24 pt-8 sm:px-6">
        <div className="border border-dashed border-violet-100 bg-white p-8 text-center">
          <WifiOff
            className="mx-auto size-8 text-slate-400"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-semibold">
            No saved attendance yet
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Open Today once while online after a project and workers are
            assigned. The compact worksite list will then remain available
            during temporary connection loss.
          </p>
        </div>
      </WorkspaceRoot>
    );
  }

  const correctionSessions = correctingWorker
    ? snapshot.sessions.filter(
        (session) => session.workerId === correctingWorker.id,
      )
    : [];

  const handleReview = (group: (typeof reviewGroups)[number]) => {
    const worker = snapshot.workers.find((w) => w.id === group.workerId);
    if (!worker) {
      setMessage(
        "This device change is not linked to a worker on this date. Discard it and record the attendance again.",
      );
      return;
    }
    setCorrectingWorker(worker);
    setIssuesOpen(false);
  };

  const handleDiscard = async (actionIds: string[]) => {
    await deleteAttendanceActions(actionIds);
    setActions((current) =>
      current.filter((action) => !actionIds.includes(action.clientActionId)),
    );
    if (snapshot && navigator.onLine) {
      try {
        await refreshSnapshot(snapshot.projectId, snapshot.workDate);
      } catch {
        // ignore; the user already saw the issue center
      }
    }
    setMessage("Device actions discarded. Server attendance was not changed.");
  };

  const handleRetry = async (actionIds: string[]) => {
    if (actionIds.length === 0) return;
    const next = actions
      .filter((action) => actionIds.includes(action.clientActionId))
      .map((action) => ({
        ...action,
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        serverStatus: null,
        state: "PENDING" as const,
      }));
    await Promise.all(next.map((action) => saveAttendanceAction(action)));
    setActions((current) => {
      const nextMap = new Map(
        next.map((action) => [action.clientActionId, action]),
      );
      return current.map(
        (action) => nextMap.get(action.clientActionId) ?? action,
      );
    });
    if (snapshot) {
      await synchronize(snapshot.projectId, snapshot.workDate);
    }
  };

  return (
    <WorkspaceRoot>
      {mode === "FOREMAN" ? (
        <section className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.6875rem] font-semibold text-violet-700">
              {context === "history" ? "Attendance history" : "Live operations"}
            </p>
            <h1 className="font-heading text-xl font-semibold">
              {context === "history" ? "Attendance" : "Today"}
            </h1>
            <p className="truncate text-xs text-slate-500">
              {snapshot.projectName}
            </p>
          </div>
          <div className="flex items-end gap-2">
            {context === "history" ? (
              <label className="text-[0.625rem] font-semibold text-slate-500">
                Work date
                <input
                  type="date"
                  disabled={loadingDate}
                  value={selectedWorkDate}
                  onChange={(event) => void changeDate(event.target.value)}
                  className="mt-1 block h-10 w-39 border border-slate-200 bg-white px-2 text-xs font-medium"
                />
              </label>
            ) : (
              <span className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {malaysiaDateLabel(selectedWorkDate)}
              </span>
            )}
            <label className="text-[0.625rem] font-semibold text-slate-500">
              <span className="sr-only">Day type</span>
              <select
                aria-label="Day type"
                disabled={loadingDate}
                value={snapshot.dayType}
                onChange={(event) =>
                  void enqueue("SET_DAY_TYPE", {
                    dayType: event.target.value,
                    workDate: snapshot.workDate,
                  })
                }
                className="block h-10 max-w-35 border border-slate-200 bg-white px-2 text-xs font-medium"
              >
                <option value="NORMAL">Normal day</option>
                <option value="SUNDAY">Sunday</option>
                <option value="PUBLIC_HOLIDAY">Public holiday</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Attendance sync status"
        aria-live="polite"
        className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs"
      >
        {(() => {
          // Pick the highest-priority live state. We never show
          // "Synchronizing 0 actions" and the row always occupies the same
          // height so the layout does not shift between syncs.
          if (syncingNow && pendingCount > 0) {
            return (
              <>
                <LoaderCircle
                  className="size-3.5 shrink-0 animate-spin text-violet-700"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-slate-700">
                  Synchronizing attendance…
                </span>
              </>
            );
          }
          if (!online) {
            return (
              <>
                <WifiOff
                  className="size-3.5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-slate-700">
                  {pendingCount > 0
                    ? `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} saved on this device`
                    : "Offline · attendance changes will sync when you reconnect"}
                </span>
              </>
            );
          }
          if (pendingCount > 0) {
            return (
              <>
                <LoaderCircle
                  className="size-3.5 shrink-0 animate-spin text-violet-700"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-slate-700">
                  {pendingCount === 1
                    ? "1 change waiting to synchronize"
                    : `${pendingCount} changes waiting to synchronize`}
                </span>
              </>
            );
          }
          if (retryableCount > 0) {
            return (
              <>
                <AlertTriangle
                  className="size-3.5 shrink-0 text-amber-700"
                  aria-hidden="true"
                />
                <span className="truncate font-semibold text-amber-900">
                  {retryableCount === 1
                    ? "1 change could not be sent"
                    : `${retryableCount} changes could not be sent`}
                </span>
              </>
            );
          }
          return (
            <>
              <Check
                className="size-3.5 shrink-0 text-emerald-600"
                aria-hidden="true"
              />
              <span className="truncate font-semibold text-slate-700">
                Attendance synchronized
              </span>
            </>
          );
        })()}
        {retryableCount > 0 ? (
          <button
            type="button"
            disabled={!online || syncingNow}
            onClick={async () => {
              if (!snapshot) return;
              await handleRetry(retryableActionIds);
            }}
            className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-semibold text-amber-800 disabled:text-slate-400"
          >
            <RefreshCw
              className={cn("size-3.5", syncingNow && "animate-spin")}
              aria-hidden="true"
            />
            Retry
          </button>
        ) : null}
      </section>

      {reviewCount > 0 ? (
        <section
          role="alert"
          aria-live="polite"
          className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs"
        >
          <AlertTriangle
            className="size-4 shrink-0 text-red-700"
            aria-hidden="true"
          />
          <p className="font-semibold text-red-800">
            {reviewCount}{" "}
            {reviewCount === 1 ? "attendance record" : "attendance records"}{" "}
            need review
          </p>
          <p className="text-red-800/80">
            {reviewDeviceActionCount}{" "}
            {reviewDeviceActionCount === 1 ? "device action" : "device actions"}{" "}
            could not be applied
          </p>
          <button
            type="button"
            onClick={() => setIssuesOpen(true)}
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-3 text-xs font-semibold text-white"
          >
            Review issues
          </button>
        </section>
      ) : null}

      {loadingDate ? (
        <section
          aria-label="Loading attendance summary for the selected date"
          aria-busy="true"
          className="mt-3 grid grid-cols-5 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="space-y-2 border-r border-slate-200 px-1 py-2 text-center last:border-0 sm:px-3"
            >
              <Skeleton className="mx-auto h-5 w-8" />
              <Skeleton className="mx-auto h-2.5 w-12 max-w-full" />
            </div>
          ))}
        </section>
      ) : (
        <section
          aria-label="Attendance summary"
          className="mt-3 grid grid-cols-5 overflow-hidden rounded-lg border border-slate-200 bg-white"
        >
          {[
            ["Expected", snapshot.workers.length],
            ["Not entered", liveSummary.notEntered],
            ["On site", liveSummary.onSite],
            ["On break", liveSummary.onBreak],
            ["Issues", liveSummary.issues + reviewCount],
          ].map(([label, value]) => (
            <div
              key={label}
              className={cn(
                "border-r border-slate-200 px-1 py-2 text-center last:border-0 sm:px-3",
                label === "Issues" && Number(value) > 0 && "bg-red-50",
              )}
            >
              <p
                className={cn(
                  "text-base font-semibold tabular-nums text-slate-950 sm:text-lg",
                  label === "Issues" && Number(value) > 0 && "text-red-700",
                )}
              >
                {value}
              </p>
              <p className="truncate text-[0.625rem] text-slate-500 sm:text-xs">
                {label}
              </p>
            </div>
          ))}
        </section>
      )}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-3 px-3 py-2 text-xs text-slate-600"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-3">
        <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-20 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:static">
          <label className="relative block">
            <span className="sr-only">Search workers</span>
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(ATTENDANCE_PAGE_SIZE);
              }}
              placeholder="Search worker, trade, or skill…"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm"
            />
          </label>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {workerFilters.slice(0, 3).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setFilter(value);
                  setVisibleCount(ATTENDANCE_PAGE_SIZE);
                }}
                aria-pressed={filter === value}
                className={cn(
                  "min-h-10 rounded-lg border px-2 text-xs font-semibold",
                  filter === value
                    ? "border-violet-700 bg-violet-50 text-violet-800"
                    : "border-slate-200 bg-white text-slate-700",
                )}
              >
                {label}
              </button>
            ))}
            <AttendanceFilterSheet
              filter={filter}
              onChange={(value) => {
                setFilter(value);
                setVisibleCount(ATTENDANCE_PAGE_SIZE);
              }}
            />
          </div>
          {filter !== "ALL" &&
          !workerFilters.slice(0, 3).some(([value]) => value === filter) ? (
            <p className="mt-2 text-xs font-semibold text-violet-700">
              Filter:{" "}
              {workerFilters.find(([value]) => value === filter)?.[1] ?? filter}
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-3" aria-label="Worker attendance">
        {loadingDate ? (
          <AttendanceListSkeleton />
        ) : workerViews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <CalendarDays
              className="mx-auto size-7 text-slate-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 font-semibold">No workers match this view</h2>
            <p className="mt-1 text-sm text-slate-500">
              Clear the search or choose another status.
            </p>
            <button
              type="button"
              onClick={() => {
                setFilter("ALL");
                setQuery("");
                setVisibleCount(ATTENDANCE_PAGE_SIZE);
              }}
              className="mt-4 min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold"
            >
              Clear search and filters
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-visible rounded-lg border border-slate-200 bg-white">
              {workerViews
                .slice(0, visibleCount)
                .map(
                  ({
                    calculation,
                    localAction,
                    reviewAction: workerReview,
                    state,
                    worker,
                  }) => {
                    const hasIssue =
                      (calculation.status === "INCOMPLETE" &&
                        (context !== "today" || !state.openSession)) ||
                      calculation.status === "INVALID" ||
                      workerReview !== null;
                    const firstSession = state.ordered[0];
                    const lastSession = state.ordered.at(-1);
                    return (
                      <article
                        key={worker.id}
                        className={cn(
                          "relative flex min-h-18 items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0",
                          hasIssue && "bg-red-50/45",
                        )}
                      >
                        <WorkerAvatar
                          workerId={worker.id}
                          photoId={worker.photoId}
                          name={worker.legalName}
                          size="sm"
                          className={cn(
                            hasIssue && "ring-2 ring-red-200 ring-offset-1",
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <h2 className="truncate text-sm font-semibold">
                              {worker.legalName}
                            </h2>
                            <span
                              className={cn(
                                "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold",
                                workerReview
                                  ? "border-red-200 bg-red-50 text-red-800"
                                  : state.label === "On site"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : state.label === "On break"
                                      ? "border-amber-200 bg-amber-50 text-amber-900"
                                      : "border-slate-200 bg-slate-50 text-slate-700",
                              )}
                            >
                              {worker.approvedLeaveType
                                ? "Approved leave"
                                : workerReview
                                  ? "Sync issue"
                                  : state.label}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {[worker.tradeName, worker.skillName]
                              .filter(Boolean)
                              .join(" · ") || "No classification"}
                          </p>
                          {hasIssue ? (
                            <p className="mt-1 truncate text-xs font-medium text-red-700">
                              {workerReview
                                ? presentAttendanceIssue(
                                    workerReview,
                                    snapshot.workDate,
                                  ).rowSummary
                                : calculation.exceptions[0]?.message}
                            </p>
                          ) : state.ordered.length > 0 ? (
                            <p className="mt-1 truncate text-xs tabular-nums text-slate-600">
                              {malaysiaTime(firstSession?.enteredAt ?? null)}–
                              {malaysiaTime(lastSession?.exitedAt ?? null)}
                              {" · "}
                              {formatMinutes(calculation.totalPayableMinutes)}
                            </p>
                          ) : null}
                          {localAction && !hasIssue ? (
                            <p
                              role="status"
                              className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] font-semibold text-amber-800"
                            >
                              {localAction.state === "SYNCING" ? (
                                <LoaderCircle
                                  className="size-3 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Check className="size-3" aria-hidden="true" />
                              )}
                              {actionStateLabel(localAction)}
                            </p>
                          ) : null}
                        </div>

                        {worker.approvedLeaveType ? null : mode === "CEO" ||
                          context === "history" ? (
                          <button
                            type="button"
                            onClick={() => setCorrectingWorker(worker)}
                            aria-label={`Review attendance for ${worker.legalName}`}
                            className="grid size-11 shrink-0 place-items-center rounded-lg text-violet-700 hover:bg-violet-50"
                          >
                            <ChevronRight
                              className="size-5"
                              aria-hidden="true"
                            />
                          </button>
                        ) : workerReview ? (
                          <button
                            type="button"
                            onClick={() => {
                              const composite = `${worker.id}::${snapshot.workDate}`;
                              setFocusedIssueKey(
                                reviewGroupKeyByWorkerDate.get(composite) ??
                                  null,
                              );
                              setIssuesOpen(true);
                            }}
                            className="inline-flex min-h-10 shrink-0 items-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700"
                          >
                            Review
                          </button>
                        ) : !state.openSession ? (
                          <button
                            type="button"
                            onClick={() =>
                              void enqueue("ENTER", {
                                occurredAt: new Date().toISOString(),
                                sessionId: crypto.randomUUID(),
                                workerId: worker.id,
                                workDate: snapshot.workDate,
                              })
                            }
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white"
                          >
                            <LogIn className="size-4" aria-hidden="true" />
                            Enter
                          </button>
                        ) : state.openBreak ? (
                          <button
                            type="button"
                            onClick={() =>
                              void enqueue("END_BREAK", {
                                breakId: state.openBreak?.id,
                                occurredAt: new Date().toISOString(),
                                workerId: worker.id,
                                workDate: snapshot.workDate,
                              })
                            }
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-slate-950"
                          >
                            <Coffee className="size-4" aria-hidden="true" />
                            End break
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              void enqueue("EXIT", {
                                occurredAt: new Date().toISOString(),
                                sessionId: state.openSession?.id,
                                workerId: worker.id,
                                workDate: snapshot.workDate,
                              })
                            }
                            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-violet-700 px-3 text-xs font-semibold text-white"
                          >
                            <LogOut className="size-4" aria-hidden="true" />
                            Exit
                          </button>
                        )}

                        {mode === "FOREMAN" &&
                        context === "today" &&
                        !worker.approvedLeaveType &&
                        !hasIssue ? (
                          <details className="group relative shrink-0">
                            <summary
                              aria-label={`More attendance actions for ${worker.legalName}`}
                              className="grid size-10 cursor-pointer list-none place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
                            >
                              <MoreHorizontal
                                className="size-4"
                                aria-hidden="true"
                              />
                            </summary>
                            <div className="absolute right-0 z-30 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                              {state.openSession && !state.openBreak ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void enqueue("START_BREAK", {
                                      breakId: crypto.randomUUID(),
                                      occurredAt: new Date().toISOString(),
                                      sessionId: state.openSession?.id,
                                      workerId: worker.id,
                                      workDate: snapshot.workDate,
                                    })
                                  }
                                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium hover:bg-amber-50"
                                >
                                  <Coffee
                                    className="size-4"
                                    aria-hidden="true"
                                  />
                                  Start break
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => setCorrectingWorker(worker)}
                                className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium hover:bg-slate-50"
                              >
                                <Pencil className="size-4" aria-hidden="true" />
                                Correct times
                              </button>
                            </div>
                          </details>
                        ) : null}
                      </article>
                    );
                  },
                )}
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Showing 1–{Math.min(visibleCount, workerViews.length)} of{" "}
                {workerViews.length}
              </p>
              {visibleCount < workerViews.length ? (
                <button
                  type="button"
                  onClick={() =>
                    setVisibleCount((current) => current + ATTENDANCE_PAGE_SIZE)
                  }
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-violet-700"
                >
                  Load next 20
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>

      <AttendanceSyncIssues
        open={issuesOpen}
        focusedGroupKey={focusedIssueKey}
        onClose={() => {
          setIssuesOpen(false);
          setFocusedIssueKey(null);
        }}
        projectActions={projectActions}
        snapshot={snapshot}
        onDiscard={handleDiscard}
        onReview={handleReview}
      />

      {correctingWorker ? (
        <CorrectionPanel
          worker={correctingWorker}
          workDate={snapshot.workDate}
          sessions={correctionSessions}
          onClose={() => setCorrectingWorker(null)}
          onSave={(sessions, note) => {
            const workerId = correctingWorker.id;
            setCorrectingWorker(null);
            void enqueue("CORRECT_DAY", {
              note,
              sessions,
              workerId,
              workDate: snapshot.workDate,
            });
          }}
        />
      ) : null}
    </WorkspaceRoot>
  );
}

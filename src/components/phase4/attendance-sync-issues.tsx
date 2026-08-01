"use client";

import { useMemo, useState } from "react";

import { ChevronDown, ChevronRight, Clock, Trash2, X } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildAttendanceIssueGroups,
  presentAttendanceIssue,
  type AttendanceSyncIssueGroup,
  type CorrectionProblem,
} from "@/lib/phase4/sync-issues";
import type {
  AttendanceBreak,
  AttendanceQueueAction,
  AttendanceSession,
  AttendanceSnapshot,
  AttendanceWorker,
} from "@/lib/phase4/types";
import { cn } from "@/lib/utils";

type AttendanceSyncIssuesProps = {
  focusedGroupKey?: string | null;
  onClose: () => void;
  onDiscard: (actionIds: string[]) => Promise<void> | void;
  onRetry: (actionIds: string[]) => Promise<void> | void;
  onReview: (group: AttendanceSyncIssueGroup) => void;
  open: boolean;
  projectActions: AttendanceQueueAction[];
  retryableActionIds: string[];
  snapshot: AttendanceSnapshot;
};

function malaysiaTime(timestamp: string | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(timestamp));
}

function malaysiaTimeSeconds(timestamp: string | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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

function formatIsoSeconds(iso: string) {
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(iso));
}

function formatSessionDuration(
  enteredAt: string,
  exitedAt: string | null,
): string {
  if (!exitedAt) return "Open";
  const start = new Date(enteredAt).getTime();
  const end = new Date(exitedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return "—";
  }
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) {
    return `${seconds} sec`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes < 60) {
    return remainder === 0
      ? `${minutes} min`
      : `${minutes} min ${remainder} sec`;
  }
  const hours = Math.floor(minutes / 60);
  const leftoverMinutes = minutes % 60;
  return leftoverMinutes === 0
    ? `${hours} h`
    : `${hours} h ${leftoverMinutes} min`;
}

function workerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function BreakRow({
  attendanceBreak,
  breakNumber,
}: {
  attendanceBreak: AttendanceBreak;
  breakNumber: number;
}) {
  return (
    <li>
      <span className="font-semibold text-slate-700">Break {breakNumber}</span>
      <span className="ml-1.5 tabular-nums">
        {formatIsoSeconds(attendanceBreak.startedAt)}–
        {attendanceBreak.endedAt
          ? formatIsoSeconds(attendanceBreak.endedAt)
          : "Open"}
      </span>
    </li>
  );
}

function ServerSessionRow({
  duration,
  session,
  sessionNumber,
}: {
  duration: string;
  session: AttendanceSession;
  sessionNumber: number;
}) {
  const isOpen = !session.exitedAt;
  return (
    <li className="space-y-1 text-[0.6875rem] text-slate-600">
      <div className="flex flex-wrap items-baseline gap-2 text-slate-800">
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
          Session {sessionNumber}
        </span>
        <span className="tabular-nums">
          {formatIsoSeconds(session.enteredAt)}–
          {isOpen ? "Open" : formatIsoSeconds(session.exitedAt as string)}
        </span>
        <span className="text-slate-500">· {duration}</span>
      </div>
      {session.breaks.length > 0 ? (
        <ul className="ml-3 space-y-0.5 border-l-2 border-amber-300 pl-2 text-[0.625rem] text-slate-500">
          {session.breaks.map((attendanceBreak, breakIndex) => (
            <BreakRow
              key={attendanceBreak.id}
              attendanceBreak={attendanceBreak}
              breakNumber={breakIndex + 1}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function ServerRecord({
  sessions,
  worker,
}: {
  sessions: AttendanceSession[];
  worker: AttendanceWorker | null;
}) {
  if (!worker) {
    return (
      <p className="text-[0.6875rem] text-slate-500">
        No current server record was loaded for this worker.
      </p>
    );
  }
  if (sessions.length === 0) {
    return (
      <p className="text-[0.6875rem] text-slate-500">
        {worker.legalName} has no recorded session for this date.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {sessions.map((session, index) => (
        <ServerSessionRow
          key={session.id}
          duration={formatSessionDuration(session.enteredAt, session.exitedAt)}
          session={session}
          sessionNumber={index + 1}
        />
      ))}
    </ul>
  );
}

type AttemptedSession = {
  breaks: Array<{ endedAt: string | null; startedAt: string }>;
  enteredAt: string;
  exitedAt: string | null;
};

function attemptedSessionsFromAction(
  action: AttendanceQueueAction,
): AttemptedSession[] | null {
  if (action.actionType !== "CORRECT_DAY") return null;
  const raw = action.payload.sessions;
  if (!Array.isArray(raw)) return null;
  const result: AttemptedSession[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;
    const enteredAt =
      typeof candidate.enteredAt === "string" ? candidate.enteredAt : null;
    if (!enteredAt) continue;
    const exitedAt =
      typeof candidate.exitedAt === "string" ? candidate.exitedAt : null;
    const breaks = Array.isArray(candidate.breaks)
      ? candidate.breaks
          .map((breakEntry) => {
            if (!breakEntry || typeof breakEntry !== "object") return null;
            const candidateBreak = breakEntry as Record<string, unknown>;
            const startedAt =
              typeof candidateBreak.startedAt === "string"
                ? candidateBreak.startedAt
                : null;
            if (!startedAt) return null;
            const endedAt =
              typeof candidateBreak.endedAt === "string"
                ? candidateBreak.endedAt
                : null;
            return { endedAt, startedAt };
          })
          .filter(
            (value): value is { endedAt: string | null; startedAt: string } =>
              value !== null,
          )
      : [];
    result.push({ breaks, enteredAt, exitedAt });
  }
  return result;
}

function problemsForSession(
  problems: CorrectionProblem[],
  sessionIndex: number,
) {
  return problems.filter(
    (problem) =>
      problem.sessionIndex === sessionIndex && problem.breakIndex === undefined,
  );
}

function problemsForBreak(
  problems: CorrectionProblem[],
  sessionIndex: number,
  breakIndex: number,
) {
  return problems.filter(
    (problem) =>
      problem.sessionIndex === sessionIndex &&
      problem.breakIndex === breakIndex,
  );
}

function AttemptedSessionRow({
  attemptIndex,
  problems,
  session,
}: {
  attemptIndex: number;
  problems: CorrectionProblem[];
  session: AttemptedSession;
}) {
  const sessionProblems = problemsForSession(problems, attemptIndex);
  return (
    <li className="space-y-1 text-[0.6875rem] text-slate-700">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
          Session {attemptIndex + 1}
        </span>
        <span className="tabular-nums">
          {formatIsoSeconds(session.enteredAt)}–
          {session.exitedAt ? formatIsoSeconds(session.exitedAt) : "Open"}
        </span>
      </div>
      {sessionProblems.length > 0 ? (
        <ul className="ml-1 list-disc space-y-0.5 pl-4 text-red-700">
          {sessionProblems.map((problem) => (
            <li key={problem.message}>{problem.message}</li>
          ))}
        </ul>
      ) : null}
      {session.breaks.length > 0 ? (
        <ul className="ml-3 space-y-1 border-l-2 border-amber-300 pl-2">
          {session.breaks.map((attendanceBreak, breakIndex) => {
            const breakProblems = problemsForBreak(
              problems,
              attemptIndex,
              breakIndex,
            );
            return (
              <li key={`${attendanceBreak.startedAt}-${breakIndex}`}>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-semibold text-slate-700">
                    Break {breakIndex + 1}
                  </span>
                  <span className="tabular-nums">
                    {formatIsoSeconds(attendanceBreak.startedAt)}–
                    {attendanceBreak.endedAt
                      ? formatIsoSeconds(attendanceBreak.endedAt)
                      : "Open"}
                  </span>
                </div>
                {breakProblems.length > 0 ? (
                  <ul className="ml-1 mt-0.5 list-disc space-y-0.5 pl-4 text-red-700">
                    {breakProblems.map((problem) => (
                      <li key={problem.message}>{problem.message}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}

function AttemptedChange({
  action,
  problems,
  workDate,
}: {
  action: AttendanceQueueAction;
  problems: CorrectionProblem[];
  workDate: string;
}) {
  const attempted = attemptedSessionsFromAction(action);
  if (attempted && attempted.length > 0) {
    return (
      <ul className="space-y-2">
        {attempted.map((session, index) => (
          <AttemptedSessionRow
            key={`${session.enteredAt}-${index}`}
            attemptIndex={index}
            problems={problems}
            session={session}
          />
        ))}
      </ul>
    );
  }
  const occurredAt =
    typeof action.payload.occurredAt === "string"
      ? action.payload.occurredAt
      : null;
  return (
    <p className="text-[0.6875rem] text-slate-600">
      {humanizeAction(action)}
      {occurredAt ? ` at ${malaysiaTimeSeconds(occurredAt)}` : null}
      {workDate ? ` · work date ${workDate}` : null}
    </p>
  );
}

function humanizeAction(action: AttendanceQueueAction) {
  const occurredAt =
    typeof action.payload.occurredAt === "string"
      ? malaysiaTimeSeconds(action.payload.occurredAt)
      : null;
  switch (action.actionType) {
    case "ENTER":
      return occurredAt ? `Entrance at ${occurredAt}` : "Entrance";
    case "EXIT":
      return occurredAt ? `Exit at ${occurredAt}` : "Exit";
    case "START_BREAK":
      return occurredAt ? `Start break at ${occurredAt}` : "Start break";
    case "END_BREAK":
      return occurredAt ? `End break at ${occurredAt}` : "End break";
    case "SET_DAY_TYPE":
      return `Set day type · ${action.payload.dayType ?? ""}`.trim();
    case "CORRECT_DAY":
      return "Correct day";
  }
}

function truncateId(id: string) {
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

function IssueCard({
  defaultOpen,
  group,
  onDiscard,
  onReview,
  snapshot,
  worker,
}: {
  defaultOpen: boolean;
  group: AttendanceSyncIssueGroup;
  onDiscard: (group: AttendanceSyncIssueGroup) => void;
  onReview: (group: AttendanceSyncIssueGroup) => void;
  snapshot: AttendanceSnapshot;
  worker: AttendanceWorker | null;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const presentation = presentAttendanceIssue(group.rootAction, group.workDate);
  const serverSessions = worker
    ? snapshot.sessions
        .filter((session) => session.workerId === worker.id)
        .sort((left, right) => left.enteredAt.localeCompare(right.enteredAt))
    : [];
  const discardLabel =
    group.actionCount > 1 ? "Discard failed changes" : "Discard failed change";
  return (
    <article className="rounded-lg border border-slate-200 bg-white">
      <header className="flex items-center gap-3 px-3 py-2.5">
        <div
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700"
        >
          {worker ? workerInitials(worker.legalName) : "??"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold">
              {worker?.legalName ?? "Unknown worker"}
            </h3>
            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold",
                presentation.tone === "red" &&
                  "border-red-200 bg-red-50 text-red-800",
                presentation.tone === "amber" &&
                  "border-amber-200 bg-amber-50 text-amber-900",
                presentation.tone === "slate" &&
                  "border-slate-200 bg-slate-50 text-slate-700",
              )}
            >
              {presentation.label}
            </span>
            <span className="text-[0.6875rem] text-slate-500">
              {malaysiaDateLabel(group.workDate)}
            </span>
          </div>
          {worker ? (
            <p className="truncate text-[0.6875rem] text-slate-500">
              {[worker.tradeName, worker.skillName]
                .filter(Boolean)
                .join(" · ") || "No classification"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={`Toggle details for ${worker?.legalName ?? "unknown worker"}`}
          aria-expanded={open}
          className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
        >
          {open ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
        </button>
      </header>

      {open ? (
        <div className="space-y-4 border-t border-slate-100 px-3 py-3 text-xs text-slate-600">
          <section>
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
              {presentation.label}
            </p>
            <p className="mt-1 text-slate-800">{presentation.explanation}</p>
            <p className="mt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              How to fix
            </p>
            <p className="mt-1 text-slate-700">{presentation.resolution}</p>
          </section>

          <section>
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
              Saved on server
            </p>
            <div className="mt-1">
              <ServerRecord sessions={serverSessions} worker={worker} />
            </div>
          </section>

          <section>
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
              Attempted change
            </p>
            <div className="mt-1">
              <AttemptedChange
                action={group.rootAction}
                problems={presentation.correctionProblems}
                workDate={group.workDate}
              />
            </div>
          </section>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => onReview(group)}
              className="min-h-11"
            >
              Correct attendance
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onDiscard(group)}
              className="min-h-11"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              {discardLabel}
            </Button>
          </div>
          <div className="border-t border-slate-100 pt-2">
            <button
              type="button"
              onClick={() => setDetailsOpen((current) => !current)}
              aria-expanded={detailsOpen}
              className="flex min-h-9 items-center gap-1 text-[0.6875rem] font-semibold text-slate-500"
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform",
                  detailsOpen && "rotate-90",
                )}
                aria-hidden="true"
              />
              Technical details
            </button>
            {detailsOpen ? (
              <ul className="mt-2 space-y-1.5 text-[0.625rem] text-slate-500">
                {group.technicalActions.map((action) => (
                  <li
                    key={action.clientActionId}
                    className="rounded border border-slate-100 bg-white p-2"
                  >
                    <p className="font-semibold text-slate-700">
                      {action.actionType}
                    </p>
                    {action.message ? (
                      <p className="mt-0.5">Reason: {action.message}</p>
                    ) : null}
                    {action.serverStatus ? (
                      <p className="mt-0.5">Status: {action.serverStatus}</p>
                    ) : null}
                    {typeof action.payload.occurredAt === "string" ? (
                      <p className="mt-0.5">
                        Attempted:{" "}
                        {malaysiaTimeSeconds(action.payload.occurredAt)}
                      </p>
                    ) : null}
                    <p className="mt-0.5">
                      Created {malaysiaTimeSeconds(action.createdAt)} · last try{" "}
                      {malaysiaTimeSeconds(action.lastAttemptAt)} · id{" "}
                      {truncateId(action.clientActionId)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function AttendanceSyncIssues({
  focusedGroupKey,
  onClose,
  onDiscard,
  onRetry,
  onReview,
  open,
  projectActions,
  retryableActionIds,
  snapshot,
}: AttendanceSyncIssuesProps) {
  const isMobile = useIsMobile();
  const [pendingDiscard, setPendingDiscard] =
    useState<AttendanceSyncIssueGroup | null>(null);

  const groups = useMemo(
    () => buildAttendanceIssueGroups(projectActions),
    [projectActions],
  );

  const pendingActions = useMemo(
    () =>
      projectActions
        .filter(
          (action) => action.state === "PENDING" || action.state === "SYNCING",
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [projectActions],
  );

  const workerById = useMemo(() => {
    const map = new Map<string, AttendanceWorker>();
    for (const worker of snapshot.workers) {
      map.set(worker.id, worker);
    }
    return map;
  }, [snapshot.workers]);

  // Reference onRetry so an unused prop never trips the build while
  // keeping the parent signature stable for the next iteration.
  void onRetry;
  void retryableActionIds;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent
          showCloseButton={false}
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            isMobile
              ? "inset-x-0 bottom-0 h-auto max-h-[92dvh] w-full rounded-t-xl border-t"
              : "h-full w-full max-w-full sm:max-w-140 sm:rounded-l-xl",
          )}
        >
          {isMobile ? (
            <div
              aria-hidden="true"
              className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-slate-300"
            />
          ) : null}
          <SheetHeader className="flex shrink-0 flex-row items-start gap-3 border-b border-slate-200 px-4 py-4 text-left">
            <div className="min-w-0 flex-1">
              <SheetTitle>Attendance issues</SheetTitle>
              <SheetDescription>
                Review changes that were not accepted by the server.
              </SheetDescription>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close sync issues"
              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </SheetHeader>

          <div
            className={cn(
              "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4",
              isMobile && "pb-2",
            )}
          >
            {groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                <p className="font-semibold text-slate-700">
                  No attendance records need review.
                </p>
                <p className="mt-1">
                  When a device change cannot be applied to the server it will
                  appear here for the affected worker and date.
                </p>
              </div>
            ) : (
              groups.map((group, index) => {
                const groupKey =
                  group.actionIds.join(":") ||
                  `${group.workerId ?? "unknown"}-${group.workDate}-${index}`;
                const isFocused = focusedGroupKey === groupKey;
                return (
                  <IssueCard
                    key={groupKey}
                    defaultOpen={isFocused || index === 0}
                    group={group}
                    onDiscard={setPendingDiscard}
                    onReview={onReview}
                    snapshot={snapshot}
                    worker={
                      group.workerId
                        ? (workerById.get(group.workerId) ?? null)
                        : null
                    }
                  />
                );
              })
            )}

            {pendingActions.length > 0 ? (
              <section>
                <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
                  Pending device changes · {pendingActions.length}
                </p>
                <ul className="mt-2 space-y-2">
                  {pendingActions.map((action) => (
                    <li
                      key={action.clientActionId}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {humanizeAction(action)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-amber-800">
                          <Clock className="size-3" aria-hidden="true" />
                          {malaysiaTime(action.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-500">
                        {action.state === "SYNCING"
                          ? "Sending to the server…"
                          : "Saved on this device."}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={pendingDiscard !== null}
        onOpenChange={(next) => !next && setPendingDiscard(null)}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Trash2 className="size-5" aria-hidden="true" />
            </AlertDialogMedia>
            <AlertDialogTitle>Discard device actions?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDiscard
                ? `${pendingDiscard.actionCount} ${
                    pendingDiscard.actionCount === 1 ? "action" : "actions"
                  } for ${
                    pendingDiscard.workerId
                      ? (workerById.get(pendingDiscard.workerId)?.legalName ??
                        "Unknown worker")
                      : "Unknown worker"
                  } on ${malaysiaDateLabel(pendingDiscard.workDate)} were not applied to the server. Discarding removes them from this device and does not change the current server attendance.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDiscard) {
                  void onDiscard(pendingDiscard.actionIds);
                }
                setPendingDiscard(null);
              }}
            >
              Discard actions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

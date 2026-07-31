"use client";

import { useMemo, useState } from "react";

import {
  ChevronDown,
  ChevronRight,
  Clock,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

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
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAttendanceIssueGroups,
  classifyIssue,
  groupSummary,
  issueLabel,
  issueTone,
  type AttendanceSyncIssueGroup,
} from "@/lib/phase4/sync-issues";
import type {
  AttendanceQueueAction,
  AttendanceSnapshot,
  AttendanceWorker,
} from "@/lib/phase4/types";
import { cn } from "@/lib/utils";

type AttendanceSyncIssuesProps = {
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

function malaysiaDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function formatMalaysiaTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(timestamp));
}

function workerInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function serverRecordSummary(
  worker: AttendanceWorker | null,
  snapshot: AttendanceSnapshot,
) {
  if (!worker) return "No current server record was loaded for this worker.";
  const sessions = snapshot.sessions
    .filter((session) => session.workerId === worker.id)
    .sort((left, right) => left.enteredAt.localeCompare(right.enteredAt));
  if (sessions.length === 0) {
    return `${worker.legalName} has no recorded session for this date.`;
  }
  return sessions
    .map(
      (session) =>
        `${formatMalaysiaTime(session.enteredAt)}–${formatMalaysiaTime(
          session.exitedAt ?? session.enteredAt,
        )} · ${session.breaks.length} ${
          session.breaks.length === 1 ? "break" : "breaks"
        }`,
    )
    .join(" · ");
}

function IssueChip({ kind }: { kind: AttendanceSyncIssueGroup["issueKind"] }) {
  const tone = issueTone(kind);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold",
        tone === "red" && "border-red-200 bg-red-50 text-red-800",
        tone === "amber" && "border-amber-200 bg-amber-50 text-amber-900",
        tone === "slate" && "border-slate-200 bg-slate-50 text-slate-700",
      )}
    >
      {issueLabel(kind)}
    </span>
  );
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
            <IssueChip kind={group.issueKind} />
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
        <div className="space-y-3 border-t border-slate-100 px-3 py-3 text-xs text-slate-600">
          <p className="font-medium text-slate-700">
            {group.primaryMessage ??
              groupSummary(
                group.rootAction,
                group.issueKind,
                group.actionCount - 1,
              )}
          </p>
          <section className="rounded-md border border-slate-200 bg-slate-50 p-2">
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
              Current server record
            </p>
            <p className="mt-1 text-slate-700">
              {serverRecordSummary(worker, snapshot)}
            </p>
          </section>
          <section>
            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-slate-500">
              Unapplied device actions · {group.actionCount}
            </p>
            <ul className="mt-1 space-y-0.5">
              {group.technicalActions.map((action) => {
                const kind = classifyIssue(action);
                return (
                  <li
                    key={action.clientActionId}
                    className="flex items-center justify-between gap-2 text-[0.6875rem]"
                  >
                    <span className="truncate text-slate-700">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "mr-1 inline-block size-1.5 rounded-full align-middle",
                          issueTone(kind) === "red"
                            ? "bg-red-500"
                            : issueTone(kind) === "amber"
                              ? "bg-amber-500"
                              : "bg-slate-400",
                        )}
                      />
                      {humanizeAction(action)}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {issueLabel(kind)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => onReview(group)}
              className="min-h-11"
            >
              Review attendance
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onDiscard(group)}
              className="min-h-11"
            >
              <Trash2 className="size-3.5" aria-hidden="true" />
              Discard actions
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
                    <p className="mt-0.5">
                      Created {malaysiaTime(action.createdAt)} · id{" "}
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

function humanizeAction(action: AttendanceQueueAction) {
  const occurredAt =
    typeof action.payload.occurredAt === "string"
      ? formatMalaysiaTime(action.payload.occurredAt)
      : null;
  switch (action.actionType) {
    case "ENTER":
      return occurredAt ? `Enter at ${occurredAt}` : "Enter";
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

export function AttendanceSyncIssues({
  onClose,
  onDiscard,
  onRetry,
  onReview,
  open,
  projectActions,
  retryableActionIds,
  snapshot,
}: AttendanceSyncIssuesProps) {
  const [tab, setTab] = useState<"review" | "pending">("review");
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

  const totalActions =
    groups.reduce((sum, group) => sum + group.actionCount, 0) +
    pendingActions.length;

  const hasRetry = retryableActionIds.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-140 sm:rounded-l-xl"
        >
          <SheetHeader className="flex flex-row items-start gap-3 border-b border-slate-200 px-4 py-4 text-left">
            <div className="min-w-0 flex-1">
              <SheetTitle>Attendance sync issues</SheetTitle>
              <SheetDescription>
                Review conflicts grouped by worker and work date. Pending device
                changes remain safe until you resolve or discard them.
              </SheetDescription>
            </div>
            <SheetClose
              className="grid size-10 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Close sync issues"
            >
              <X className="size-5" aria-hidden="true" />
            </SheetClose>
          </SheetHeader>

          <div className="space-y-3 overflow-y-auto px-4 py-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">
                {groups.length} {groups.length === 1 ? "record" : "records"}{" "}
                need a decision
              </p>
              <p className="mt-1 text-amber-900/85">
                Retrying the same conflicts will not apply them. Open the
                attendance record, correct it against current server data, or
                discard the unapplied device actions.
              </p>
            </div>

            <Tabs
              value={tab}
              onValueChange={(value: string) =>
                setTab(value === "pending" ? "pending" : "review")
              }
            >
              <TabsList>
                <TabsTrigger value="review">
                  Needs review · {groups.length}
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending · {pendingActions.length}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="review" className="mt-3 space-y-3">
                {groups.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">
                      No attendance records need review.
                    </p>
                    <p className="mt-1">
                      When a device change cannot be applied to the server it
                      will appear here for the affected worker and date.
                    </p>
                  </div>
                ) : (
                  groups.map((group, index) => (
                    <IssueCard
                      key={
                        group.actionIds.join(":") ||
                        `${group.workerId}-${index}`
                      }
                      defaultOpen={index === 0}
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
                  ))
                )}
              </TabsContent>
              <TabsContent value="pending" className="mt-3">
                {pendingActions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">
                      No pending device changes.
                    </p>
                    <p className="mt-1">
                      Saved device changes will appear here while they wait to
                      synchronize.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
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
                )}
              </TabsContent>
            </Tabs>
          </div>

          <footer className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <p className="mr-auto text-[0.6875rem] text-slate-500">
              {totalActions} device {totalActions === 1 ? "action" : "actions"}{" "}
              · {groups.length} need review
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={!hasRetry}
              onClick={() => void onRetry(retryableActionIds)}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Retry eligible
            </Button>
            <Button type="button" variant="default" onClick={onClose}>
              Close
            </Button>
          </footer>
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

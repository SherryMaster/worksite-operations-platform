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

import { AppPageSkeleton } from "@/components/app-page-skeleton";
import { SyncCenter } from "@/components/operations/sync-center";
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
  listAttendanceActions,
  loadAttendanceSnapshot,
  loadLatestAttendanceSnapshot,
  saveAttendanceAction,
  saveAttendanceSnapshot,
} from "@/lib/phase4/offline-store";
import type {
  AttendanceActionType,
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
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "short",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

function malaysiaDateTimeInput(timestamp: string | null) {
  if (!timestamp) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function inputToIso(value: string) {
  return new Date(`${value}:00+08:00`).toISOString();
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
  return "Needs attention";
}

function actionWorkerId(
  action: AttendanceQueueAction,
  snapshot: AttendanceSnapshot,
) {
  if (typeof action.payload.workerId === "string") {
    return action.payload.workerId;
  }

  if (typeof action.payload.sessionId === "string") {
    return snapshot.sessions.find(
      (session) => session.id === action.payload.sessionId,
    )?.workerId;
  }

  if (typeof action.payload.breakId === "string") {
    return snapshot.sessions.find((session) =>
      session.breaks.some(
        (attendanceBreak) => attendanceBreak.id === action.payload.breakId,
      ),
    )?.workerId;
  }

  return undefined;
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
        endedAt: malaysiaDateTimeInput(attendanceBreak.endedAt),
        key: attendanceBreak.id,
        startedAt: malaysiaDateTimeInput(attendanceBreak.startedAt),
      })),
      enteredAt: malaysiaDateTimeInput(session.enteredAt),
      exitedAt: malaysiaDateTimeInput(session.exitedAt),
      key: session.id,
    })),
  );
  const defaultTime = `${workDate}T08:00`;

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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (note.trim().length < 3) return;
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

        <div className="mt-5 space-y-4">
          {editable.map((session, sessionIndex) => (
            <section key={session.key} className="border border-violet-100 p-4">
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
                    type="datetime-local"
                    value={session.enteredAt}
                    onChange={(event) =>
                      updateSession(session.key, (current) => ({
                        ...current,
                        enteredAt: event.target.value,
                      }))
                    }
                    className="mt-1 h-11 w-full border border-violet-100 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-slate-600">
                  Exit (leave blank if incomplete)
                  <input
                    type="datetime-local"
                    value={session.exitedAt}
                    onChange={(event) =>
                      updateSession(session.key, (current) => ({
                        ...current,
                        exitedAt: event.target.value,
                      }))
                    }
                    className="mt-1 h-11 w-full border border-violet-100 px-3 text-sm"
                  />
                </label>
              </div>

              {session.breaks.map((attendanceBreak, breakIndex) => (
                <div
                  key={attendanceBreak.key}
                  className="mt-3 grid gap-3 border-l-2 border-amber-300 pl-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="text-xs font-semibold text-slate-600">
                    Break {breakIndex + 1} start
                    <input
                      required
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
                      className="mt-1 h-11 w-full border border-violet-100 px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-slate-600">
                    Break end
                    <input
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
                      className="mt-1 h-11 w-full border border-violet-100 px-3 text-sm"
                    />
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
          ))}
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
            onChange={(event) => setNote(event.target.value)}
            placeholder="Explain what was corrected for the audit history…"
            className="mt-2 min-h-24 w-full border border-violet-100 p-3 text-sm"
          />
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
  const synchronizing = useRef(false);
  const retryTimer = useRef<number | null>(null);
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const reloadActions = useCallback(async (projectId?: string) => {
    const stored = await listAttendanceActions(projectId);
    setActions(stored);
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
        setActions((current) =>
          current.map((action) =>
            pendingIds.has(action.clientActionId)
              ? { ...action, message: null, state: "SYNCING" }
              : action,
          ),
        );
        await Promise.all(
          pending.map((action) =>
            saveAttendanceAction({
              ...action,
              message: null,
              state: "SYNCING",
            }),
          ),
        );

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

          if (!response.ok) {
            if (response.status >= 500) {
              throw new Error("The attendance service is temporarily busy.");
            }
            await Promise.all(
              pending.map((action) =>
                saveAttendanceAction({
                  ...action,
                  message: "Sign in again or retry when access is available.",
                  state: "NEEDS_ATTENTION",
                }),
              ),
            );
            setMessage(
              "Attendance needs attention before it can synchronize. Use Retry sync after checking your access.",
            );
            return;
          }

          const body = (await response.json()) as {
            results: Array<{
              clientActionId: string;
              result: {
                message: string;
                status: "CONFLICT" | "FAILED" | "SYNCED";
              };
            }>;
          };
          const results = new Map(
            body.results.map((result) => [
              result.clientActionId,
              result.result,
            ]),
          );
          await Promise.all(
            pending.map((action) => {
              const result = results.get(action.clientActionId);
              return saveAttendanceAction({
                ...action,
                message: result?.message ?? "No server response was received.",
                state:
                  result?.status === "SYNCED" ? "SYNCED" : "NEEDS_ATTENTION",
              });
            }),
          );
          setMessage("Attendance synchronized with the server.");
          try {
            await refreshSnapshot(projectId, workDate);
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
                message: "Sync paused. It will retry automatically.",
                state: "PENDING",
              }),
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
        await reloadActions(projectId);
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
      const action: AttendanceQueueAction = {
        actionType,
        clientActionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        message: null,
        payload: {
          ...payload,
          capturedOffline: !navigator.onLine,
        },
        projectId: currentSnapshot.projectId,
        state: "PENDING",
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
        setActions((current) =>
          current.map((item) =>
            item.clientActionId === action.clientActionId
              ? {
                  ...item,
                  message: "This action could not be saved on this device.",
                  state: "NEEDS_ATTENTION",
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
        const localAction = [...actions]
          .reverse()
          .find(
            (action) =>
              action.projectId === snapshot.projectId &&
              action.state !== "SYNCED" &&
              actionWorkerId(action, snapshot) === worker.id,
          );
        return { calculation, localAction, sessions, state, worker };
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
          (filter === "INCOMPLETE" && calculation.status === "INCOMPLETE") ||
          (filter === "INVALID" && calculation.status === "INVALID");
        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          filterMatches
        );
      })
      .sort((left, right) => {
        const leftIssue =
          left.calculation.status === "INCOMPLETE" ||
          left.calculation.status === "INVALID" ||
          left.localAction?.state === "NEEDS_ATTENTION";
        const rightIssue =
          right.calculation.status === "INCOMPLETE" ||
          right.calculation.status === "INVALID" ||
          right.localAction?.state === "NEEDS_ATTENTION";
        return Number(rightIssue) - Number(leftIssue);
      });
  }, [actions, filter, query, snapshot]);

  const projectActions = snapshot
    ? actions.filter((action) => action.projectId === snapshot.projectId)
    : actions;
  const pendingCount = projectActions.filter(
    (action) => action.state === "PENDING" || action.state === "SYNCING",
  ).length;
  const attentionCount = projectActions.filter(
    (action) => action.state === "NEEDS_ATTENTION",
  ).length;
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
            calculation.status === "INCOMPLETE" ||
            calculation.status === "INVALID"
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
    return <AppPageSkeleton compact />;
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
                  className="mt-1 block h-10 w-[9.75rem] border border-slate-200 bg-white px-2 text-xs font-medium"
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
                className="block h-10 max-w-[8.75rem] border border-slate-200 bg-white px-2 text-xs font-medium"
              >
                <option value="NORMAL">Normal day</option>
                <option value="SUNDAY">Sunday</option>
                <option value="PUBLIC_HOLIDAY">Public holiday</option>
              </select>
            </label>
          </div>
        </section>
      ) : null}

      {!online || syncingNow || pendingCount > 0 || attentionCount > 0 ? (
        <section className="mt-3 rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
              {!online ? (
                <WifiOff
                  className="size-3.5 text-amber-700"
                  aria-hidden="true"
                />
              ) : syncingNow ? (
                <LoaderCircle
                  className="size-3.5 animate-spin text-violet-700"
                  aria-hidden="true"
                />
              ) : (
                <Check
                  className="size-3.5 text-emerald-600"
                  aria-hidden="true"
                />
              )}
              <span aria-live="polite">
                {!online
                  ? `${pendingCount} ${pendingCount === 1 ? "change" : "changes"} saved on this device`
                  : syncingNow
                    ? `Synchronizing ${pendingCount} ${pendingCount === 1 ? "action" : "actions"}`
                    : `${pendingCount} waiting to synchronize`}
              </span>
            </span>
            {attentionCount > 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                {attentionCount} need attention
              </span>
            ) : null}
            <button
              type="button"
              disabled={!online || syncingNow}
              onClick={async () => {
                const retryable = projectActions.filter(
                  (action) => action.state === "NEEDS_ATTENTION",
                );
                await Promise.all(
                  retryable.map((action) =>
                    saveAttendanceAction({
                      ...action,
                      message: null,
                      state: "PENDING",
                    }),
                  ),
                );
                setActions((current) =>
                  current.map((action) =>
                    action.projectId === snapshot.projectId &&
                    action.state === "NEEDS_ATTENTION"
                      ? { ...action, message: null, state: "PENDING" }
                      : action,
                  ),
                );
                await synchronize(snapshot.projectId, snapshot.workDate);
              }}
              className="ml-auto inline-flex min-h-11 items-center gap-2 px-2 font-semibold text-amber-800 disabled:text-slate-400"
            >
              <RefreshCw
                className={cn("size-3.5", syncingNow && "animate-spin")}
                aria-hidden="true"
              />
              {syncingNow ? "Syncing…" : "Retry sync"}
            </button>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Attendance summary"
        className="mt-3 grid grid-cols-5 overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        {[
          ["Expected", snapshot.workers.length],
          ["Not entered", liveSummary.notEntered],
          ["On site", liveSummary.onSite],
          ["On break", liveSummary.onBreak],
          ["Issues", liveSummary.issues + attentionCount],
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

      {message ? (
        <p
          role="status"
          className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
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
                .map(({ calculation, localAction, state, worker }) => {
                  const hasIssue =
                    calculation.status === "INCOMPLETE" ||
                    calculation.status === "INVALID" ||
                    localAction?.state === "NEEDS_ATTENTION";
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
                      <div
                        aria-hidden="true"
                        className={cn(
                          "grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700",
                          hasIssue && "bg-red-100 text-red-800",
                        )}
                      >
                        {worker.legalName
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <h2 className="truncate text-sm font-semibold">
                            {worker.legalName}
                          </h2>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border px-1.5 py-0.5 text-[0.625rem] font-semibold",
                              hasIssue
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
                              : hasIssue
                                ? "Issue"
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
                            {localAction?.state === "NEEDS_ATTENTION"
                              ? actionStateLabel(localAction)
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
                          <ChevronRight className="size-5" aria-hidden="true" />
                        </button>
                      ) : hasIssue ? (
                        <button
                          type="button"
                          onClick={() => setCorrectingWorker(worker)}
                          className="inline-flex min-h-10 shrink-0 items-center rounded-lg bg-red-700 px-3 text-xs font-semibold text-white"
                        >
                          Fix
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
                                  })
                                }
                                className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium hover:bg-amber-50"
                              >
                                <Coffee className="size-4" aria-hidden="true" />
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
                })}
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

      <SyncCenter pendingCount={pendingCount} attentionCount={attentionCount}>
        <ol className="mt-3 divide-y divide-slate-100">
          {[...projectActions]
            .reverse()
            .slice(0, 20)
            .map((action) => (
              <li key={action.clientActionId} className="py-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {action.actionType.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      action.state === "NEEDS_ATTENTION"
                        ? "text-red-700"
                        : action.state === "SYNCED"
                          ? "text-emerald-700"
                          : "text-amber-800",
                    )}
                  >
                    {actionStateLabel(action)}
                  </span>
                </div>
                {action.message ? (
                  <p className="mt-1 text-slate-500">{action.message}</p>
                ) : null}
              </li>
            ))}
        </ol>
      </SyncCenter>

      {correctingWorker ? (
        <CorrectionPanel
          worker={correctingWorker}
          workDate={snapshot.workDate}
          sessions={correctionSessions}
          onClose={() => setCorrectingWorker(null)}
          onSave={(sessions, note) => {
            setCorrectingWorker(null);
            void enqueue("CORRECT_DAY", {
              note,
              sessions,
              workerId: correctingWorker.id,
              workDate: snapshot.workDate,
            });
          }}
        />
      ) : null}
    </WorkspaceRoot>
  );
}

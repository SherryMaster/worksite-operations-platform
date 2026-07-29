"use client";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  Coffee,
  LoaderCircle,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AppPageSkeleton } from "@/components/app-page-skeleton";
import { SyncCenter } from "@/components/operations/sync-center";
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

function malaysiaTime(timestamp: string | null) {
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(timestamp));
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
    <div className="space-y-3" aria-label="Loading attendance" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="border border-violet-100 bg-white p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="mt-5 h-12 w-full" />
          <Skeleton className="mt-2 h-11 w-full" />
        </div>
      ))}
      <span className="sr-only" role="status">
        Loading attendance for the selected date.
      </span>
    </div>
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
      className="fixed inset-0 z-50 flex items-end bg-violet-950/60 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:border sm:border-violet-100 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
              Permanent audited correction
            </p>
            <h2 id="correction-title" className="mt-1 text-xl font-semibold">
              Correct {worker.legalName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Times use Malaysia time. Removing every session clears attendance
              for this date without erasing its history.
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
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <p className="text-xs font-semibold text-violet-700">
            {mode === "CEO"
              ? "Attendance review"
              : context === "history"
                ? "Attendance history"
                : "Live operations"}
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">
            {mode === "CEO"
              ? snapshot.projectName
              : context === "history"
                ? "Attendance"
                : "Today"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "CEO"
              ? "Review recorded time and make traceable corrections."
              : context === "history"
                ? `Review or correct attendance for ${snapshot.projectName}.`
                : snapshot.projectName}
          </p>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <label className="text-xs font-semibold text-slate-600">
            Work date
            <input
              type="date"
              disabled={
                loadingDate || (mode === "FOREMAN" && context === "today")
              }
              value={selectedWorkDate}
              onChange={(event) => void changeDate(event.target.value)}
              className="mt-1.5 h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Day type
            <select
              disabled={loadingDate}
              value={snapshot.dayType}
              onChange={(event) =>
                void enqueue("SET_DAY_TYPE", {
                  dayType: event.target.value,
                  workDate: snapshot.workDate,
                })
              }
              className="mt-1.5 h-10 w-full border border-slate-200 bg-white px-3 text-sm font-medium"
            >
              <option value="NORMAL">Normal day</option>
              <option value="SUNDAY">Sunday</option>
              <option value="PUBLIC_HOLIDAY">Public holiday</option>
            </select>
          </label>
        </div>
        {!online || syncingNow || pendingCount > 0 || attentionCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
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
        ) : null}
      </section>

      <section
        aria-label="Attendance summary"
        className="mt-3 grid grid-cols-3 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-6"
      >
        {[
          ["Expected", snapshot.workers.length],
          ["Not entered", liveSummary.notEntered],
          ["On site", liveSummary.onSite],
          ["On break", liveSummary.onBreak],
          ["Exited", liveSummary.exited],
          ["Issues", liveSummary.issues + attentionCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="border-r border-slate-200 px-2 py-2.5 text-center last:border-0 sm:px-3"
          >
            <p className="text-lg font-semibold tabular-nums text-slate-950">
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
        <label className="relative block">
          <span className="sr-only">Search workers</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-5 text-slate-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search worker, trade, or skill…"
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-11 pr-3 text-sm"
          />
        </label>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {(
            [
              ["ALL", "All"],
              ["NOT_ENTERED", "Not entered"],
              ["ON_SITE", "On site"],
              ["ON_BREAK", "On break"],
              ["EXITED", "Exited"],
              ["LEAVE", "Approved leave"],
              ["INCOMPLETE", "Incomplete"],
              ["INVALID", "Invalid"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "min-h-9 shrink-0 rounded-full border px-3 text-xs font-semibold",
                filter === value
                  ? "border-violet-700 bg-violet-700 text-white"
                  : "border-slate-200 bg-white text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section
        className="mt-3 grid gap-2 md:grid-cols-2 2xl:grid-cols-3"
        aria-label="Worker attendance"
      >
        {loadingDate ? (
          <AttendanceListSkeleton />
        ) : workerViews.length === 0 ? (
          <div className="border border-dashed border-violet-100 bg-white p-8 text-center">
            <CalendarDays
              className="mx-auto size-7 text-slate-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 font-semibold">No workers match this view</h2>
            <p className="mt-1 text-sm text-slate-500">
              Clear the search or choose another status.
            </p>
          </div>
        ) : (
          workerViews.map(({ calculation, localAction, state, worker }) => (
            <article
              key={worker.id}
              className="rounded-lg border border-slate-200 bg-white p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">{worker.legalName}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[worker.tradeName, worker.skillName]
                      .filter(Boolean)
                      .join(" · ") || "No classification"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    state.label === "On site"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : state.label === "On break"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  {worker.approvedLeaveType ? "Approved leave" : state.label}
                </span>
              </div>

              {state.ordered.length > 0 ? (
                <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  {state.ordered.map((session, index) => (
                    <p key={session.id} className="flex justify-between gap-3">
                      <span>Session {index + 1}</span>
                      <span className="font-medium tabular-nums text-slate-900">
                        {malaysiaTime(session.enteredAt)} –{" "}
                        {malaysiaTime(session.exitedAt)}
                      </span>
                    </p>
                  ))}
                  <p className="flex justify-between gap-3 pt-1 font-semibold">
                    <span>Payable time</span>
                    <span>
                      {formatMinutes(calculation.totalPayableMinutes)}
                    </span>
                  </p>
                </div>
              ) : null}

              {calculation.exceptions.length > 0 ? (
                <div className="mt-3 flex gap-2 bg-red-50 p-3 text-xs text-red-900">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{calculation.exceptions[0].message}</span>
                </div>
              ) : null}

              {localAction ? (
                <p
                  role="status"
                  className={cn(
                    "mt-3 inline-flex items-center gap-1.5 text-xs font-semibold",
                    localAction.state === "NEEDS_ATTENTION"
                      ? "text-red-700"
                      : "text-amber-800",
                  )}
                >
                  {localAction.state === "SYNCING" ? (
                    <LoaderCircle
                      className="size-3.5 animate-spin"
                      aria-hidden="true"
                    />
                  ) : localAction.state === "NEEDS_ATTENTION" ? (
                    <AlertTriangle className="size-3.5" aria-hidden="true" />
                  ) : (
                    <Check className="size-3.5" aria-hidden="true" />
                  )}
                  {actionStateLabel(localAction)}
                </p>
              ) : null}

              {worker.approvedLeaveType ? (
                <div className="mt-4 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
                  <p className="font-semibold">{worker.approvedLeaveType}</p>
                  <p className="mt-1">
                    Full-day unpaid leave · 0 payable hours. Attendance entry is
                    blocked for this date.
                  </p>
                </div>
              ) : mode === "CEO" || context === "history" ? (
                <button
                  type="button"
                  onClick={() => setCorrectingWorker(worker)}
                  className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Review or correct times
                </button>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {!state.openSession ? (
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
                      className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 bg-emerald-700 px-4 font-semibold text-white"
                    >
                      <LogIn className="size-5" aria-hidden="true" />
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
                      className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 bg-amber-600 px-4 font-semibold text-slate-950"
                    >
                      <Coffee className="size-5" aria-hidden="true" />
                      End break
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          void enqueue("START_BREAK", {
                            breakId: crypto.randomUUID(),
                            occurredAt: new Date().toISOString(),
                            sessionId: state.openSession?.id,
                          })
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 border border-amber-500 bg-amber-50 px-3 font-semibold text-amber-950"
                      >
                        <Coffee className="size-5" aria-hidden="true" />
                        Start break
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void enqueue("EXIT", {
                            occurredAt: new Date().toISOString(),
                            sessionId: state.openSession?.id,
                          })
                        }
                        className="inline-flex min-h-12 items-center justify-center gap-2 bg-violet-700 px-3 font-semibold text-white"
                      >
                        <LogOut className="size-5" aria-hidden="true" />
                        Exit
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setCorrectingWorker(worker)}
                    className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 border border-violet-100 px-4 text-sm font-semibold"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Correct times
                  </button>
                </div>
              )}
            </article>
          ))
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

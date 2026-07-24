"use client";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  Coffee,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  | "INCOMPLETE"
  | "INVALID";

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
      className="fixed inset-0 z-50 flex items-end bg-stone-950/60 sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="correction-title"
    >
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full overflow-y-auto bg-white p-5 shadow-2xl sm:max-w-2xl sm:border sm:border-stone-300 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Permanent audited correction
            </p>
            <h2 id="correction-title" className="mt-1 text-xl font-semibold">
              Correct {worker.legalName}
            </h2>
            <p className="mt-1 text-xs text-stone-500">
              Times use Malaysia time. Removing every session clears attendance
              for this date without erasing its history.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close correction"
            className="grid size-11 shrink-0 place-items-center border border-stone-300"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {editable.map((session, sessionIndex) => (
            <section key={session.key} className="border border-stone-300 p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Session {sessionIndex + 1}</h3>
                <button
                  type="button"
                  onClick={() =>
                    setEditable((current) =>
                      current.filter((item) => item.key !== session.key),
                    )
                  }
                  className="inline-flex min-h-10 items-center gap-2 px-2 text-sm text-red-700"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  Remove
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-stone-600">
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
                    className="mt-1 h-11 w-full border border-stone-300 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-stone-600">
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
                    className="mt-1 h-11 w-full border border-stone-300 px-3 text-sm"
                  />
                </label>
              </div>

              {session.breaks.map((attendanceBreak, breakIndex) => (
                <div
                  key={attendanceBreak.key}
                  className="mt-3 grid gap-3 border-l-2 border-amber-300 pl-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="text-xs font-semibold text-stone-600">
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
                      className="mt-1 h-11 w-full border border-stone-300 px-3 text-sm"
                    />
                  </label>
                  <label className="text-xs font-semibold text-stone-600">
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
                      className="mt-1 h-11 w-full border border-stone-300 px-3 text-sm"
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
                    className="mt-auto grid size-11 place-items-center border border-stone-300 text-red-700"
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
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-amber-800"
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
          className="mt-4 inline-flex min-h-11 items-center gap-2 border border-stone-300 px-4 text-sm font-semibold"
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
            placeholder="Explain what was corrected for the audit history."
            className="mt-2 min-h-24 w-full border border-stone-300 p-3 text-sm"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 border border-stone-300 px-4 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="min-h-12 bg-stone-950 px-4 font-semibold text-white"
          >
            Save correction
          </button>
        </div>
      </form>
    </div>
  );
}

export function AttendanceWorkspace({
  initialSnapshot,
  mode = "FOREMAN",
}: {
  initialSnapshot: AttendanceSnapshot | null;
  mode?: "CEO" | "FOREMAN";
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [actions, setActions] = useState<AttendanceQueueAction[]>([]);
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<WorkerFilter>("ALL");
  const [message, setMessage] = useState<string | null>(null);
  const [correctingWorker, setCorrectingWorker] =
    useState<AttendanceWorker | null>(null);
  const synchronizing = useRef(false);
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
      if (!response.ok) return;
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
        await saveAttendanceSnapshot(updatedSnapshot);
      }
    },
    [],
  );

  const synchronize = useCallback(
    async (projectId: string, workDate: string) => {
      if (synchronizing.current || !navigator.onLine) return;
      synchronizing.current = true;
      try {
        const stored = await listAttendanceActions(projectId);
        const pending = stored.filter((action) => action.state === "PENDING");
        if (pending.length === 0) return;

        await Promise.all(
          pending.map((action) =>
            saveAttendanceAction({ ...action, state: "SYNCING" }),
          ),
        );
        await reloadActions(projectId);

        let response: Response;
        try {
          response = await fetch("/api/attendance/sync", {
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
          });
        } catch {
          await Promise.all(
            pending.map((action) =>
              saveAttendanceAction({
                ...action,
                message: "Waiting for a network connection.",
                state: "PENDING",
              }),
            ),
          );
          return;
        }

        if (!response.ok) {
          await Promise.all(
            pending.map((action) =>
              saveAttendanceAction({
                ...action,
                message: "Sign in again or retry when access is available.",
                state: "NEEDS_ATTENTION",
              }),
            ),
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
          body.results.map((result) => [result.clientActionId, result.result]),
        );
        await Promise.all(
          pending.map((action) => {
            const result = results.get(action.clientActionId);
            return saveAttendanceAction({
              ...action,
              message: result?.message ?? "No server response was received.",
              state: result?.status === "SYNCED" ? "SYNCED" : "NEEDS_ATTENTION",
            });
          }),
        );
        await refreshSnapshot(projectId, workDate);
      } finally {
        synchronizing.current = false;
        await reloadActions(projectId);
        const remaining = await listAttendanceActions(projectId);
        if (
          navigator.onLine &&
          remaining.some((action) => action.state === "PENDING")
        ) {
          window.setTimeout(() => {
            void synchronize(projectId, workDate);
          }, 0);
        }
      }
    },
    [refreshSnapshot, reloadActions],
  );

  useEffect(() => {
    const current = initialSnapshot;

    async function initialize() {
      if (current) {
        await saveAttendanceSnapshot(current);
        await reloadActions(current.projectId);
        if (navigator.onLine) {
          await synchronize(current.projectId, current.workDate);
        }
      } else {
        const cached = await loadLatestAttendanceSnapshot();
        setSnapshot(cached);
        await reloadActions(cached?.projectId);
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
    };
    // The initial cache hydration should run once for this mounted workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enqueue = useCallback(
    async (
      actionType: AttendanceActionType,
      payload: Record<string, unknown>,
    ) => {
      if (!snapshot) return;
      const action: AttendanceQueueAction = {
        actionType,
        clientActionId: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        message: null,
        payload: {
          ...payload,
          capturedOffline: !navigator.onLine,
        },
        projectId: snapshot.projectId,
        state: "PENDING",
      };
      const next = applyLocalAttendanceAction(snapshot, action);
      setSnapshot(next);
      setMessage(
        navigator.onLine
          ? "Saved. Synchronizing with the server."
          : "Saved on this device. It will synchronize when the connection returns.",
      );
      await Promise.all([
        saveAttendanceAction(action),
        saveAttendanceSnapshot(next),
      ]);
      await reloadActions(snapshot.projectId);
      if (navigator.onLine) {
        await synchronize(snapshot.projectId, snapshot.workDate);
      }
    },
    [reloadActions, snapshot, synchronize],
  );

  async function changeDate(workDate: string) {
    if (!snapshot) return;
    if (navigator.onLine) {
      await refreshSnapshot(snapshot.projectId, workDate);
      return;
    }
    const cached = await loadAttendanceSnapshot(snapshot.projectId, workDate);
    if (cached) {
      setSnapshot(cached);
      setMessage("Showing the saved attendance copy for this date.");
    } else {
      setMessage("This date is not saved on the device yet.");
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
        return { calculation, sessions, state, worker };
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
          (filter === "INCOMPLETE" && calculation.status === "INCOMPLETE") ||
          (filter === "INVALID" && calculation.status === "INVALID");
        return (
          (!normalizedQuery || searchable.includes(normalizedQuery)) &&
          filterMatches
        );
      });
  }, [filter, query, snapshot]);

  const projectActions = snapshot
    ? actions.filter((action) => action.projectId === snapshot.projectId)
    : actions;
  const pendingCount = projectActions.filter(
    (action) => action.state === "PENDING" || action.state === "SYNCING",
  ).length;
  const attentionCount = projectActions.filter(
    (action) => action.state === "NEEDS_ATTENTION",
  ).length;

  if (!snapshot) {
    return (
      <main className="px-4 pb-24 pt-8 sm:px-6">
        <div className="border border-dashed border-stone-300 bg-white p-8 text-center">
          <WifiOff
            className="mx-auto size-8 text-stone-400"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-semibold">
            No saved attendance yet
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Open Today once while online after a project and workers are
            assigned. The compact worksite list will then remain available
            during temporary connection loss.
          </p>
        </div>
      </main>
    );
  }

  const correctionSessions = correctingWorker
    ? snapshot.sessions.filter(
        (session) => session.workerId === correctingWorker.id,
      )
    : [];

  return (
    <main className="px-4 pb-28 pt-6 sm:px-6">
      <section className="border border-stone-300 bg-white">
        <div className="border-b border-stone-200 bg-stone-950 p-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                {mode === "CEO" ? "Attendance review" : "Today at the worksite"}
              </p>
              <h1 className="mt-1 text-2xl font-semibold">
                {snapshot.projectName}
              </h1>
            </div>
            <span
              className={cn(
                "inline-flex min-h-8 items-center gap-2 px-2.5 text-xs font-semibold",
                online
                  ? "bg-emerald-950 text-emerald-300"
                  : "bg-amber-950 text-amber-300",
              )}
            >
              {online ? (
                <Wifi className="size-3.5" aria-hidden="true" />
              ) : (
                <WifiOff className="size-3.5" aria-hidden="true" />
              )}
              {online ? "Online" : "Offline"}
            </span>
          </div>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Work date
            <input
              type="date"
              value={snapshot.workDate}
              onChange={(event) => void changeDate(event.target.value)}
              className="mt-2 h-12 w-full border border-stone-300 bg-white px-3 text-base font-medium normal-case tracking-normal"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Day type
            <select
              value={snapshot.dayType}
              onChange={(event) =>
                void enqueue("SET_DAY_TYPE", {
                  dayType: event.target.value,
                  workDate: snapshot.workDate,
                })
              }
              className="mt-2 h-12 w-full border border-stone-300 bg-white px-3 text-base font-medium normal-case tracking-normal"
            >
              <option value="NORMAL">Normal day</option>
              <option value="SUNDAY">Sunday</option>
              <option value="PUBLIC_HOLIDAY">Public holiday</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-4 py-3 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-stone-700">
            <Check className="size-3.5 text-emerald-600" aria-hidden="true" />
            {pendingCount === 0
              ? "All actions synchronized"
              : `${pendingCount} waiting to synchronize`}
          </span>
          {attentionCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 font-semibold text-red-700">
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              {attentionCount} need attention
            </span>
          ) : null}
          <button
            type="button"
            disabled={!online}
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
              await synchronize(snapshot.projectId, snapshot.workDate);
            }}
            className="ml-auto inline-flex min-h-10 items-center gap-2 px-2 font-semibold text-amber-800 disabled:text-stone-400"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry sync
          </button>
        </div>
      </section>

      {message ? (
        <p
          role="status"
          className="mt-3 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
        >
          {message}
        </p>
      ) : null}

      <section className="mt-4">
        <label className="relative block">
          <span className="sr-only">Search workers</span>
          <Search
            className="pointer-events-none absolute left-3 top-3.5 size-5 text-stone-400"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search worker, trade, or skill"
            className="h-12 w-full border border-stone-300 bg-white pl-11 pr-3 text-base"
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
              ["INCOMPLETE", "Incomplete"],
              ["INVALID", "Invalid"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                "min-h-10 shrink-0 border px-3 text-xs font-semibold",
                filter === value
                  ? "border-stone-950 bg-stone-950 text-white"
                  : "border-stone-300 bg-white text-stone-700",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 space-y-3" aria-label="Worker attendance">
        {workerViews.length === 0 ? (
          <div className="border border-dashed border-stone-300 bg-white p-8 text-center">
            <CalendarDays
              className="mx-auto size-7 text-stone-400"
              aria-hidden="true"
            />
            <h2 className="mt-3 font-semibold">No workers match this view</h2>
            <p className="mt-1 text-sm text-stone-500">
              Clear the search or choose another status.
            </p>
          </div>
        ) : (
          workerViews.map(({ calculation, state, worker }) => (
            <article
              key={worker.id}
              className="border border-stone-300 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{worker.legalName}</h2>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {[worker.tradeName, worker.skillName]
                      .filter(Boolean)
                      .join(" · ") || "No classification"}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 border px-2.5 py-1 text-xs font-semibold",
                    state.label === "On site"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : state.label === "On break"
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-stone-200 bg-stone-50 text-stone-700",
                  )}
                >
                  {state.label}
                </span>
              </div>

              {state.ordered.length > 0 ? (
                <div className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-xs text-stone-600">
                  {state.ordered.map((session, index) => (
                    <p key={session.id} className="flex justify-between gap-3">
                      <span>Session {index + 1}</span>
                      <span className="font-medium tabular-nums text-stone-900">
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

              <div className="mt-4 grid grid-cols-2 gap-2">
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
                    className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 bg-amber-600 px-4 font-semibold text-stone-950"
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
                      className="inline-flex min-h-12 items-center justify-center gap-2 bg-stone-950 px-3 font-semibold text-white"
                    >
                      <LogOut className="size-5" aria-hidden="true" />
                      Exit
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCorrectingWorker(worker)}
                  className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 border border-stone-300 px-4 text-sm font-semibold"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                  Correct times
                </button>
              </div>
            </article>
          ))
        )}
      </section>

      {projectActions.length > 0 ? (
        <details className="mt-5 border border-stone-300 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Device synchronization history
          </summary>
          <ol className="mt-3 divide-y divide-stone-100">
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
                    <p className="mt-1 text-stone-500">{action.message}</p>
                  ) : null}
                </li>
              ))}
          </ol>
        </details>
      ) : null}

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
    </main>
  );
}

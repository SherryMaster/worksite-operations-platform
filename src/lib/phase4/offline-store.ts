"use client";

import type {
  AttendanceActionState,
  AttendanceIssueKind,
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

const DATABASE_NAME = "worksite-attendance";
const DATABASE_VERSION = 1;
const SNAPSHOTS = "snapshots";
const ACTIONS = "actions";

function snapshotKey(projectId: string, workDate: string) {
  return `${projectId}:${workDate}`;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(SNAPSHOTS)) {
        database.createObjectStore(SNAPSHOTS, { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains(ACTIONS)) {
        const store = database.createObjectStore(ACTIONS, {
          keyPath: "clientActionId",
        });
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function transactionComplete(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error);
    transaction.onerror = () => reject(transaction.error);
    transaction.oncomplete = () => resolve();
  });
}

/**
 * Coerce an action that may have been written by an older build into the
 * current shape. New fields default to safe values; the legacy `NEEDS_ATTENTION`
 * state is mapped to the new `RETRYABLE`/`REVIEW_REQUIRED` split based on the
 * stored message wording.
 */
function normalizeStoredAction(
  raw: Partial<AttendanceQueueAction> & { clientActionId: string },
): AttendanceQueueAction {
  const legacyState =
    (raw as { state?: string }).state === "NEEDS_ATTENTION"
      ? legacyMessageToState((raw as { message?: string | null }).message)
      : ((raw.state as AttendanceActionState | undefined) ?? "PENDING");
  return {
    actionType: (raw.actionType ??
      "ENTER") as AttendanceQueueAction["actionType"],
    clientActionId: raw.clientActionId,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    issueKind: raw.issueKind ?? null,
    lastAttemptAt: raw.lastAttemptAt ?? null,
    message: raw.message ?? null,
    payload: raw.payload ?? {},
    projectId: raw.projectId ?? "",
    serverStatus: raw.serverStatus ?? null,
    state: legacyState,
    workDate: raw.workDate ?? "",
    workerId: raw.workerId ?? null,
  };
}

function legacyMessageToState(
  message: string | null | undefined,
): AttendanceQueueAction["state"] {
  const text = (message ?? "").toLowerCase();
  if (!text) return "REVIEW_REQUIRED";
  if (
    text.includes("sign in") ||
    text.includes("retry when access") ||
    text.includes("not available")
  ) {
    return "RETRYABLE";
  }
  if (text.includes("device")) {
    return "REVIEW_REQUIRED";
  }
  return "REVIEW_REQUIRED";
}

export async function saveAttendanceSnapshot(snapshot: AttendanceSnapshot) {
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readwrite");
  transaction.objectStore(SNAPSHOTS).put({
    key: snapshotKey(snapshot.projectId, snapshot.workDate),
    snapshot,
    updatedAt: snapshot.updatedAt,
  });
  await transactionComplete(transaction);
  database.close();
}

export async function loadAttendanceSnapshot(
  projectId: string,
  workDate: string,
) {
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readonly");
  const row = (await requestResult(
    transaction.objectStore(SNAPSHOTS).get(snapshotKey(projectId, workDate)),
  )) as { snapshot?: AttendanceSnapshot } | undefined;
  await transactionComplete(transaction);
  database.close();
  return row?.snapshot ?? null;
}

export async function loadLatestAttendanceSnapshot() {
  const database = await openDatabase();
  const transaction = database.transaction(SNAPSHOTS, "readonly");
  const rows = (await requestResult(
    transaction.objectStore(SNAPSHOTS).getAll(),
  )) as Array<{ snapshot: AttendanceSnapshot; updatedAt: string }>;
  await transactionComplete(transaction);
  database.close();
  return (
    rows.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]
      ?.snapshot ?? null
  );
}

export async function saveAttendanceAction(action: AttendanceQueueAction) {
  const database = await openDatabase();
  const transaction = database.transaction(ACTIONS, "readwrite");
  transaction.objectStore(ACTIONS).put(action);
  await transactionComplete(transaction);
  database.close();
}

export async function listAttendanceActions(projectId?: string) {
  const database = await openDatabase();
  const transaction = database.transaction(ACTIONS, "readonly");
  const rows = (await requestResult(
    transaction.objectStore(ACTIONS).index("createdAt").getAll(),
  )) as Array<Partial<AttendanceQueueAction> & { clientActionId: string }>;
  await transactionComplete(transaction);
  database.close();
  return rows
    .map(normalizeStoredAction)
    .filter((action) => !projectId || action.projectId === projectId);
}

/**
 * Remove a single queued action by id. Returns true if a row was deleted.
 */
export async function deleteAttendanceAction(clientActionId: string) {
  const database = await openDatabase();
  const transaction = database.transaction(ACTIONS, "readwrite");
  transaction.objectStore(ACTIONS).delete(clientActionId);
  await transactionComplete(transaction);
  database.close();
  return true;
}

/**
 * Remove many queued actions in one read-write transaction so a discard
 * either succeeds completely or leaves the queue untouched.
 */
export async function deleteAttendanceActions(clientActionIds: string[]) {
  if (clientActionIds.length === 0) return;
  const database = await openDatabase();
  const transaction = database.transaction(ACTIONS, "readwrite");
  const store = transaction.objectStore(ACTIONS);
  for (const id of clientActionIds) {
    store.delete(id);
  }
  await transactionComplete(transaction);
  database.close();
}

/**
 * Remove fully synchronized queue entries. Optionally scope to a project so
 * other projects' queues survive. Call this after a successful server
 * snapshot refresh so IndexedDB does not keep growing with rows the server
 * already confirmed.
 */
export async function pruneSyncedAttendanceActions(projectId?: string) {
  const database = await openDatabase();
  const transaction = database.transaction(ACTIONS, "readwrite");
  const store = transaction.objectStore(ACTIONS);
  const all = (await requestResult(store.getAll())) as Array<
    Partial<AttendanceQueueAction> & { clientActionId: string }
  >;
  for (const raw of all) {
    const state = (raw.state as AttendanceActionState | undefined) ?? "PENDING";
    if (state !== "SYNCED") continue;
    if (projectId && raw.projectId !== projectId) continue;
    store.delete(raw.clientActionId);
  }
  await transactionComplete(transaction);
  database.close();
}

export async function clearAttendanceDeviceData() {
  if (typeof indexedDB === "undefined") return;
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    request.onerror = () => resolve();
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  });
}

export type { AttendanceIssueKind };

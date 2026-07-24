"use client";

import type {
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
  const actions = (await requestResult(
    transaction.objectStore(ACTIONS).index("createdAt").getAll(),
  )) as AttendanceQueueAction[];
  await transactionComplete(transaction);
  database.close();
  return actions.filter(
    (action) => !projectId || action.projectId === projectId,
  );
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

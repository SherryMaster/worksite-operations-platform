export type AttendanceDayType = "NORMAL" | "SUNDAY" | "PUBLIC_HOLIDAY";

export type AttendanceBreak = {
  endedAt: string | null;
  id: string;
  startedAt: string;
};

export type AttendanceSession = {
  breaks: AttendanceBreak[];
  enteredAt: string;
  exitedAt: string | null;
  id: string;
  workerId: string;
};

export type AttendanceWorker = {
  approvedLeaveType?: string | null;
  id: string;
  legalName: string;
  photoId?: string | null;
  skillName: string | null;
  tradeName: string | null;
};

export type AttendanceSnapshot = {
  dayType: AttendanceDayType;
  projectId: string;
  projectName: string;
  sessions: AttendanceSession[];
  updatedAt: string;
  workDate: string;
  workers: AttendanceWorker[];
};

export type AttendanceActionType =
  | "SET_DAY_TYPE"
  | "ENTER"
  | "EXIT"
  | "START_BREAK"
  | "END_BREAK"
  | "CORRECT_DAY";

/**
 * Local lifecycle for a queued device action.
 *
 * - `PENDING`: saved on the device and waiting to be sent.
 * - `SYNCING`: a synchronization request is in flight.
 * - `SYNCED`: the server confirmed and we keep the row only until the
 *   server snapshot is refreshed; after that the row is pruned.
 * - `RETRYABLE`: the server did not reach the per-action RPC (auth, network,
 *   malformed response). Safe to resend with the same action id.
 * - `REVIEW_REQUIRED`: terminal failure or conflict. Must be resolved by a
 *   review/discard, not a retry with the same id.
 */
export type AttendanceActionState =
  "PENDING" | "SYNCING" | "SYNCED" | "RETRYABLE" | "REVIEW_REQUIRED";

/**
 * Coarse, human-meaningful reason for a queue issue. Used for grouping and
 * for the user-facing chip in the attendance issue center.
 */
export type AttendanceIssueKind =
  | "AUTHORIZATION"
  | "CONFLICT"
  | "VALIDATION"
  | "DEPENDENCY"
  | "LOCAL_STORAGE"
  | "UNKNOWN";

/**
 * Normalized operational metadata stored on every queued action so the
 * issue grouping can survive a server snapshot refresh that drops the
 * optimistic local sessions.
 */
export type AttendanceQueueAction = {
  actionType: AttendanceActionType;
  clientActionId: string;
  createdAt: string;
  issueKind: AttendanceIssueKind | null;
  lastAttemptAt: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  projectId: string;
  serverStatus: "SYNCED" | "FAILED" | "CONFLICT" | null;
  state: AttendanceActionState;
  workDate: string;
  workerId: string | null;
};

export type AttendanceSyncResult = {
  message: string;
  status: "SYNCED" | "FAILED" | "CONFLICT";
};

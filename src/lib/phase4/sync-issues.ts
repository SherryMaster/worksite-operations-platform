import type {
  AttendanceActionType,
  AttendanceIssueKind,
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

/**
 * Heuristics used to interpret a server-returned message and assign a
 * stable issue kind. Centralized here so the same words are recognized
 * whether the action comes from a fresh sync, a legacy IndexedDB row, or
 * a discarded load.
 */
const AUTHORIZATION_PHRASES = [
  "sign in again",
  "no longer have permission",
  "attendance access",
  "action identifier belongs to another user",
  "foreman",
  "another project",
];

const DEPENDENCY_PHRASES = [
  "session could not be found",
  "session not found",
  "open work session",
  "open break could not be found",
  "open break not found",
  "break can only start",
  "end the open break",
];

const VALIDATION_PHRASES = [
  "already exited",
  "invalid interval",
  "overlap",
  "inactive",
  "not active on this project",
  "active application user",
  "an active application user",
  "correction reason is required",
  "corrected times",
  "unsupported attendance action",
];

const STORAGE_PHRASES = [
  "this device",
  "device storage",
  "saved on this device",
];

const UNKNOWN_PHRASES = [
  "no server response",
  "server could not process",
  "invalid attendance response",
  "temporarily busy",
];

/**
 * Stable, plain-English reason a Foreman or CEO can act on without
 * reading a technical message. Derived from the server message and the
 * action type so two errors with different wording still surface
 * consistent copy.
 */
export function classifyIssue(
  action: AttendanceQueueAction,
): AttendanceIssueKind {
  const message = (action.message ?? "").toLowerCase();
  const status = action.serverStatus;

  if (status === "CONFLICT") {
    if (
      DEPENDENCY_PHRASES.some((phrase) => message.includes(phrase)) &&
      isDependentAction(action.actionType)
    ) {
      return "DEPENDENCY";
    }
    if (VALIDATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "VALIDATION";
    }
    return "CONFLICT";
  }

  if (status === "FAILED") {
    if (AUTHORIZATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "AUTHORIZATION";
    }
    if (
      DEPENDENCY_PHRASES.some((phrase) => message.includes(phrase)) &&
      isDependentAction(action.actionType)
    ) {
      return "DEPENDENCY";
    }
    if (VALIDATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "VALIDATION";
    }
    if (STORAGE_PHRASES.some((phrase) => message.includes(phrase))) {
      return "LOCAL_STORAGE";
    }
    if (UNKNOWN_PHRASES.some((phrase) => message.includes(phrase))) {
      return "UNKNOWN";
    }
    return "UNKNOWN";
  }

  if (action.state === "RETRYABLE") {
    if (AUTHORIZATION_PHRASES.some((phrase) => message.includes(phrase))) {
      return "AUTHORIZATION";
    }
    if (STORAGE_PHRASES.some((phrase) => message.includes(phrase))) {
      return "LOCAL_STORAGE";
    }
    return "UNKNOWN";
  }

  return "UNKNOWN";
}

function isDependentAction(actionType: AttendanceActionType) {
  return (
    actionType === "EXIT" ||
    actionType === "START_BREAK" ||
    actionType === "END_BREAK"
  );
}

export function issueLabel(kind: AttendanceIssueKind) {
  switch (kind) {
    case "CONFLICT":
      return "Conflict";
    case "VALIDATION":
      return "Validation";
    case "DEPENDENCY":
      return "Dependency";
    case "AUTHORIZATION":
      return "Access";
    case "LOCAL_STORAGE":
      return "Device";
    case "UNKNOWN":
      return "Review";
  }
}

export function issueTone(kind: AttendanceIssueKind) {
  switch (kind) {
    case "CONFLICT":
    case "VALIDATION":
    case "DEPENDENCY":
    case "UNKNOWN":
      return "red" as const;
    case "AUTHORIZATION":
      return "amber" as const;
    case "LOCAL_STORAGE":
      return "slate" as const;
  }
}

const DEPENDENCY_DESCRIPTIONS: Record<AttendanceActionType, string> = {
  EXIT: "The exit could not find the work session it referred to.",
  START_BREAK:
    "The break could not start because the work session was missing.",
  END_BREAK: "The break could not end because the break was missing.",
  ENTER: "The entrance could not be recorded.",
  SET_DAY_TYPE: "The day type could not be saved.",
  CORRECT_DAY: "The correction could not be saved.",
};

const ROOT_DESCRIPTIONS: Partial<Record<AttendanceIssueKind, string>> = {
  CONFLICT: "Device changes conflict with the current server record.",
  VALIDATION: "Device changes are not valid for the current attendance.",
  DEPENDENCY:
    "Earlier device changes failed, so later actions for the same worker and date could not be applied.",
  AUTHORIZATION: "This device no longer has access to the project.",
  LOCAL_STORAGE: "The device could not save one or more changes locally.",
  UNKNOWN: "The device change could not be applied to the server.",
};

/**
 * Concise user-facing summary for a single issue group. Two sentences max,
 * written for non-technical company staff.
 */
export function groupSummary(
  root: AttendanceQueueAction,
  kind: AttendanceIssueKind,
  dependentCount: number,
): string {
  if (kind === "DEPENDENCY" && dependentCount > 0) {
    return (
      DEPENDENCY_DESCRIPTIONS[root.actionType] ??
      ROOT_DESCRIPTIONS.DEPENDENCY ??
      "Earlier device changes failed, so later actions could not be applied."
    );
  }
  return (
    ROOT_DESCRIPTIONS[kind] ??
    "The device change could not be applied to the server."
  );
}

/**
 * Single short reason for a worker row. Kept short enough to fit on one
 * line beside the worker name on mobile.
 */
export function shortReason(
  root: AttendanceQueueAction,
  kind: AttendanceIssueKind,
): string {
  if (kind === "CONFLICT") {
    return "Device changes conflict with the current server record";
  }
  if (kind === "VALIDATION") {
    return "Device changes are not valid for the current attendance";
  }
  if (kind === "DEPENDENCY") {
    return "Earlier device change failed for this worker and date";
  }
  if (kind === "AUTHORIZATION") {
    return "This device no longer has project access";
  }
  if (kind === "LOCAL_STORAGE") {
    return "Device storage could not save the change";
  }
  return root.message ?? "Device change could not be applied";
}

export type AttendanceSyncIssueGroup = {
  actionIds: string[];
  actionCount: number;
  issueKind: AttendanceIssueKind;
  primaryMessage: string;
  projectId: string;
  rootAction: AttendanceQueueAction;
  technicalActions: AttendanceQueueAction[];
  workerId: string | null;
  workDate: string;
};

/**
 * Build the display model consumed by the issue center. Groups every
 * `REVIEW_REQUIRED` action by `projectId + workDate + workerId`, picks the
 * first conflict/validation action as the root, and rolls the rest into
 * the technical-details disclosure.
 *
 * The grouping is purely client-side and does not touch the server.
 */
export function buildAttendanceIssueGroups(
  actions: AttendanceQueueAction[],
): AttendanceSyncIssueGroup[] {
  const reviewable = actions.filter(
    (action) => action.state === "REVIEW_REQUIRED",
  );
  if (reviewable.length === 0) return [];

  const groups = new Map<string, AttendanceQueueAction[]>();
  for (const action of reviewable) {
    const key = `${action.projectId}:${action.workDate}:${action.workerId ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.push(action);
    } else {
      groups.set(key, [action]);
    }
  }

  const result: AttendanceSyncIssueGroup[] = [];
  for (const [key, groupActions] of groups) {
    const ordered = [...groupActions].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const root =
      ordered.find(
        (action) =>
          action.serverStatus === "CONFLICT" ||
          classifyIssue(action) === "VALIDATION",
      ) ?? ordered[0];
    if (!root) continue;
    const kind = classifyIssue(root);
    const summary = groupSummary(root, kind, ordered.length - 1);
    const [, projectId, workDate, workerKey] = key.split(":");
    result.push({
      actionIds: ordered.map((action) => action.clientActionId),
      actionCount: ordered.length,
      issueKind: kind,
      primaryMessage: summary,
      projectId,
      rootAction: root,
      technicalActions: ordered,
      workerId: workerKey ? workerKey : null,
      workDate: workDate ?? root.workDate,
    });
  }

  return result.sort((left, right) => {
    const leftTime = left.rootAction.createdAt;
    const rightTime = right.rootAction.createdAt;
    return rightTime.localeCompare(leftTime);
  });
}

/**
 * Select the action ids that may be resent because the server never
 * returned a terminal verdict for the same id. Conflicts and deterministic
 * FAILED verdicts are excluded so retries cannot loop forever.
 */
export function selectRetryableActionIds(
  actions: AttendanceQueueAction[],
): string[] {
  return actions
    .filter((action) => action.state === "RETRYABLE")
    .map((action) => action.clientActionId);
}

/**
 * Normalize legacy IndexedDB records by inferring the workerId and
 * workDate from sibling ENTER / START_BREAK actions. The new build stores
 * these on every action at creation time, but rows written by an earlier
 * client may still be present on real devices. The original rows are
 * persisted back so a reload does not require inference again.
 */
export function inferLegacyActionMetadata(
  actions: AttendanceQueueAction[],
  snapshot: AttendanceSnapshot,
): { actions: AttendanceQueueAction[]; inferred: boolean } {
  const sessionToWorker = new Map<
    string,
    { workerId: string; workDate: string }
  >();
  const breakToSession = new Map<string, string>();

  for (const action of actions) {
    if (action.actionType === "ENTER") {
      const workerId =
        action.workerId ??
        (typeof action.payload.workerId === "string"
          ? action.payload.workerId
          : null);
      const workDate =
        action.workDate ||
        (typeof action.payload.workDate === "string"
          ? action.payload.workDate
          : "");
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      if (workerId && sessionId) {
        sessionToWorker.set(sessionId, { workDate, workerId });
      }
    } else if (action.actionType === "START_BREAK") {
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      const breakId =
        typeof action.payload.breakId === "string"
          ? action.payload.breakId
          : null;
      if (sessionId && breakId) {
        breakToSession.set(breakId, sessionId);
      }
    }
  }

  let inferred = false;
  const next = actions.map((action) => {
    if (action.workerId && action.workDate) return action;

    let workerId: string | null = null;
    let workDate: string = action.workDate;

    if (action.actionType === "EXIT") {
      const sessionId =
        typeof action.payload.sessionId === "string"
          ? action.payload.sessionId
          : null;
      const map = sessionId ? sessionToWorker.get(sessionId) : undefined;
      if (map) {
        workerId = map.workerId;
        workDate = map.workDate;
      }
    } else if (action.actionType === "END_BREAK") {
      const breakId =
        typeof action.payload.breakId === "string"
          ? action.payload.breakId
          : null;
      const sessionId = breakId ? breakToSession.get(breakId) : null;
      const map = sessionId ? sessionToWorker.get(sessionId) : undefined;
      if (map) {
        workerId = map.workerId;
        workDate = map.workDate;
      }
    }

    if (!workerId) {
      // Fall back to the current snapshot: search for the session/break id
      // before the snapshot refresh wiped the optimistic local record.
      const lookup = findWorkerInSnapshot(action, snapshot);
      if (lookup.workerId) {
        workerId = lookup.workerId;
      }
      if (!workDate && lookup.workDate) {
        workDate = lookup.workDate;
      }
    }

    if (workerId || workDate) {
      inferred = true;
      return { ...action, workDate, workerId };
    }
    return action;
  });

  return { actions: next, inferred };
}

function findWorkerInSnapshot(
  action: AttendanceQueueAction,
  snapshot: AttendanceSnapshot,
): { workDate: string; workerId: string | null } {
  const sessionId =
    typeof action.payload.sessionId === "string"
      ? action.payload.sessionId
      : null;
  const breakId =
    typeof action.payload.breakId === "string" ? action.payload.breakId : null;
  for (const session of snapshot.sessions) {
    if (sessionId && session.id === sessionId) {
      return { workDate: snapshot.workDate, workerId: session.workerId };
    }
    for (const breakRecord of session.breaks) {
      if (breakId && breakRecord.id === breakId) {
        return { workDate: snapshot.workDate, workerId: session.workerId };
      }
    }
  }
  return { workDate: "", workerId: null };
}

/**
 * Worker-facing summary for a day's device attempts: how many raw device
 * actions are pending, syncing, retryable, or review-required.
 */
export function summarizeDeviceActionCounts(actions: AttendanceQueueAction[]) {
  let pending = 0;
  let retryable = 0;
  let review = 0;
  for (const action of actions) {
    if (action.state === "PENDING" || action.state === "SYNCING") pending += 1;
    if (action.state === "RETRYABLE") retryable += 1;
    if (action.state === "REVIEW_REQUIRED") review += 1;
  }
  return { pending, retryable, review };
}

/**
 * After a successful CORRECT_DAY action for a worker/date we want to
 * delete every older REVIEW_REQUIRED action for the same project/worker/date
 * so the issue card disappears. New CORRECT_DAY actions are intentionally
 * excluded — they are the resolution, not the original problem.
 */
export function selectResolutionsAfterCorrection(
  actions: AttendanceQueueAction[],
  correctionAction: AttendanceQueueAction,
): string[] {
  return actions
    .filter(
      (action) =>
        action.clientActionId !== correctionAction.clientActionId &&
        action.state === "REVIEW_REQUIRED" &&
        action.projectId === correctionAction.projectId &&
        action.workDate === correctionAction.workDate &&
        action.workerId === correctionAction.workerId,
    )
    .map((action) => action.clientActionId);
}

/**
 * Reasonable default for the queue item displayed in the worker row when
 * a worker has multiple per-day issues. We surface the root cause so the
 * row shows the real reason and not a downstream chain failure.
 */
export function primaryReviewAction(
  actions: AttendanceQueueAction[],
): AttendanceQueueAction | null {
  const reviewable = actions
    .filter((action) => action.state === "REVIEW_REQUIRED")
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  if (reviewable.length === 0) return null;
  return (
    reviewable.find(
      (action) =>
        action.serverStatus === "CONFLICT" ||
        classifyIssue(action) === "VALIDATION",
    ) ?? reviewable[0]
  );
}

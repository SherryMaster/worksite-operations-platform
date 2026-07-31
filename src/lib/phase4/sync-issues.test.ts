import { describe, expect, it } from "vitest";

import {
  buildAttendanceIssueGroups,
  classifyIssue,
  inferLegacyActionMetadata,
  issueLabel,
  primaryReviewAction,
  selectResolutionsAfterCorrection,
  selectRetryableActionIds,
} from "@/lib/phase4/sync-issues";
import type {
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

const PROJECT = "41000000-0000-0000-0000-000000000001";
const WORKER_A = "42000000-0000-0000-0000-000000000001";
const WORKER_B = "42000000-0000-0000-0000-000000000002";
const WORK_DATE = "2026-07-20";

function reviewAction(
  overrides: Partial<AttendanceQueueAction> & {
    actionType: AttendanceQueueAction["actionType"];
    clientActionId: string;
    serverStatus: "CONFLICT" | "FAILED";
    workerId: string;
  },
): AttendanceQueueAction {
  return {
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    issueKind: null,
    lastAttemptAt: overrides.lastAttemptAt ?? new Date().toISOString(),
    message: overrides.message ?? "Server rejected the action.",
    payload: overrides.payload ?? {},
    projectId: PROJECT,
    state: "REVIEW_REQUIRED",
    workDate: WORK_DATE,
    ...overrides,
  };
}

describe("buildAttendanceIssueGroups", () => {
  it("groups 20 raw failed actions for two workers into two issue groups", () => {
    const actions: AttendanceQueueAction[] = [];
    for (let i = 0; i < 10; i += 1) {
      actions.push(
        reviewAction({
          actionType: "ENTER",
          clientActionId: `a-${i}`,
          createdAt: `2026-07-20T08:0${i}:00+08:00`,
          message: "This action conflicts with the current attendance record.",
          serverStatus: "CONFLICT",
          workerId: WORKER_A,
        }),
      );
    }
    for (let i = 0; i < 10; i += 1) {
      actions.push(
        reviewAction({
          actionType: "ENTER",
          clientActionId: `b-${i}`,
          createdAt: `2026-07-20T08:1${i}:00+08:00`,
          message: "This action conflicts with the current attendance record.",
          serverStatus: "CONFLICT",
          workerId: WORKER_B,
        }),
      );
    }

    const groups = buildAttendanceIssueGroups(actions);
    expect(groups).toHaveLength(2);
    const counts = groups.map((group) => group.actionCount).sort();
    expect(counts).toEqual([10, 10]);
  });

  it("treats dependent not-found actions as consequences of the root conflict", () => {
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "ENTER",
        clientActionId: "enter",
        createdAt: "2026-07-20T08:00:00+08:00",
        message: "This action conflicts with the current attendance record.",
        serverStatus: "CONFLICT",
        workerId: WORKER_A,
      }),
      reviewAction({
        actionType: "EXIT",
        clientActionId: "exit",
        createdAt: "2026-07-20T17:00:00+08:00",
        message: "The active work session could not be found",
        payload: { sessionId: "session-x" },
        serverStatus: "FAILED",
        workerId: WORKER_A,
      }),
      reviewAction({
        actionType: "START_BREAK",
        clientActionId: "start",
        createdAt: "2026-07-20T13:00:00+08:00",
        message: "A break can only start inside an open work session",
        payload: { breakId: "break-x", sessionId: "session-x" },
        serverStatus: "FAILED",
        workerId: WORKER_A,
      }),
    ];

    const groups = buildAttendanceIssueGroups(actions);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.actionCount).toBe(3);
    expect(groups[0]?.rootAction.clientActionId).toBe("enter");
    expect(groups[0]?.issueKind).toBe("CONFLICT");
    const dependentIds = groups[0]?.technicalActions
      .map((action) => action.clientActionId)
      .filter((id) => id !== "enter");
    expect(dependentIds).toEqual(expect.arrayContaining(["exit", "start"]));
  });
});

describe("inferLegacyActionMetadata", () => {
  it("recovers worker and work date for legacy EXIT/break actions", () => {
    const actions: AttendanceQueueAction[] = [
      {
        actionType: "ENTER",
        clientActionId: "enter-1",
        createdAt: "2026-07-20T08:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: {
          capturedOffline: true,
          sessionId: "session-1",
          workerId: WORKER_A,
          workDate: WORK_DATE,
        },
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: WORK_DATE,
        workerId: WORKER_A,
      },
      {
        actionType: "START_BREAK",
        clientActionId: "start-1",
        createdAt: "2026-07-20T13:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: { breakId: "break-1", sessionId: "session-1" },
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: "",
        workerId: null,
      },
      {
        actionType: "EXIT",
        clientActionId: "exit-1",
        createdAt: "2026-07-20T17:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: { sessionId: "session-1" },
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: "",
        workerId: null,
      },
    ];
    const snapshot: AttendanceSnapshot = {
      dayType: "NORMAL",
      projectId: PROJECT,
      projectName: "Project",
      sessions: [],
      updatedAt: "2026-07-20T00:00:00.000Z",
      workDate: WORK_DATE,
      workers: [],
    };

    const result = inferLegacyActionMetadata(actions, snapshot);
    expect(result.inferred).toBe(true);
    const recovered = result.actions.find(
      (action) => action.clientActionId === "exit-1",
    );
    expect(recovered?.workerId).toBe(WORKER_A);
    expect(recovered?.workDate).toBe(WORK_DATE);
  });
});

describe("selectRetryableActionIds", () => {
  it("never returns review-required action ids", () => {
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "ENTER",
        clientActionId: "review-1",
        serverStatus: "CONFLICT",
        workerId: WORKER_A,
      }),
      {
        actionType: "ENTER",
        clientActionId: "retry-1",
        createdAt: "2026-07-20T08:00:00+08:00",
        issueKind: "AUTHORIZATION",
        lastAttemptAt: null,
        message: "Sign in again or restore project access, then retry.",
        payload: {},
        projectId: PROJECT,
        serverStatus: null,
        state: "RETRYABLE",
        workDate: WORK_DATE,
        workerId: WORKER_A,
      },
    ];
    expect(selectRetryableActionIds(actions)).toEqual(["retry-1"]);
  });
});

describe("selectResolutionsAfterCorrection", () => {
  it("returns all older review-required action ids for the same worker/date", () => {
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "ENTER",
        clientActionId: "review-1",
        serverStatus: "CONFLICT",
        workerId: WORKER_A,
      }),
      reviewAction({
        actionType: "EXIT",
        clientActionId: "review-2",
        serverStatus: "FAILED",
        workerId: WORKER_A,
      }),
      {
        actionType: "CORRECT_DAY",
        clientActionId: "correct-1",
        createdAt: "2026-07-20T18:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: {},
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: WORK_DATE,
        workerId: WORKER_A,
      },
    ];
    const correction = actions[2]!;
    const ids = selectResolutionsAfterCorrection(actions, correction);
    expect(ids).toEqual(["review-1", "review-2"]);
  });
});

describe("classifyIssue + issueLabel", () => {
  it("maps dependency wording to DEPENDENCY", () => {
    const action = reviewAction({
      actionType: "EXIT",
      clientActionId: "dep-1",
      message: "The active work session could not be found",
      serverStatus: "FAILED",
      workerId: WORKER_A,
    });
    expect(classifyIssue(action)).toBe("DEPENDENCY");
    expect(issueLabel("DEPENDENCY")).toBe("Dependency");
  });
});

describe("primaryReviewAction", () => {
  it("prefers the conflict over a dependent not-found action", () => {
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "EXIT",
        clientActionId: "dep-1",
        createdAt: "2026-07-20T17:00:00+08:00",
        message: "The active work session could not be found",
        serverStatus: "FAILED",
        workerId: WORKER_A,
      }),
      reviewAction({
        actionType: "ENTER",
        clientActionId: "root-1",
        createdAt: "2026-07-20T08:00:00+08:00",
        message: "This action conflicts with the current attendance record.",
        serverStatus: "CONFLICT",
        workerId: WORKER_A,
      }),
    ];
    expect(primaryReviewAction(actions)?.clientActionId).toBe("root-1");
  });
});

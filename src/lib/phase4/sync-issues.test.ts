import { describe, expect, it } from "vitest";

import {
  buildAttendanceIssueGroups,
  classifyIssue,
  correctionFromPayload,
  inferLegacyActionMetadata,
  issueGroupKey,
  issueLabel,
  malaysiaInputFromIso,
  presentAttendanceIssue,
  primaryReviewAction,
  selectGroupRoot,
  selectResolutionsAfterCorrection,
  selectRetryableActionIds,
  validateCorrectionSessions,
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
        message: "The server already has a different entrance for this worker.",
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

  it("preserves the exact projectId, workDate, and workerId from the root action", () => {
    // Regression for the issue-center crash: business fields used to be
    // parsed back from the composite Map key, which shifted the values
    // and turned the worker UUID into the workDate.
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "ENTER",
        clientActionId: "a",
        createdAt: "2026-07-20T08:00:00+08:00",
        message: "This action conflicts with the current attendance record.",
        projectId: PROJECT,
        serverStatus: "CONFLICT",
        workDate: WORK_DATE,
        workerId: WORKER_A,
      }),
    ];
    const [group] = buildAttendanceIssueGroups(actions);
    expect(group).toBeDefined();
    expect(group?.projectId).toBe(PROJECT);
    expect(group?.workDate).toBe(WORK_DATE);
    expect(group?.workerId).toBe(WORKER_A);
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
    const recoveredStart = result.actions.find(
      (action) => action.clientActionId === "start-1",
    );
    expect(recoveredStart?.workerId).toBe(WORKER_A);
    expect(recoveredStart?.workDate).toBe(WORK_DATE);
  });

  it("preserves object identity for actions that did not need repair", () => {
    const actions: AttendanceQueueAction[] = [
      {
        actionType: "EXIT",
        clientActionId: "exit-already-ok",
        createdAt: "2026-07-20T17:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: { sessionId: "session-1" },
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: WORK_DATE,
        workerId: WORKER_A,
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
    expect(result.inferred).toBe(false);
    expect(result.actions[0]).toBe(actions[0]);
  });

  it("preserves an existing workerId when only workDate is missing", () => {
    const actions: AttendanceQueueAction[] = [
      {
        actionType: "EXIT",
        clientActionId: "exit-keep",
        createdAt: "2026-07-20T17:00:00+08:00",
        issueKind: null,
        lastAttemptAt: null,
        message: null,
        payload: { sessionId: "session-1" },
        projectId: PROJECT,
        serverStatus: "SYNCED",
        state: "SYNCED",
        workDate: "",
        workerId: WORKER_B,
      },
    ];
    // Snapshot points at worker A for the session id, but the EXIT
    // already has a valid workerId. The workerId must not be replaced.
    const snapshot: AttendanceSnapshot = {
      dayType: "NORMAL",
      projectId: PROJECT,
      projectName: "Project",
      sessions: [
        {
          breaks: [],
          enteredAt: "2026-07-20T08:00:00+08:00",
          exitedAt: null,
          id: "session-1",
          workerId: WORKER_A,
        },
      ],
      updatedAt: "2026-07-20T00:00:00.000Z",
      workDate: WORK_DATE,
      workers: [
        {
          id: WORKER_A,
          legalName: "Worker A",
          skillName: null,
          tradeName: null,
        },
        {
          id: WORKER_B,
          legalName: "Worker B",
          skillName: null,
          tradeName: null,
        },
      ],
    };

    const result = inferLegacyActionMetadata(actions, snapshot);
    expect(result.inferred).toBe(true);
    const recovered = result.actions.find(
      (action) => action.clientActionId === "exit-keep",
    );
    expect(recovered?.workerId).toBe(WORKER_B);
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

  it("resolves older review-required actions from the stored queue after a successful correction in the operational flow", () => {
    // Older REVIEW_REQUIRED actions for worker A are already in IndexedDB
    // from previous sync rounds, plus a REVIEW_REQUIRED action for worker B
    // that belongs to a different worker. The pending CORRECT_DAY is
    // waiting to be sent to the server.
    const reviewA1 = reviewAction({
      actionType: "ENTER",
      clientActionId: "a-enter",
      serverStatus: "CONFLICT",
      workerId: WORKER_A,
    });
    const reviewA2 = reviewAction({
      actionType: "EXIT",
      clientActionId: "a-exit",
      serverStatus: "FAILED",
      workerId: WORKER_A,
    });
    const reviewB1 = reviewAction({
      actionType: "ENTER",
      clientActionId: "b-enter",
      serverStatus: "CONFLICT",
      workerId: WORKER_B,
    });
    const pendingCorrection: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-a",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: null,
      lastAttemptAt: null,
      message: null,
      payload: {},
      projectId: PROJECT,
      serverStatus: null,
      state: "PENDING",
      workDate: WORK_DATE,
      workerId: WORKER_A,
    };
    const stored = [reviewA1, reviewA2, reviewB1, pendingCorrection];

    // The current synchronization request only carries the pending
    // actions, and the server response only contains verdicts for those
    // ids. The CORRECT_DAY came back SYNCED; the others are not in this
    // round at all.
    const currentResults: AttendanceQueueAction[] = [
      {
        ...pendingCorrection,
        issueKind: null,
        lastAttemptAt: new Date().toISOString(),
        message: null,
        serverStatus: "SYNCED",
        state: "SYNCED",
      },
    ];

    // The component merges the freshly classified actions into the
    // stored queue before asking which older rows can be cleaned up.
    const nextMap = new Map(
      currentResults.map((action) => [action.clientActionId, action]),
    );
    const mergedQueue = stored.map(
      (action) => nextMap.get(action.clientActionId) ?? action,
    );

    const correction = mergedQueue.find(
      (action) => action.clientActionId === "correct-a",
    )!;
    const ids = selectResolutionsAfterCorrection(mergedQueue, correction);

    // The successful correction clears worker A's older review actions,
    // leaves worker B's issue alone, and never selects itself.
    expect(ids).toEqual(["a-enter", "a-exit"]);
    expect(ids).not.toContain("correct-a");
    expect(ids).not.toContain("b-enter");
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

  it("maps 'conflicts with the current attendance' to VALIDATION for any action type", () => {
    const action = reviewAction({
      actionType: "ENTER",
      clientActionId: "conflict-1",
      message: "This action conflicts with the current attendance record.",
      serverStatus: "CONFLICT",
      workerId: WORKER_A,
    });
    expect(classifyIssue(action)).toBe("VALIDATION");
  });

  it("returns the same kind for the same wording regardless of whether the action is fresh, stored, or grouped", () => {
    const message = "This action conflicts with the current attendance record.";
    const fresh = reviewAction({
      actionType: "ENTER",
      clientActionId: "fresh",
      message,
      serverStatus: "CONFLICT",
      workerId: WORKER_A,
    });
    const stored: AttendanceQueueAction = {
      ...fresh,
      clientActionId: "stored",
      state: "REVIEW_REQUIRED",
    };
    const group = buildAttendanceIssueGroups([stored])[0];
    expect(group).toBeDefined();
    expect(classifyIssue(fresh)).toBe("VALIDATION");
    expect(classifyIssue(stored)).toBe("VALIDATION");
    expect(group?.issueKind).toBe("VALIDATION");
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

describe("validateCorrectionSessions", () => {
  it("flags a session that ends at the same time it starts", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [],
          enteredAt: "2026-07-20T08:40:00",
          exitedAt: "2026-07-20T08:40:00",
        },
      ],
      "2026-07-20",
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toBe(
      "Session 1 ends at the same time it starts.",
    );
    expect(problems[0]?.field).toBe("exit");
    expect(problems[0]?.sessionIndex).toBe(0);
  });

  it("flags a session whose exit is before its enter", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [],
          enteredAt: "2026-07-20T14:46:00",
          exitedAt: "2026-07-20T13:46:00",
        },
      ],
      "2026-07-20",
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toBe("Session 1 ends before it starts.");
  });

  it("identifies which sessions overlap", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [],
          enteredAt: "2026-07-20T08:00:00",
          exitedAt: "2026-07-20T12:00:00",
        },
        {
          breaks: [],
          enteredAt: "2026-07-20T11:00:00",
          exitedAt: "2026-07-20T15:00:00",
        },
      ],
      "2026-07-20",
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toBe("Session 2 overlaps Session 1.");
    expect(problems[0]?.sessionIndex).toBe(1);
  });

  it("reports the open-session error exactly once when an open session is followed by another session", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [],
          enteredAt: "2026-07-20T08:00:00",
          exitedAt: "",
        },
        {
          breaks: [],
          enteredAt: "2026-07-20T13:00:00",
          exitedAt: "2026-07-20T17:00:00",
        },
      ],
      "2026-07-20",
    );
    const openMessages = problems.filter((problem) =>
      problem.message.includes("is still open"),
    );
    expect(openMessages).toHaveLength(1);
    expect(openMessages[0]?.sessionIndex).toBe(0);
    expect(openMessages[0]?.field).toBe("exit");
  });

  it("returns no problems for a valid correction", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [
            {
              endedAt: "2026-07-20T10:00:00",
              startedAt: "2026-07-20T09:00:00",
            },
          ],
          enteredAt: "2026-07-20T08:00:00",
          exitedAt: "2026-07-20T17:00:00",
        },
      ],
      "2026-07-20",
    );
    expect(problems).toEqual([]);
  });

  it("flags a closed session that still contains an open break", () => {
    const problems = validateCorrectionSessions(
      [
        {
          breaks: [{ endedAt: "", startedAt: "2026-07-20T10:00:00" }],
          enteredAt: "2026-07-20T08:00:00",
          exitedAt: "2026-07-20T17:00:00",
        },
      ],
      "2026-07-20",
    );
    expect(problems).toHaveLength(1);
    expect(problems[0]?.message).toBe(
      "Session 1 is closed. Close Break 1 or leave the session open.",
    );
  });
});

describe("presentAttendanceIssue for a failed CORRECT_DAY", () => {
  it("explains the exact invalid sessions and never shows the generic message", () => {
    const failed: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-failed",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: "VALIDATION",
      lastAttemptAt: "2026-07-20T18:00:05+08:00",
      message: "The corrected times overlap or contain an invalid interval.",
      payload: {
        note: "fix small session",
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
          {
            breaks: [],
            enteredAt: "2026-07-20T14:46:00+08:00",
            exitedAt: "2026-07-20T13:46:00+08:00",
            id: "session-2",
          },
        ],
        workerId: WORKER_A,
        workDate: "2026-07-20",
      },
      projectId: PROJECT,
      serverStatus: "FAILED",
      state: "REVIEW_REQUIRED",
      workDate: "2026-07-20",
      workerId: WORKER_A,
    };
    const presentation = presentAttendanceIssue(failed, "2026-07-20");
    expect(presentation.label).toBe("Invalid correction");
    expect(presentation.rowSummary).toBe(
      "Correction has invalid session times",
    );
    expect(presentation.explanation).toContain(
      "Session 1 ends at the same time it starts.",
    );
    expect(presentation.explanation).toContain(
      "Session 2 ends before it starts.",
    );
    expect(presentation.resolution).toBe(
      "Correct the highlighted times, then save the correction again.",
    );
    expect(presentation.correctionProblems.length).toBe(2);
  });

  it("reports the access message even when the CORRECT_DAY payload is also locally invalid", () => {
    const failed: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-auth",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: "AUTHORIZATION",
      lastAttemptAt: "2026-07-20T18:00:05+08:00",
      message: "Sign in again or restore project access, then retry.",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
        ],
      },
      projectId: PROJECT,
      serverStatus: "FAILED",
      state: "REVIEW_REQUIRED",
      workDate: "2026-07-20",
      workerId: WORKER_A,
    };
    const presentation = presentAttendanceIssue(failed, "2026-07-20");
    expect(presentation.label).toBe("Project access lost");
    expect(presentation.tone).toBe("amber");
  });

  it("reports the device-storage message even when the CORRECT_DAY payload is also locally invalid", () => {
    const failed: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-storage",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: "LOCAL_STORAGE",
      lastAttemptAt: "2026-07-20T18:00:05+08:00",
      message: "This action could not be saved on this device.",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
        ],
      },
      projectId: PROJECT,
      serverStatus: "FAILED",
      state: "REVIEW_REQUIRED",
      workDate: "2026-07-20",
      workerId: WORKER_A,
    };
    const presentation = presentAttendanceIssue(failed, "2026-07-20");
    expect(presentation.label).toBe("Device storage error");
    expect(presentation.tone).toBe("slate");
  });

  it("still reports correction-specific presentation for an ordinary invalid correction", () => {
    const failed: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-plain",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: "VALIDATION",
      lastAttemptAt: "2026-07-20T18:00:05+08:00",
      message: "The corrected times overlap or contain an invalid interval.",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:40:00+08:00",
            exitedAt: "2026-07-20T08:40:00+08:00",
            id: "session-1",
          },
        ],
      },
      projectId: PROJECT,
      serverStatus: "FAILED",
      state: "REVIEW_REQUIRED",
      workDate: "2026-07-20",
      workerId: WORKER_A,
    };
    const presentation = presentAttendanceIssue(failed, "2026-07-20");
    expect(presentation.label).toBe("Invalid correction");
  });
});

describe("selectGroupRoot for mixed failed actions", () => {
  it("prefers the newest failed CORRECT_DAY over an older generic conflict", () => {
    const actions: AttendanceQueueAction[] = [
      reviewAction({
        actionType: "ENTER",
        clientActionId: "old-conflict",
        createdAt: "2026-07-20T08:00:00+08:00",
        message: "This action conflicts with the current attendance record.",
        serverStatus: "CONFLICT",
        workerId: WORKER_A,
      }),
      reviewAction({
        actionType: "CORRECT_DAY",
        clientActionId: "new-correction",
        createdAt: "2026-07-20T18:00:00+08:00",
        message: "The corrected times overlap or contain an invalid interval.",
        serverStatus: "FAILED",
        workerId: WORKER_A,
      }),
    ];
    expect(selectGroupRoot(actions)?.clientActionId).toBe("new-correction");
  });
});

describe("malaysiaInputFromIso (production formatter)", () => {
  it("preserves sub-minute sessions with seconds and treats null exit as Open", () => {
    const entered = malaysiaInputFromIso("2026-07-20T08:40:16+08:00");
    const exited = malaysiaInputFromIso("2026-07-20T08:40:34+08:00");
    const open = malaysiaInputFromIso(null);
    const invalid = malaysiaInputFromIso("not-a-real-timestamp");
    expect(entered).toBe("2026-07-20T08:40:16");
    expect(exited).toBe("2026-07-20T08:40:34");
    expect(open).toBe("");
    expect(invalid).toBe("");
  });
});

describe("correctionFromPayload", () => {
  it("returns the sessions in the original order and drops invalid entries", () => {
    const action: AttendanceQueueAction = {
      actionType: "CORRECT_DAY",
      clientActionId: "correct-order",
      createdAt: "2026-07-20T18:00:00+08:00",
      issueKind: "VALIDATION",
      lastAttemptAt: null,
      message: "Invalid",
      payload: {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T08:00:00+08:00",
            exitedAt: "2026-07-20T12:00:00+08:00",
            id: "session-1",
          },
          // No enteredAt — must be dropped
          { breaks: [], exitedAt: "2026-07-20T14:00:00+08:00", id: "x" },
          {
            breaks: [
              {
                endedAt: null,
                startedAt: "2026-07-20T10:00:00+08:00",
              },
            ],
            enteredAt: "2026-07-20T13:00:00+08:00",
            exitedAt: null,
            id: "session-2",
          },
        ],
      },
      projectId: PROJECT,
      serverStatus: "FAILED",
      state: "REVIEW_REQUIRED",
      workDate: WORK_DATE,
      workerId: WORKER_A,
    };
    const sessions = correctionFromPayload(action);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.enteredAt).toBe("2026-07-20T08:00:00+08:00");
    expect(sessions[1]?.enteredAt).toBe("2026-07-20T13:00:00+08:00");
    expect(sessions[1]?.exitedAt).toBeNull();
    expect(sessions[1]?.breaks[0]?.endedAt).toBeNull();
  });
});

describe("issueGroupKey", () => {
  function makeGroup(
    actionIds: string[],
    workerId: string | null,
  ): Parameters<typeof issueGroupKey>[0] {
    return {
      actionCount: actionIds.length,
      actionIds,
      issueKind: "VALIDATION",
      primaryMessage: "Test",
      projectId: PROJECT,
      rootAction: reviewAction({
        actionType: "ENTER",
        clientActionId: actionIds[0] ?? "empty",
        serverStatus: "FAILED",
        workerId: workerId ?? WORKER_A,
      }),
      technicalActions: [],
      workerId,
      workDate: WORK_DATE,
    };
  }

  it("uses the joined actionIds as the primary key", () => {
    expect(issueGroupKey(makeGroup(["a", "b", "c"], WORKER_A))).toBe("a:b:c");
  });

  it("falls back to a deterministic worker+date key when no action ids are present", () => {
    expect(issueGroupKey(makeGroup([], WORKER_A))).toBe(
      `${WORKER_A}::${WORK_DATE}`,
    );
    expect(issueGroupKey(makeGroup([], null))).toBe(`unknown::${WORK_DATE}`);
  });
});

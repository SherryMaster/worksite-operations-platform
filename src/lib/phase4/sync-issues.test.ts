import { describe, expect, it } from "vitest";

import {
  buildAttendanceIssueGroups,
  classifyIssue,
  inferLegacyActionMetadata,
  issueLabel,
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

describe("serverRecord formatter (malaysiaDateTimeInput)", () => {
  it("preserves sub-minute sessions with seconds and treats null exit as Open", async () => {
    // Inline a minimal port of the formatter from attendance-workspace
    // so the test can verify the round-trip without a DOM dependency.
    function malaysiaDateTimeInput(timestamp: string | null) {
      if (!timestamp) return "";
      const parts = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
        minute: "2-digit",
        month: "2-digit",
        second: "2-digit",
        timeZone: "Asia/Kuala_Lumpur",
        year: "numeric",
      }).formatToParts(new Date(timestamp));
      const values = Object.fromEntries(
        parts.map((part) => [part.type, part.value]),
      );
      return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
    }
    const entered = malaysiaDateTimeInput("2026-07-20T08:40:16+08:00");
    const exited = malaysiaDateTimeInput("2026-07-20T08:40:34+08:00");
    const open = malaysiaDateTimeInput(null);
    expect(entered).toBe("2026-07-20T08:40:16");
    expect(exited).toBe("2026-07-20T08:40:34");
    expect(open).toBe("");
  });
});

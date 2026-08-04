import { describe, expect, it } from "vitest";

import {
  applyLocalAttendanceAction,
  pauseAttendanceActions,
} from "@/lib/phase4/local-actions";
import type {
  AttendanceQueueAction,
  AttendanceSnapshot,
} from "@/lib/phase4/types";

const snapshot: AttendanceSnapshot = {
  dayType: "NORMAL",
  projectId: "41000000-0000-0000-0000-000000000001",
  projectName: "Project",
  sessions: [],
  updatedAt: "2026-07-20T00:00:00.000Z",
  workDate: "2026-07-20",
  workers: [
    {
      id: "42000000-0000-0000-0000-000000000001",
      legalName: "Worker",
      skillName: null,
      tradeName: null,
    },
  ],
};

function action(
  actionType: AttendanceQueueAction["actionType"],
  payload: Record<string, unknown>,
): AttendanceQueueAction {
  return {
    actionType,
    clientActionId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    issueKind: null,
    lastAttemptAt: null,
    message: null,
    payload,
    projectId: snapshot.projectId,
    serverStatus: null,
    state: "PENDING",
    workDate: snapshot.workDate,
    workerId: null,
  };
}

describe("applyLocalAttendanceAction", () => {
  it("makes an entrance immediately visible before synchronization", () => {
    const result = applyLocalAttendanceAction(
      snapshot,
      action("ENTER", {
        occurredAt: "2026-07-20T08:00:00+08:00",
        sessionId: "44000000-0000-0000-0000-000000000001",
        workerId: snapshot.workers[0].id,
      }),
    );

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.exitedAt).toBeNull();
  });

  it("replaces the locally visible worker day after a correction", () => {
    const withSession = {
      ...snapshot,
      sessions: [
        {
          breaks: [],
          enteredAt: "2026-07-20T08:00:00+08:00",
          exitedAt: null,
          id: "old",
          workerId: snapshot.workers[0].id,
        },
      ],
    };
    const result = applyLocalAttendanceAction(
      withSession,
      action("CORRECT_DAY", {
        sessions: [
          {
            breaks: [],
            enteredAt: "2026-07-20T09:00:00+08:00",
            exitedAt: "2026-07-20T17:00:00+08:00",
            id: "new",
          },
        ],
        workerId: snapshot.workers[0].id,
      }),
    );

    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.id).toBe("new");
    expect(result.sessions[0]?.workerId).toBe(snapshot.workers[0].id);
  });

  it("preserves immutable action IDs and payloads after a transport failure", () => {
    const queued = action("ENTER", {
      occurredAt: "2026-07-20T08:00:00+08:00",
      workerId: snapshot.workers[0].id,
    });
    const paused = pauseAttendanceActions(
      [{ ...queued, state: "SYNCING" }],
      "2026-07-20T08:01:00+08:00",
    );

    expect(paused).toHaveLength(1);
    expect(paused[0]).toMatchObject({
      clientActionId: queued.clientActionId,
      payload: queued.payload,
      state: "PENDING",
    });
  });
});

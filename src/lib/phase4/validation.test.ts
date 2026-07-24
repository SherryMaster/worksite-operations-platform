import { describe, expect, it } from "vitest";

import { attendanceSyncRequestSchema } from "@/lib/phase4/validation";

describe("attendanceSyncRequestSchema", () => {
  it("accepts a stable offline entrance action", () => {
    const result = attendanceSyncRequestSchema.safeParse({
      actions: [
        {
          actionType: "ENTER",
          clientActionId: "43000000-0000-4000-8000-000000000001",
          payload: {
            capturedOffline: true,
            occurredAt: "2026-07-20T08:00:00+08:00",
            sessionId: "44000000-0000-4000-8000-000000000001",
            workerId: "42000000-0000-4000-8000-000000000001",
            workDate: "2026-07-20",
          },
          projectId: "41000000-0000-4000-8000-000000000001",
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects a correction without an audit reason", () => {
    const result = attendanceSyncRequestSchema.safeParse({
      actions: [
        {
          actionType: "CORRECT_DAY",
          clientActionId: "43000000-0000-0000-0000-000000000001",
          payload: {
            note: "",
            sessions: [],
            workerId: "42000000-0000-0000-0000-000000000001",
            workDate: "2026-07-20",
          },
          projectId: "41000000-0000-0000-0000-000000000001",
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

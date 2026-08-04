import { describe, expect, it } from "vitest";

import {
  buildAttendanceWorkerDay,
  deriveLiveStatus,
  derivePresenceStatus,
  isEffectiveOn,
  rollupAttendanceMonth,
  summarizeAttendance,
} from "@/lib/phase4/attendance-monitor";
import type { AttendanceWorkerDaySource } from "@/lib/phase4/attendance-monitor-types";
import type { AttendanceSession } from "@/lib/phase4/types";

const WORKER = "42000000-0000-0000-0000-000000000001";
const PROJECT = "41000000-0000-0000-0000-000000000001";

function session(
  enteredAt: string,
  exitedAt: string | null,
  breaks: AttendanceSession["breaks"] = [],
): AttendanceSession {
  return {
    breaks,
    enteredAt,
    exitedAt,
    id: crypto.randomUUID(),
    workerId: WORKER,
  };
}

function source(
  overrides: Partial<AttendanceWorkerDaySource> = {},
): AttendanceWorkerDaySource {
  return {
    approvedLeaveType: null,
    dayType: "NORMAL",
    isExpected: true,
    projectId: PROJECT,
    projectName: "SAFAR",
    sessions: [],
    skillName: "Skilled",
    tradeName: "Electrician",
    workDate: "2026-08-04",
    workerId: WORKER,
    workerName: "Worker A",
    workerPhotoId: null,
    ...overrides,
  };
}

describe("attendance monitor presence semantics", () => {
  it("marks a historical normal worker-day without attendance or leave absent", () => {
    expect(
      derivePresenceStatus({
        approvedLeaveType: null,
        dayType: "NORMAL",
        now: new Date("2026-08-04T08:00:00Z"),
        sessionCount: 0,
        workDate: "2026-08-03",
      }),
    ).toBe("ABSENT");
  });

  it("switches today's missing entry at 17:00 Malaysia time", () => {
    const input = {
      approvedLeaveType: null,
      dayType: "NORMAL" as const,
      sessionCount: 0,
      workDate: "2026-08-04",
    };
    expect(
      derivePresenceStatus({
        ...input,
        now: new Date("2026-08-04T08:59:00Z"),
      }),
    ).toBe("NO_ENTRY_YET");
    expect(
      derivePresenceStatus({
        ...input,
        now: new Date("2026-08-04T09:00:00Z"),
      }),
    ).toBe("ABSENT");
  });

  it("never marks a future normal date absent", () => {
    const presence = derivePresenceStatus({
      approvedLeaveType: null,
      dayType: "NORMAL",
      now: new Date("2026-08-04T09:00:00Z"),
      sessionCount: 0,
      workDate: "2026-08-05",
    });
    expect(presence).toBe("NOT_APPLICABLE");
    const summary = summarizeAttendance(
      [
        buildAttendanceWorkerDay(
          source({ workDate: "2026-08-05" }),
          new Date("2026-08-04T09:00:00Z"),
        ),
      ],
      ["NORMAL"],
    );
    expect(summary.expected).toBe(0);
    expect(summary.absent).toBe(0);
  });

  it("keeps Sunday and public-holiday no-record days not applicable", () => {
    for (const dayType of ["SUNDAY", "PUBLIC_HOLIDAY"] as const) {
      expect(
        derivePresenceStatus({
          approvedLeaveType: null,
          dayType,
          now: new Date("2026-08-04T09:00:00Z"),
          sessionCount: 0,
          workDate: "2026-08-02",
        }),
      ).toBe("NOT_APPLICABLE");
    }
  });

  it("prioritizes sessions over approved leave and reports a conflict", () => {
    const record = buildAttendanceWorkerDay(
      source({
        approvedLeaveType: "Annual leave",
        sessions: [
          session("2026-08-04T08:00:00+08:00", "2026-08-04T17:00:00+08:00"),
        ],
      }),
      new Date("2026-08-04T09:00:00Z"),
    );
    expect(record.presenceStatus).toBe("PRESENT");
    expect(record.quality).toBe("LEAVE_CONFLICT");
    expect(record.issues.map((issue) => issue.type)).toContain(
      "LEAVE_CONFLICT",
    );
  });

  it("uses approved leave when no attendance session exists", () => {
    const record = buildAttendanceWorkerDay(
      source({ approvedLeaveType: "Annual leave" }),
      new Date("2026-08-04T08:00:00Z"),
    );
    expect(record.presenceStatus).toBe("APPROVED_LEAVE");
    expect(record.totalPayableMinutes).toBe(0);
  });

  it("uses exclusive assignment and employment end dates", () => {
    expect(
      isEffectiveOn(
        { starts_on: "2026-08-01", ends_on: "2026-08-04" },
        "2026-08-04",
      ),
    ).toBe(false);
  });
});

describe("attendance monitor live state and quality", () => {
  it("derives not entered, exited, on site, and on break independently", () => {
    const completed = session(
      "2026-08-04T08:00:00+08:00",
      "2026-08-04T17:00:00+08:00",
    );
    const open = session("2026-08-04T18:00:00+08:00", null);
    const breaking = session("2026-08-04T18:00:00+08:00", null, [
      {
        endedAt: null,
        id: crypto.randomUUID(),
        startedAt: "2026-08-04T18:30:00+08:00",
      },
    ]);
    expect(deriveLiveStatus([])).toBe("NOT_ENTERED");
    expect(deriveLiveStatus([completed])).toBe("EXITED");
    expect(deriveLiveStatus([completed, open])).toBe("ON_SITE");
    expect(deriveLiveStatus([completed, breaking])).toBe("ON_BREAK");
  });

  it("keeps a worker present while excluding an open session from payable time", () => {
    const record = buildAttendanceWorkerDay(
      source({
        sessions: [session("2026-08-04T08:00:00+08:00", null)],
      }),
      new Date("2026-08-04T08:00:00Z"),
    );
    expect(record.presenceStatus).toBe("PRESENT");
    expect(record.quality).toBe("INCOMPLETE");
    expect(record.totalPayableMinutes).toBe(0);
  });

  it("marks an open break incomplete without removing present status", () => {
    const record = buildAttendanceWorkerDay(
      source({
        sessions: [
          session("2026-08-04T08:00:00+08:00", null, [
            {
              endedAt: null,
              id: crypto.randomUUID(),
              startedAt: "2026-08-04T12:00:00+08:00",
            },
          ]),
        ],
      }),
    );
    expect(record.presenceStatus).toBe("PRESENT");
    expect(record.liveStatus).toBe("ON_BREAK");
    expect(record.quality).toBe("INCOMPLETE");
    expect(record.issues.map((issue) => issue.type)).toContain(
      "INCOMPLETE_SESSION",
    );
  });

  it("marks overlapping completed sessions invalid", () => {
    const record = buildAttendanceWorkerDay(
      source({
        sessions: [
          session("2026-08-04T08:00:00+08:00", "2026-08-04T12:00:00+08:00"),
          session("2026-08-04T11:00:00+08:00", "2026-08-04T14:00:00+08:00"),
        ],
      }),
    );
    expect(record.presenceStatus).toBe("PRESENT");
    expect(record.quality).toBe("INVALID");
  });

  it("preserves valid completed minutes when another session is open", () => {
    const record = buildAttendanceWorkerDay(
      source({
        sessions: [
          session("2026-08-04T08:00:00+08:00", "2026-08-04T12:00:00+08:00"),
          session("2026-08-04T13:00:00+08:00", null),
        ],
      }),
    );
    expect(record.quality).toBe("INCOMPLETE");
    expect(record.totalPayableMinutes).toBe(240);
  });
});

describe("attendance monitor aggregation", () => {
  it("reconciles expected outcomes and uses present divided by expected", () => {
    const now = new Date("2026-08-04T08:00:00Z");
    const records = [
      buildAttendanceWorkerDay(
        source({
          sessions: [
            session("2026-08-04T08:00:00+08:00", "2026-08-04T17:00:00+08:00"),
          ],
        }),
        now,
      ),
      buildAttendanceWorkerDay(
        source({ workerId: `${WORKER.slice(0, -1)}2` }),
        now,
      ),
      buildAttendanceWorkerDay(
        source({
          approvedLeaveType: "Annual leave",
          workerId: `${WORKER.slice(0, -1)}3`,
        }),
        now,
      ),
    ];
    const summary = summarizeAttendance(records, ["NORMAL"]);
    expect(summary.expected).toBe(3);
    expect(
      summary.present +
        summary.noEntryYet +
        summary.absent +
        summary.approvedLeave,
    ).toBe(summary.expected);
    expect(summary.attendancePercent).toBeCloseTo(100 / 3);
  });

  it("returns N/A attendance and separate off-day work for an all-off-day scope", () => {
    const record = buildAttendanceWorkerDay(
      source({
        dayType: "SUNDAY",
        sessions: [
          session("2026-08-02T08:00:00+08:00", "2026-08-02T12:00:00+08:00"),
        ],
        workDate: "2026-08-02",
      }),
    );
    const summary = summarizeAttendance([record], ["SUNDAY"]);
    expect(summary.attendancePercent).toBeNull();
    expect(summary.allProjectsOffDay).toBe(true);
    expect(summary.offDayWorking).toBe(1);
  });

  it("keeps normal attendance and off-day work separate in mixed scope", () => {
    const records = [
      buildAttendanceWorkerDay(
        source({
          sessions: [
            session("2026-08-04T08:00:00+08:00", "2026-08-04T17:00:00+08:00"),
          ],
        }),
      ),
      buildAttendanceWorkerDay(
        source({
          dayType: "PUBLIC_HOLIDAY",
          projectId: `${PROJECT.slice(0, -1)}2`,
          sessions: [
            session("2026-08-04T08:00:00+08:00", "2026-08-04T12:00:00+08:00"),
          ],
          workerId: `${WORKER.slice(0, -1)}2`,
        }),
      ),
    ];
    const summary = summarizeAttendance(records, ["NORMAL", "PUBLIC_HOLIDAY"]);
    expect(summary.expected).toBe(1);
    expect(summary.present).toBe(1);
    expect(summary.offDayWorking).toBe(1);
    expect(summary.attendancePercent).toBe(100);
  });

  it("counts an invalid worker-day once even when it has multiple issues", () => {
    const record = buildAttendanceWorkerDay(
      source({
        sessions: [
          session("2026-08-04T08:00:00+08:00", "2026-08-04T12:00:00+08:00"),
          session("2026-08-04T09:00:00+08:00", "2026-08-04T11:00:00+08:00"),
        ],
      }),
    );
    expect(record.issues.length).toBeGreaterThan(1);
    expect(summarizeAttendance([record]).recordsWithIssues).toBe(1);
  });

  it("rolls generated absent worker-days into monthly totals", () => {
    const absent = buildAttendanceWorkerDay(
      source({ workDate: "2026-08-03" }),
      new Date("2026-08-04T09:00:00Z"),
    );
    const rollups = rollupAttendanceMonth([absent]);
    expect(rollups).toHaveLength(1);
    expect(rollups[0]?.absentDays).toBe(1);
  });
});

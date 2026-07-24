import { describe, expect, it } from "vitest";

import { calculateAttendance, defaultDayType } from "@/lib/phase4/calculations";
import type { AttendanceSession } from "@/lib/phase4/types";

function session(
  id: string,
  enteredAt: string,
  exitedAt: string | null,
  breaks: AttendanceSession["breaks"] = [],
): AttendanceSession {
  return {
    breaks,
    enteredAt,
    exitedAt,
    id,
    workerId: "worker-1",
  };
}

describe("calculateAttendance", () => {
  it("excludes incomplete sessions from payable time", () => {
    const calculation = calculateAttendance(
      [session("one", "2026-07-20T08:00:00+08:00", null)],
      "NORMAL",
      "2026-07-20",
    );

    expect(calculation.status).toBe("INCOMPLETE");
    expect(calculation.totalPayableMinutes).toBe(0);
    expect(calculation.exceptions[0]?.type).toBe("INCOMPLETE_SESSION");
  });

  it("splits normal work at 5 PM and deducts a break in its category", () => {
    const calculation = calculateAttendance(
      [
        session(
          "one",
          "2026-07-20T16:30:00+08:00",
          "2026-07-20T18:15:00+08:00",
          [
            {
              endedAt: "2026-07-20T17:45:00+08:00",
              id: "break-one",
              startedAt: "2026-07-20T17:30:00+08:00",
            },
          ],
        ),
      ],
      "NORMAL",
      "2026-07-20",
    );

    expect(calculation.normalMinutes).toBe(30);
    expect(calculation.overtimeMinutes).toBe(60);
    expect(calculation.totalPayableMinutes).toBe(90);
  });

  it("splits a break crossing 5 PM across normal and overtime", () => {
    const calculation = calculateAttendance(
      [
        session(
          "one",
          "2026-07-20T16:30:00+08:00",
          "2026-07-20T18:00:00+08:00",
          [
            {
              endedAt: "2026-07-20T17:10:00+08:00",
              id: "break-one",
              startedAt: "2026-07-20T16:50:00+08:00",
            },
          ],
        ),
      ],
      "NORMAL",
      "2026-07-20",
    );

    expect(calculation.normalMinutes).toBe(20);
    expect(calculation.overtimeMinutes).toBe(50);
  });

  it("does not stack Sunday or public-holiday time with overtime", () => {
    const sessions = [
      session("one", "2026-07-19T16:30:00+08:00", "2026-07-19T18:30:00+08:00"),
    ];

    const sunday = calculateAttendance(sessions, "SUNDAY", "2026-07-19");
    const holiday = calculateAttendance(
      sessions,
      "PUBLIC_HOLIDAY",
      "2026-07-19",
    );

    expect(sunday.sundayMinutes).toBe(120);
    expect(sunday.overtimeMinutes).toBe(0);
    expect(holiday.publicHolidayMinutes).toBe(120);
    expect(holiday.overtimeMinutes).toBe(0);
  });

  it("adds multiple sessions without deducting the gap twice", () => {
    const calculation = calculateAttendance(
      [
        session(
          "one",
          "2026-07-20T08:00:00+08:00",
          "2026-07-20T12:00:00+08:00",
        ),
        session(
          "two",
          "2026-07-20T13:00:00+08:00",
          "2026-07-20T17:00:00+08:00",
        ),
      ],
      "NORMAL",
      "2026-07-20",
    );

    expect(calculation.normalMinutes).toBe(480);
    expect(calculation.totalPayableMinutes).toBe(480);
  });

  it("flags overlapping sessions and excludes both from payable time", () => {
    const calculation = calculateAttendance(
      [
        session(
          "one",
          "2026-07-20T08:00:00+08:00",
          "2026-07-20T12:00:00+08:00",
        ),
        session(
          "two",
          "2026-07-20T11:00:00+08:00",
          "2026-07-20T13:00:00+08:00",
        ),
      ],
      "NORMAL",
      "2026-07-20",
    );

    expect(calculation.status).toBe("INVALID");
    expect(calculation.totalPayableMinutes).toBe(0);
    expect(calculation.exceptions).toHaveLength(2);
  });
});

describe("defaultDayType", () => {
  it("defaults Sunday to Sunday and other dates to normal", () => {
    expect(defaultDayType("2026-07-19")).toBe("SUNDAY");
    expect(defaultDayType("2026-07-20")).toBe("NORMAL");
  });
});

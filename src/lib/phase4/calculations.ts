import type { AttendanceDayType, AttendanceSession } from "@/lib/phase4/types";

type Interval = { end: number; start: number };

export type AttendanceException = {
  message: string;
  sessionId: string;
  type: "INCOMPLETE_BREAK" | "INCOMPLETE_SESSION" | "INVALID" | "OVERLAP";
};

export type AttendanceCalculation = {
  exceptions: AttendanceException[];
  normalMinutes: number;
  overtimeMinutes: number;
  publicHolidayMinutes: number;
  status: "NO_ATTENDANCE" | "PRESENT" | "INCOMPLETE" | "INVALID";
  sundayMinutes: number;
  totalPayableMinutes: number;
};

function milliseconds(value: string) {
  return new Date(value).getTime();
}

function validInterval(start: number, end: number) {
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

function overlap(left: Interval, right: Interval) {
  return left.start < right.end && right.start < left.end;
}

function subtractIntervals(base: Interval, exclusions: Interval[]) {
  let remaining = [base];

  for (const exclusion of exclusions) {
    remaining = remaining.flatMap((interval) => {
      if (!overlap(interval, exclusion)) return [interval];
      const pieces: Interval[] = [];
      if (exclusion.start > interval.start) {
        pieces.push({ start: interval.start, end: exclusion.start });
      }
      if (exclusion.end < interval.end) {
        pieces.push({ start: exclusion.end, end: interval.end });
      }
      return pieces;
    });
  }

  return remaining;
}

function breakIntervals(
  session: AttendanceSession,
  sessionInterval: Interval,
  exceptions: AttendanceException[],
) {
  const completed: Interval[] = [];

  for (const attendanceBreak of session.breaks) {
    if (!attendanceBreak.endedAt) {
      exceptions.push({
        message: "A break is still open.",
        sessionId: session.id,
        type: "INCOMPLETE_BREAK",
      });
      continue;
    }

    const interval = {
      start: milliseconds(attendanceBreak.startedAt),
      end: milliseconds(attendanceBreak.endedAt),
    };
    if (
      !validInterval(interval.start, interval.end) ||
      interval.start <= sessionInterval.start ||
      interval.end > sessionInterval.end ||
      completed.some((other) => overlap(interval, other))
    ) {
      exceptions.push({
        message: "A break has invalid or overlapping times.",
        sessionId: session.id,
        type: "INVALID",
      });
      continue;
    }
    completed.push(interval);
  }

  return completed.sort((left, right) => left.start - right.start);
}

function durationMinutes(intervals: Interval[]) {
  const millisecondsTotal = intervals.reduce(
    (total, interval) => total + interval.end - interval.start,
    0,
  );
  return Math.floor(millisecondsTotal / 60_000);
}

function cutoffForDate(workDate: string) {
  return new Date(`${workDate}T17:00:00+08:00`).getTime();
}

export function defaultDayType(
  workDate: string,
): Extract<AttendanceDayType, "NORMAL" | "SUNDAY"> {
  return new Date(`${workDate}T12:00:00+08:00`).getUTCDay() === 0
    ? "SUNDAY"
    : "NORMAL";
}

export function calculateAttendance(
  sessions: AttendanceSession[],
  dayType: AttendanceDayType,
  workDate: string,
): AttendanceCalculation {
  const exceptions: AttendanceException[] = [];
  const complete = sessions
    .filter((session) => {
      if (!session.exitedAt) {
        exceptions.push({
          message: "The worker has entered but has no exit time.",
          sessionId: session.id,
          type: "INCOMPLETE_SESSION",
        });
        return false;
      }
      const interval = {
        start: milliseconds(session.enteredAt),
        end: milliseconds(session.exitedAt),
      };
      if (!validInterval(interval.start, interval.end)) {
        exceptions.push({
          message: "A work session has reversed or invalid times.",
          sessionId: session.id,
          type: "INVALID",
        });
        return false;
      }
      return true;
    })
    .map((session) => ({
      interval: {
        start: milliseconds(session.enteredAt),
        end: milliseconds(session.exitedAt as string),
      },
      session,
    }))
    .sort((left, right) => left.interval.start - right.interval.start);

  const overlappingIds = new Set<string>();
  for (let leftIndex = 0; leftIndex < complete.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < complete.length;
      rightIndex += 1
    ) {
      const left = complete[leftIndex];
      const right = complete[rightIndex];
      if (right.interval.start >= left.interval.end) break;
      if (overlap(left.interval, right.interval)) {
        overlappingIds.add(left.session.id);
        overlappingIds.add(right.session.id);
      }
    }
  }
  for (const sessionId of overlappingIds) {
    exceptions.push({
      message: "This work session overlaps another session.",
      sessionId,
      type: "OVERLAP",
    });
  }

  const payable = complete.flatMap(({ interval, session }) => {
    if (overlappingIds.has(session.id)) return [];
    return subtractIntervals(
      interval,
      breakIntervals(session, interval, exceptions),
    );
  });

  let normalMinutes = 0;
  let overtimeMinutes = 0;
  let sundayMinutes = 0;
  let publicHolidayMinutes = 0;

  if (dayType === "SUNDAY") {
    sundayMinutes = durationMinutes(payable);
  } else if (dayType === "PUBLIC_HOLIDAY") {
    publicHolidayMinutes = durationMinutes(payable);
  } else {
    const cutoff = cutoffForDate(workDate);
    normalMinutes = durationMinutes(
      payable
        .filter((interval) => interval.start < cutoff)
        .map((interval) => ({
          start: interval.start,
          end: Math.min(interval.end, cutoff),
        })),
    );
    overtimeMinutes = durationMinutes(
      payable
        .filter((interval) => interval.end > cutoff)
        .map((interval) => ({
          start: Math.max(interval.start, cutoff),
          end: interval.end,
        })),
    );
  }

  const totalPayableMinutes =
    normalMinutes + overtimeMinutes + sundayMinutes + publicHolidayMinutes;
  const hasInvalid = exceptions.some(
    (exception) => exception.type === "INVALID" || exception.type === "OVERLAP",
  );
  const hasIncomplete = exceptions.some(
    (exception) =>
      exception.type === "INCOMPLETE_SESSION" ||
      exception.type === "INCOMPLETE_BREAK",
  );

  return {
    exceptions,
    normalMinutes,
    overtimeMinutes,
    publicHolidayMinutes,
    status:
      sessions.length === 0
        ? "NO_ATTENDANCE"
        : hasInvalid
          ? "INVALID"
          : hasIncomplete
            ? "INCOMPLETE"
            : "PRESENT",
    sundayMinutes,
    totalPayableMinutes,
  };
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

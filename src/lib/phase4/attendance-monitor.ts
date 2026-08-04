import { calculateAttendance } from "@/lib/phase4/calculations";
import type {
  AttendanceMonitorSummary,
  AttendancePresenceStatus,
  AttendanceProjectSummary,
  AttendanceRecordIssue,
  AttendanceRecordQuality,
  AttendanceWorkerDayRecord,
  AttendanceWorkerDaySource,
  AttendanceWorkerMonthRollup,
} from "@/lib/phase4/attendance-monitor-types";
import type { AttendanceDayType, AttendanceSession } from "@/lib/phase4/types";

const MALAYSIA_TIME_ZONE = "Asia/Kuala_Lumpur";

export function malaysiaDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: MALAYSIA_TIME_ZONE,
    year: "numeric",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function malaysiaHour(now: Date) {
  const hour = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    hour12: false,
    timeZone: MALAYSIA_TIME_ZONE,
  }).format(now);
  return Number(hour);
}

export function isEffectiveOn(
  row: { ends_on: string | null; starts_on: string },
  date: string,
) {
  return row.starts_on <= date && (!row.ends_on || row.ends_on > date);
}

export function derivePresenceStatus({
  approvedLeaveType,
  dayType,
  now,
  sessionCount,
  workDate,
}: {
  approvedLeaveType: string | null;
  dayType: AttendanceDayType;
  now: Date;
  sessionCount: number;
  workDate: string;
}): AttendancePresenceStatus {
  if (sessionCount > 0) return "PRESENT";
  if (approvedLeaveType) return "APPROVED_LEAVE";
  const today = malaysiaDate(now);
  if (workDate > today) return "NOT_APPLICABLE";
  if (dayType === "SUNDAY" || dayType === "PUBLIC_HOLIDAY") {
    return "NOT_APPLICABLE";
  }
  if (workDate === today && malaysiaHour(now) < 17) return "NO_ENTRY_YET";
  return "ABSENT";
}

export function deriveLiveStatus(sessions: AttendanceSession[]) {
  const ordered = [...sessions].sort((left, right) =>
    left.enteredAt.localeCompare(right.enteredAt),
  );
  const openSession = ordered.findLast((session) => !session.exitedAt);
  if (!openSession)
    return ordered.length > 0 ? ("EXITED" as const) : ("NOT_ENTERED" as const);
  return openSession.breaks.some((attendanceBreak) => !attendanceBreak.endedAt)
    ? ("ON_BREAK" as const)
    : ("ON_SITE" as const);
}

function deriveIssues(
  sessions: AttendanceSession[],
  approvedLeaveType: string | null,
  dayType: AttendanceDayType,
  workDate: string,
) {
  const calculation = calculateAttendance(sessions, dayType, workDate);
  const issues: AttendanceRecordIssue[] = calculation.exceptions.map(
    (exception) => ({
      message: exception.message,
      sessionId: exception.sessionId,
      type:
        exception.type === "INVALID"
          ? ("INVALID_INTERVAL" as const)
          : exception.type,
    }),
  );
  if (approvedLeaveType && sessions.length > 0) {
    issues.push({
      message: `Attendance was recorded during approved ${approvedLeaveType.toLowerCase()}.`,
      sessionId: null,
      type: "LEAVE_CONFLICT",
    });
  }
  let quality: AttendanceRecordQuality = "VALID";
  if (
    issues.some(
      (issue) => issue.type === "INVALID_INTERVAL" || issue.type === "OVERLAP",
    )
  ) {
    quality = "INVALID";
  } else if (issues.some((issue) => issue.type === "LEAVE_CONFLICT")) {
    quality = "LEAVE_CONFLICT";
  } else if (issues.length > 0) {
    quality = "INCOMPLETE";
  }
  return { calculation, issues, quality };
}

export function buildAttendanceWorkerDay(
  source: AttendanceWorkerDaySource,
  now = new Date(),
): AttendanceWorkerDayRecord {
  const sessions = [...source.sessions].sort((left, right) =>
    left.enteredAt.localeCompare(right.enteredAt),
  );
  const { calculation, issues, quality } = deriveIssues(
    sessions,
    source.approvedLeaveType,
    source.dayType,
    source.workDate,
  );
  const presenceStatus = derivePresenceStatus({
    approvedLeaveType: source.approvedLeaveType,
    dayType: source.dayType,
    now,
    sessionCount: sessions.length,
    workDate: source.workDate,
  });
  return {
    ...source,
    firstEntryAt: sessions[0]?.enteredAt ?? null,
    issues,
    lastExitAt: sessions.at(-1)?.exitedAt ?? null,
    liveStatus: deriveLiveStatus(sessions),
    normalMinutes: calculation.normalMinutes,
    offDayWorked: presenceStatus === "PRESENT" && source.dayType !== "NORMAL",
    overtimeMinutes: calculation.overtimeMinutes,
    presenceStatus,
    publicHolidayMinutes: calculation.publicHolidayMinutes,
    quality,
    sessions,
    sundayMinutes: calculation.sundayMinutes,
    totalPayableMinutes: calculation.totalPayableMinutes,
  };
}

function emptySummary(): AttendanceMonitorSummary {
  return {
    absent: 0,
    activeSessions: 0,
    allProjectsOffDay: false,
    approvedLeave: 0,
    attendancePercent: null,
    exited: 0,
    expected: 0,
    incomplete: 0,
    invalid: 0,
    leaveConflicts: 0,
    noEntryYet: 0,
    notApplicable: 0,
    normalMinutes: 0,
    offDayWorking: 0,
    onBreak: 0,
    onSite: 0,
    overtimeMinutes: 0,
    present: 0,
    publicHolidayMinutes: 0,
    recordsWithIssues: 0,
    sundayMinutes: 0,
    totalPayableMinutes: 0,
  };
}

export function summarizeAttendance(
  records: AttendanceWorkerDayRecord[],
  dayTypes?: AttendanceDayType[],
): AttendanceMonitorSummary {
  const summary = emptySummary();
  for (const record of records) {
    const expectedNormal =
      record.isExpected &&
      record.dayType === "NORMAL" &&
      record.presenceStatus !== "NOT_APPLICABLE";
    if (expectedNormal) {
      summary.expected += 1;
      if (record.presenceStatus === "PRESENT") summary.present += 1;
      if (record.presenceStatus === "NO_ENTRY_YET") summary.noEntryYet += 1;
      if (record.presenceStatus === "ABSENT") summary.absent += 1;
      if (record.presenceStatus === "APPROVED_LEAVE") {
        summary.approvedLeave += 1;
      }
    }
    if (record.offDayWorked) summary.offDayWorking += 1;
    if (record.presenceStatus === "NOT_APPLICABLE") summary.notApplicable += 1;
    if (record.liveStatus === "ON_SITE") summary.onSite += 1;
    if (record.liveStatus === "ON_BREAK") summary.onBreak += 1;
    if (record.liveStatus === "EXITED") summary.exited += 1;
    if (record.quality !== "VALID") summary.recordsWithIssues += 1;
    if (record.quality === "INCOMPLETE") summary.incomplete += 1;
    if (record.quality === "INVALID") summary.invalid += 1;
    if (record.quality === "LEAVE_CONFLICT") summary.leaveConflicts += 1;
    summary.normalMinutes += record.normalMinutes;
    summary.overtimeMinutes += record.overtimeMinutes;
    summary.sundayMinutes += record.sundayMinutes;
    summary.publicHolidayMinutes += record.publicHolidayMinutes;
    summary.totalPayableMinutes += record.totalPayableMinutes;
  }
  summary.activeSessions = summary.onSite + summary.onBreak;
  summary.attendancePercent =
    summary.expected > 0 ? (summary.present / summary.expected) * 100 : null;
  const scopeDayTypes = dayTypes ?? records.map((record) => record.dayType);
  summary.allProjectsOffDay =
    scopeDayTypes.length > 0 &&
    scopeDayTypes.every((type) => type !== "NORMAL");
  return summary;
}

export function summarizeProjects(records: AttendanceWorkerDayRecord[]) {
  const grouped = new Map<string, AttendanceWorkerDayRecord[]>();
  for (const record of records) {
    grouped.set(record.projectId, [
      ...(grouped.get(record.projectId) ?? []),
      record,
    ]);
  }
  return [...grouped.entries()]
    .map(([projectId, projectRecords]): AttendanceProjectSummary => {
      const first = projectRecords[0]!;
      return {
        ...summarizeAttendance(projectRecords, [first.dayType]),
        dayType: first.dayType,
        projectId,
        projectName: first.projectName,
      };
    })
    .sort(
      (left, right) =>
        right.recordsWithIssues - left.recordsWithIssues ||
        (left.attendancePercent ?? 101) - (right.attendancePercent ?? 101) ||
        left.projectName.localeCompare(right.projectName),
    );
}

export function rollupAttendanceMonth(
  records: AttendanceWorkerDayRecord[],
): AttendanceWorkerMonthRollup[] {
  const rollups = new Map<string, AttendanceWorkerMonthRollup>();
  for (const record of records) {
    const key = `${record.projectId}:${record.workerId}`;
    const current = rollups.get(key) ?? {
      absentDays: 0,
      approvedLeaveDays: 0,
      noEntryYetDays: 0,
      offDayWorkedDays: 0,
      overtimeMinutes: 0,
      presentDays: 0,
      projectId: record.projectId,
      projectName: record.projectName,
      recordsWithIssues: 0,
      totalPayableMinutes: 0,
      workerId: record.workerId,
      workerName: record.workerName,
      workerPhotoId: record.workerPhotoId,
    };
    if (record.presenceStatus === "PRESENT") current.presentDays += 1;
    if (record.presenceStatus === "ABSENT") current.absentDays += 1;
    if (record.presenceStatus === "NO_ENTRY_YET") current.noEntryYetDays += 1;
    if (record.presenceStatus === "APPROVED_LEAVE") {
      current.approvedLeaveDays += 1;
    }
    if (record.offDayWorked) current.offDayWorkedDays += 1;
    if (record.quality !== "VALID") current.recordsWithIssues += 1;
    current.overtimeMinutes += record.overtimeMinutes;
    current.totalPayableMinutes += record.totalPayableMinutes;
    rollups.set(key, current);
  }
  return [...rollups.values()].sort(
    (left, right) =>
      left.workerName.localeCompare(right.workerName) ||
      left.projectName.localeCompare(right.projectName),
  );
}

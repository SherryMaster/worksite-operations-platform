import type { AttendanceDayType, AttendanceSession } from "@/lib/phase4/types";

export type AttendancePresenceStatus =
  "PRESENT" | "NO_ENTRY_YET" | "ABSENT" | "APPROVED_LEAVE" | "NOT_APPLICABLE";

export type AttendanceLiveStatus =
  "NOT_ENTERED" | "ON_SITE" | "ON_BREAK" | "EXITED";

export type AttendanceRecordIssueType =
  | "INCOMPLETE_SESSION"
  | "INCOMPLETE_BREAK"
  | "INVALID_INTERVAL"
  | "OVERLAP"
  | "LEAVE_CONFLICT";

export type AttendanceRecordQuality =
  "VALID" | "INCOMPLETE" | "INVALID" | "LEAVE_CONFLICT";

export type AttendanceRecordIssue = {
  message: string;
  sessionId: string | null;
  type: AttendanceRecordIssueType;
};

export type AttendanceWorkerDayRecord = {
  approvedLeaveType: string | null;
  dayType: AttendanceDayType;
  firstEntryAt: string | null;
  isExpected: boolean;
  issues: AttendanceRecordIssue[];
  lastExitAt: string | null;
  liveStatus: AttendanceLiveStatus;
  normalMinutes: number;
  offDayWorked: boolean;
  overtimeMinutes: number;
  presenceStatus: AttendancePresenceStatus;
  projectId: string;
  projectName: string;
  publicHolidayMinutes: number;
  quality: AttendanceRecordQuality;
  sessions: AttendanceSession[];
  skillName: string | null;
  sundayMinutes: number;
  totalPayableMinutes: number;
  tradeName: string | null;
  workDate: string;
  workerId: string;
  workerName: string;
  workerPhotoId: string | null;
};

export type AttendanceMonitorSummary = {
  absent: number;
  activeSessions: number;
  allProjectsOffDay: boolean;
  approvedLeave: number;
  attendancePercent: number | null;
  exited: number;
  expected: number;
  incomplete: number;
  invalid: number;
  leaveConflicts: number;
  noEntryYet: number;
  notApplicable: number;
  normalMinutes: number;
  offDayWorking: number;
  onBreak: number;
  onSite: number;
  overtimeMinutes: number;
  present: number;
  publicHolidayMinutes: number;
  recordsWithIssues: number;
  sundayMinutes: number;
  totalPayableMinutes: number;
};

export type AttendanceProjectSummary = AttendanceMonitorSummary & {
  dayType: AttendanceDayType;
  projectId: string;
  projectName: string;
};

export type AttendanceMonitorProject = {
  id: string;
  name: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
};

export type DailyAttendanceMonitor = {
  projects: AttendanceMonitorProject[];
  projectSummaries: AttendanceProjectSummary[];
  records: AttendanceWorkerDayRecord[];
  scopeLabel: string;
  summary: AttendanceMonitorSummary;
  workDate: string;
};

export type AttendanceWorkerMonthRollup = {
  absentDays: number;
  approvedLeaveDays: number;
  noEntryYetDays: number;
  offDayWorkedDays: number;
  overtimeMinutes: number;
  presentDays: number;
  projectId: string;
  projectName: string;
  recordsWithIssues: number;
  totalPayableMinutes: number;
  workerId: string;
  workerName: string;
  workerPhotoId: string | null;
};

export type MonthlyAttendanceMonitor = {
  month: string;
  projects: AttendanceMonitorProject[];
  records: AttendanceWorkerDayRecord[];
  rollups: AttendanceWorkerMonthRollup[];
  scopeLabel: string;
  summary: AttendanceMonitorSummary;
};

export type AttendanceWorkerDaySource = {
  approvedLeaveType: string | null;
  dayType: AttendanceDayType;
  isExpected: boolean;
  projectId: string;
  projectName: string;
  sessions: AttendanceSession[];
  skillName: string | null;
  tradeName: string | null;
  workDate: string;
  workerId: string;
  workerName: string;
  workerPhotoId: string | null;
};

export type AttendanceDayType = "NORMAL" | "SUNDAY" | "PUBLIC_HOLIDAY";

export type AttendanceBreak = {
  endedAt: string | null;
  id: string;
  startedAt: string;
};

export type AttendanceSession = {
  breaks: AttendanceBreak[];
  enteredAt: string;
  exitedAt: string | null;
  id: string;
  workerId: string;
};

export type AttendanceWorker = {
  approvedLeaveType?: string | null;
  id: string;
  legalName: string;
  skillName: string | null;
  tradeName: string | null;
};

export type AttendanceSnapshot = {
  dayType: AttendanceDayType;
  projectId: string;
  projectName: string;
  sessions: AttendanceSession[];
  updatedAt: string;
  workDate: string;
  workers: AttendanceWorker[];
};

export type AttendanceActionType =
  | "SET_DAY_TYPE"
  | "ENTER"
  | "EXIT"
  | "START_BREAK"
  | "END_BREAK"
  | "CORRECT_DAY";

export type AttendanceActionState =
  "PENDING" | "SYNCING" | "SYNCED" | "NEEDS_ATTENTION";

export type AttendanceQueueAction = {
  actionType: AttendanceActionType;
  clientActionId: string;
  createdAt: string;
  message: string | null;
  payload: Record<string, unknown>;
  projectId: string;
  state: AttendanceActionState;
};

export type AttendanceSyncResult = {
  message: string;
  status: "SYNCED" | "FAILED" | "CONFLICT";
};

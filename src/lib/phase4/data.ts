import "server-only";

import { calculateAttendance, defaultDayType } from "@/lib/phase4/calculations";
import type {
  AttendanceBreak,
  AttendanceSession,
  AttendanceSnapshot,
  AttendanceWorker,
} from "@/lib/phase4/types";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SessionRow = Tables<"attendance_sessions">;
type BreakRow = Tables<"break_intervals">;

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  logger.error("phase_4_query_failed", { code: error?.code, operation });
  throw new Error("Attendance information could not be loaded.");
}

function effective(
  row: { ends_on: string | null; starts_on: string },
  date: string,
) {
  return row.starts_on <= date && (!row.ends_on || row.ends_on > date);
}

function mapSessions(
  sessionRows: SessionRow[],
  breakRows: BreakRow[],
): AttendanceSession[] {
  const breaksBySession = new Map<string, AttendanceBreak[]>();
  for (const row of breakRows) {
    const attendanceBreak: AttendanceBreak = {
      endedAt: row.ended_at,
      id: row.id,
      startedAt: row.started_at,
    };
    breaksBySession.set(row.attendance_session_id, [
      ...(breaksBySession.get(row.attendance_session_id) ?? []),
      attendanceBreak,
    ]);
  }

  return sessionRows.map((row) => ({
    breaks: breaksBySession.get(row.id) ?? [],
    enteredAt: row.entered_at,
    exitedAt: row.exited_at,
    id: row.id,
    workerId: row.worker_id,
  }));
}

async function loadBreaks(sessionIds: string[]) {
  if (sessionIds.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("break_intervals")
    .select("*")
    .in("attendance_session_id", sessionIds)
    .eq("record_status", "ACTIVE")
    .order("started_at");
  if (result.error) throwQueryError("load_attendance_breaks", result.error);
  return result.data;
}

export async function listAttendanceProjects() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("projects")
    .select("id,name,status")
    .in("status", ["PLANNED", "ACTIVE"])
    .order("name");
  if (result.error) throwQueryError("list_attendance_projects", result.error);
  return result.data;
}

export async function getAttendanceSnapshot(
  projectId: string,
  workDate: string,
): Promise<AttendanceSnapshot | null> {
  const supabase = await createServerSupabaseClient();
  const [
    projectResult,
    assignmentResult,
    employmentResult,
    classificationResult,
    sessionResult,
    projectDayResult,
    tradeResult,
    skillResult,
    leaveDaysResult,
    leaveTypesResult,
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("worker_project_assignments")
      .select("worker_id,starts_on,ends_on")
      .eq("project_id", projectId),
    supabase
      .from("worker_employment_periods")
      .select("worker_id,status,starts_on,ends_on"),
    supabase
      .from("worker_classification_periods")
      .select("worker_id,trade_id,skill_level_id,starts_on,ends_on"),
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("project_id", projectId)
      .eq("work_date", workDate)
      .eq("record_status", "ACTIVE")
      .order("entered_at"),
    supabase
      .from("project_days")
      .select("day_type")
      .eq("project_id", projectId)
      .eq("work_date", workDate)
      .maybeSingle(),
    supabase.from("trades").select("id,name"),
    supabase.from("skill_levels").select("id,name"),
    supabase
      .from("approved_leave_days")
      .select("worker_id,leave_type_id")
      .eq("project_id", projectId)
      .eq("leave_date", workDate),
    supabase.from("leave_types").select("id,name"),
  ]);

  for (const [operation, result] of [
    ["attendance_project", projectResult],
    ["attendance_assignments", assignmentResult],
    ["attendance_employment", employmentResult],
    ["attendance_classification", classificationResult],
    ["attendance_sessions", sessionResult],
    ["attendance_project_day", projectDayResult],
    ["attendance_trades", tradeResult],
    ["attendance_skills", skillResult],
    ["attendance_leave_days", leaveDaysResult],
    ["attendance_leave_types", leaveTypesResult],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }
  if (!projectResult.data) return null;

  const assignmentRows = assignmentResult.data ?? [];
  const employmentRows = employmentResult.data ?? [];
  const classificationRows = classificationResult.data ?? [];
  const sessionRows = sessionResult.data ?? [];
  const tradeRows = tradeResult.data ?? [];
  const skillRows = skillResult.data ?? [];
  const assignedWorkerIds = new Set(
    assignmentRows
      .filter((row) => effective(row, workDate))
      .map((row) => row.worker_id),
  );
  const activeWorkerIds = new Set(
    employmentRows
      .filter((row) => row.status === "ACTIVE" && effective(row, workDate))
      .map((row) => row.worker_id),
  );
  const workerIds = [...assignedWorkerIds].filter((id) =>
    activeWorkerIds.has(id),
  );

  const workerResult =
    workerIds.length === 0
      ? { data: [], error: null }
      : await supabase
          .from("workers")
          .select("id,legal_name")
          .in("id", workerIds)
          .order("legal_name");
  if (workerResult.error) {
    throwQueryError("attendance_workers", workerResult.error);
  }

  const photoRows =
    workerIds.length === 0
      ? []
      : await (async () => {
          const result = await supabase
            .from("worker_documents")
            .select("id,worker_id")
            .in("worker_id", workerIds)
            .eq("file_kind", "PHOTO")
            .eq("status", "ACTIVE")
            .order("created_at", { ascending: false });
          if (result.error) {
            throwQueryError("attendance_worker_photos", result.error);
          }
          return result.data;
        })();
  const photoIds = new Map<string, string>();
  for (const photo of photoRows) {
    if (!photoIds.has(photo.worker_id)) {
      photoIds.set(photo.worker_id, photo.id);
    }
  }

  const tradeNames = new Map(tradeRows.map((trade) => [trade.id, trade.name]));
  const skillNames = new Map(skillRows.map((skill) => [skill.id, skill.name]));
  const leaveTypeNames = new Map(
    (leaveTypesResult.data ?? []).map((leaveType) => [
      leaveType.id,
      leaveType.name,
    ]),
  );
  const leaveByWorker = new Map(
    (leaveDaysResult.data ?? []).map((leaveDay) => [
      leaveDay.worker_id,
      leaveDay.leave_type_id
        ? (leaveTypeNames.get(leaveDay.leave_type_id) ?? "Approved leave")
        : "Approved leave",
    ]),
  );
  const classifications = new Map(
    classificationRows
      .filter((row) => effective(row, workDate))
      .map((row) => [row.worker_id, row]),
  );
  const workers: AttendanceWorker[] = workerResult.data.map((worker) => {
    const classification = classifications.get(worker.id);
    return {
      approvedLeaveType: leaveByWorker.get(worker.id) ?? null,
      id: worker.id,
      legalName: worker.legal_name,
      photoId: photoIds.get(worker.id) ?? null,
      skillName: classification
        ? (skillNames.get(classification.skill_level_id) ?? null)
        : null,
      tradeName: classification
        ? (tradeNames.get(classification.trade_id) ?? null)
        : null,
    };
  });
  const breakRows = await loadBreaks(sessionRows.map((session) => session.id));

  return {
    dayType: projectDayResult.data?.day_type ?? defaultDayType(workDate),
    projectId: projectResult.data.id,
    projectName: projectResult.data.name,
    sessions: mapSessions(sessionRows, breakRows),
    updatedAt: new Date().toISOString(),
    workDate,
    workers,
  };
}

export async function getForemanAttendanceSnapshot(workDate: string) {
  const projects = await listAttendanceProjects();
  const project = projects[0];
  return project ? getAttendanceSnapshot(project.id, workDate) : null;
}

export type AttendanceMonthRow = {
  date: string;
  exceptionCount: number;
  normalMinutes: number;
  overtimeMinutes: number;
  publicHolidayMinutes: number;
  leaveTypeName: string | null;
  status: ReturnType<typeof calculateAttendance>["status"] | "LEAVE";
  sundayMinutes: number;
  totalMinutes: number;
  workerId: string;
  workerName: string;
  workerPhotoId: string | null;
};

export async function getAttendanceMonthRows(
  projectId: string,
  month: string,
): Promise<AttendanceMonthRow[]> {
  const startDate = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);
  const supabase = await createServerSupabaseClient();
  const [
    sessionsResult,
    daysResult,
    workersResult,
    photosResult,
    leaveDaysResult,
    leaveTypesResult,
  ] = await Promise.all([
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("project_id", projectId)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .eq("record_status", "ACTIVE")
      .order("work_date")
      .order("entered_at"),
    supabase
      .from("project_days")
      .select("work_date,day_type")
      .eq("project_id", projectId)
      .gte("work_date", startDate)
      .lte("work_date", endDate),
    supabase.from("workers").select("id,legal_name").order("legal_name"),
    supabase
      .from("worker_documents")
      .select("id,worker_id")
      .eq("file_kind", "PHOTO")
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false }),
    supabase
      .from("approved_leave_days")
      .select("worker_id,leave_type_id,leave_date")
      .eq("project_id", projectId)
      .gte("leave_date", startDate)
      .lte("leave_date", endDate),
    supabase.from("leave_types").select("id,name"),
  ]);
  if (sessionsResult.error) {
    throwQueryError("attendance_month_sessions", sessionsResult.error);
  }
  if (daysResult.error) {
    throwQueryError("attendance_month_days", daysResult.error);
  }
  if (workersResult.error) {
    throwQueryError("attendance_month_workers", workersResult.error);
  }
  if (photosResult.error) {
    throwQueryError("attendance_month_worker_photos", photosResult.error);
  }
  if (leaveDaysResult.error) {
    throwQueryError("attendance_month_leave", leaveDaysResult.error);
  }
  if (leaveTypesResult.error) {
    throwQueryError("attendance_month_leave_types", leaveTypesResult.error);
  }

  const breakRows = await loadBreaks(
    sessionsResult.data.map((session) => session.id),
  );
  const sessions = mapSessions(sessionsResult.data, breakRows);
  const days = new Map(
    daysResult.data.map((day) => [day.work_date, day.day_type]),
  );
  const workerNames = new Map(
    workersResult.data.map((worker) => [worker.id, worker.legal_name]),
  );
  const workerPhotoIds = new Map<string, string>();
  for (const photo of photosResult.data ?? []) {
    if (!workerPhotoIds.has(photo.worker_id)) {
      workerPhotoIds.set(photo.worker_id, photo.id);
    }
  }
  const leaveTypeNames = new Map(
    leaveTypesResult.data.map((leaveType) => [leaveType.id, leaveType.name]),
  );
  const leaveByKey = new Map(
    leaveDaysResult.data.map((leaveDay) => [
      `${leaveDay.leave_date}:${leaveDay.worker_id}`,
      leaveDay.leave_type_id
        ? (leaveTypeNames.get(leaveDay.leave_type_id) ?? "Approved leave")
        : "Approved leave",
    ]),
  );
  const dayWorkerKeys = new Set([
    ...sessions.map((session) => {
      const row = sessionsResult.data.find((item) => item.id === session.id);
      return `${row?.work_date}:${session.workerId}`;
    }),
    ...leaveByKey.keys(),
  ]);

  return [...dayWorkerKeys]
    .map((key) => {
      const [date, workerId] = key.split(":");
      const daySessions = sessions.filter((session) => {
        const row = sessionsResult.data.find((item) => item.id === session.id);
        return row?.work_date === date && session.workerId === workerId;
      });
      const calculation = calculateAttendance(
        daySessions,
        days.get(date) ?? defaultDayType(date),
        date,
      );
      const leaveTypeName = leaveByKey.get(key) ?? null;
      return {
        date,
        exceptionCount: leaveTypeName ? 0 : calculation.exceptions.length,
        leaveTypeName,
        normalMinutes: leaveTypeName ? 0 : calculation.normalMinutes,
        overtimeMinutes: leaveTypeName ? 0 : calculation.overtimeMinutes,
        publicHolidayMinutes: leaveTypeName
          ? 0
          : calculation.publicHolidayMinutes,
        status: leaveTypeName ? ("LEAVE" as const) : calculation.status,
        sundayMinutes: leaveTypeName ? 0 : calculation.sundayMinutes,
        totalMinutes: leaveTypeName ? 0 : calculation.totalPayableMinutes,
        workerId,
        workerName: workerNames.get(workerId) ?? "Worker record",
        workerPhotoId: workerPhotoIds.get(workerId) ?? null,
      };
    })
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.workerName.localeCompare(right.workerName),
    );
}

export async function getWorkerAttendanceMonth(
  workerId: string,
  month: string,
) {
  const supabase = await createServerSupabaseClient();
  const startDate = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const endDate = new Date(Date.UTC(year, monthNumber, 0))
    .toISOString()
    .slice(0, 10);
  const assignments = await supabase
    .from("worker_project_assignments")
    .select("project_id")
    .eq("worker_id", workerId);
  if (assignments.error) {
    throwQueryError("worker_attendance_projects", assignments.error);
  }

  const projectIds = [
    ...new Set((assignments.data ?? []).map((row) => row.project_id)),
  ];
  if (projectIds.length === 0) {
    return {
      rows: [],
      totals: {
        exceptions: 0,
        leaveDays: 0,
        normalMinutes: 0,
        overtimeMinutes: 0,
        payableDays: 0,
        payableMinutes: 0,
        publicHolidayMinutes: 0,
        sundayMinutes: 0,
      },
    };
  }
  const [
    projectsResult,
    sessionsResult,
    daysResult,
    leaveResult,
    leaveTypesResult,
  ] = await Promise.all([
    supabase.from("projects").select("id,name").in("id", projectIds),
    supabase
      .from("attendance_sessions")
      .select("*")
      .eq("worker_id", workerId)
      .in("project_id", projectIds)
      .gte("work_date", startDate)
      .lte("work_date", endDate)
      .eq("record_status", "ACTIVE")
      .order("work_date", { ascending: false })
      .order("entered_at"),
    supabase
      .from("project_days")
      .select("project_id,work_date,day_type")
      .in("project_id", projectIds)
      .gte("work_date", startDate)
      .lte("work_date", endDate),
    supabase
      .from("approved_leave_days")
      .select("project_id,leave_date,leave_type_id")
      .eq("worker_id", workerId)
      .in("project_id", projectIds)
      .gte("leave_date", startDate)
      .lte("leave_date", endDate),
    supabase.from("leave_types").select("id,name"),
  ]);
  for (const [operation, result] of [
    ["worker_attendance_projects", projectsResult],
    ["worker_attendance_sessions", sessionsResult],
    ["worker_attendance_days", daysResult],
    ["worker_attendance_leave", leaveResult],
    ["worker_attendance_leave_types", leaveTypesResult],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }
  const projects = projectsResult.data ?? [];
  const sessionRows = sessionsResult.data ?? [];
  const days = daysResult.data ?? [];
  const leaveRows = leaveResult.data ?? [];
  const leaveTypes = leaveTypesResult.data ?? [];
  const breakRows = await loadBreaks(sessionRows.map((session) => session.id));
  const sessions = mapSessions(sessionRows, breakRows);
  const projectNames = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  const dayTypes = new Map(
    days.map((day) => [`${day.project_id}:${day.work_date}`, day.day_type]),
  );
  const leaveTypeNames = new Map(
    leaveTypes.map((type) => [type.id, type.name]),
  );
  const keys = new Set([
    ...sessionRows.map(
      (session) => `${session.project_id}:${session.work_date}`,
    ),
    ...leaveRows.map((leave) => `${leave.project_id}:${leave.leave_date}`),
  ]);
  const rows = [...keys]
    .map((key) => {
      const separator = key.indexOf(":");
      const projectId = key.slice(0, separator);
      const date = key.slice(separator + 1);
      const sessionIds = new Set(
        sessionRows
          .filter(
            (item) => item.project_id === projectId && item.work_date === date,
          )
          .map((item) => item.id),
      );
      const calculation = calculateAttendance(
        sessions.filter((session) => sessionIds.has(session.id)),
        dayTypes.get(key) ?? defaultDayType(date),
        date,
      );
      const leave = leaveRows.find(
        (item) => item.project_id === projectId && item.leave_date === date,
      );
      const leaveTypeName = leave
        ? leave.leave_type_id
          ? (leaveTypeNames.get(leave.leave_type_id) ?? "Approved leave")
          : "Approved leave"
        : null;
      return {
        date,
        exceptionCount: leaveTypeName ? 0 : calculation.exceptions.length,
        leaveTypeName,
        normalMinutes: leaveTypeName ? 0 : calculation.normalMinutes,
        overtimeMinutes: leaveTypeName ? 0 : calculation.overtimeMinutes,
        projectId,
        projectName: projectNames.get(projectId) ?? "Project",
        publicHolidayMinutes: leaveTypeName
          ? 0
          : calculation.publicHolidayMinutes,
        status: leaveTypeName ? ("LEAVE" as const) : calculation.status,
        sundayMinutes: leaveTypeName ? 0 : calculation.sundayMinutes,
        totalMinutes: leaveTypeName ? 0 : calculation.totalPayableMinutes,
        workerId,
      };
    })
    .sort((left, right) => right.date.localeCompare(left.date));

  return {
    rows: rows.slice(0, 62),
    totals: rows.reduce(
      (total, row) => ({
        exceptions: total.exceptions + row.exceptionCount,
        leaveDays: total.leaveDays + Number(Boolean(row.leaveTypeName)),
        normalMinutes: total.normalMinutes + row.normalMinutes,
        overtimeMinutes: total.overtimeMinutes + row.overtimeMinutes,
        payableDays: total.payableDays + Number(row.totalMinutes > 0),
        payableMinutes: total.payableMinutes + row.totalMinutes,
        publicHolidayMinutes:
          total.publicHolidayMinutes + row.publicHolidayMinutes,
        sundayMinutes: total.sundayMinutes + row.sundayMinutes,
      }),
      {
        exceptions: 0,
        leaveDays: 0,
        normalMinutes: 0,
        overtimeMinutes: 0,
        payableDays: 0,
        payableMinutes: 0,
        publicHolidayMinutes: 0,
        sundayMinutes: 0,
      },
    ),
  };
}

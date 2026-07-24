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

  const tradeNames = new Map(tradeRows.map((trade) => [trade.id, trade.name]));
  const skillNames = new Map(skillRows.map((skill) => [skill.id, skill.name]));
  const classifications = new Map(
    classificationRows
      .filter((row) => effective(row, workDate))
      .map((row) => [row.worker_id, row]),
  );
  const workers: AttendanceWorker[] = workerResult.data.map((worker) => {
    const classification = classifications.get(worker.id);
    return {
      id: worker.id,
      legalName: worker.legal_name,
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

export async function getAttendanceSyncExceptions(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("attendance_sync_actions")
    .select("client_action_id,action_type,status,result_data,processed_at")
    .eq("project_id", projectId)
    .in("status", ["FAILED", "CONFLICT"])
    .order("processed_at", { ascending: false })
    .limit(50);
  if (result.error) {
    throwQueryError("attendance_sync_exceptions", result.error);
  }
  return result.data.map((row) => {
    const resultData =
      row.result_data &&
      typeof row.result_data === "object" &&
      !Array.isArray(row.result_data)
        ? row.result_data
        : {};
    return {
      ...row,
      message:
        typeof resultData.message === "string"
          ? resultData.message
          : "The synchronized action needs review.",
    };
  });
}

export type AttendanceMonthRow = {
  date: string;
  exceptionCount: number;
  normalMinutes: number;
  overtimeMinutes: number;
  publicHolidayMinutes: number;
  status: ReturnType<typeof calculateAttendance>["status"];
  sundayMinutes: number;
  totalMinutes: number;
  workerId: string;
  workerName: string;
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
  const [sessionsResult, daysResult, workersResult] = await Promise.all([
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
  const dayWorkerKeys = new Set(
    sessions.map((session) => {
      const row = sessionsResult.data.find((item) => item.id === session.id);
      return `${row?.work_date}:${session.workerId}`;
    }),
  );

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
      return {
        date,
        exceptionCount: calculation.exceptions.length,
        normalMinutes: calculation.normalMinutes,
        overtimeMinutes: calculation.overtimeMinutes,
        publicHolidayMinutes: calculation.publicHolidayMinutes,
        status: calculation.status,
        sundayMinutes: calculation.sundayMinutes,
        totalMinutes: calculation.totalPayableMinutes,
        workerId,
        workerName: workerNames.get(workerId) ?? "Worker record",
      };
    })
    .sort(
      (left, right) =>
        right.date.localeCompare(left.date) ||
        left.workerName.localeCompare(right.workerName),
    );
}

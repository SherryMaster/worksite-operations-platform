import "server-only";

import { cache } from "react";

import {
  buildAttendanceWorkerDay,
  isEffectiveOn,
  malaysiaDate,
  rollupAttendanceMonth,
  summarizeAttendance,
} from "@/lib/phase4/attendance-monitor";
import type {
  AttendanceMonitorProject,
  AttendanceProjectSummary,
  AttendanceWorkerDayRecord,
  DailyAttendanceMonitor,
  MonthlyAttendanceMonitor,
} from "@/lib/phase4/attendance-monitor-types";
import { defaultDayType } from "@/lib/phase4/calculations";
import type { AttendanceBreak, AttendanceSession } from "@/lib/phase4/types";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type MonitorRole = "CEO" | "FOREMAN";
type BreakRow = Tables<"break_intervals">;
type SessionRow = Tables<"attendance_sessions"> & {
  break_intervals: BreakRow[];
};
type AssignmentRow = Pick<
  Tables<"worker_project_assignments">,
  "worker_id" | "project_id" | "starts_on" | "ends_on"
>;
type ProjectDayRow = Pick<
  Tables<"project_days">,
  "project_id" | "work_date" | "day_type"
>;
type LeaveDayRow = Pick<
  Tables<"approved_leave_days">,
  "worker_id" | "project_id" | "leave_date" | "leave_type_id"
>;
type EmploymentRow = Pick<
  Tables<"worker_employment_periods">,
  "worker_id" | "status" | "starts_on" | "ends_on"
>;
type ClassificationRow = Pick<
  Tables<"worker_classification_periods">,
  "worker_id" | "trade_id" | "skill_level_id" | "starts_on" | "ends_on"
>;

const QUERY_PAGE_SIZE = 1_000;

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  throwDependencyError(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "read",
    routeFamily: "/ceo|foreman/attendance",
    surface: "server_component",
  });
}

async function loadAllRows<Row>(
  operation: string,
  loadPage: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: Row[] | null;
    error: { code?: string; message: string } | null;
  }>,
) {
  const rows: Row[] = [];
  for (let from = 0; ; from += QUERY_PAGE_SIZE) {
    const result = await loadPage(from, from + QUERY_PAGE_SIZE - 1);
    if (result.error) throwQueryError(operation, result.error);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < QUERY_PAGE_SIZE) return rows;
  }
}

export const listAttendanceMonitorProjects = cache(
  async (): Promise<AttendanceMonitorProject[]> => {
    const supabase = await createServerSupabaseClient();
    const result = await supabase
      .from("projects")
      .select("id,name,status")
      .order("name");
    if (result.error)
      throwQueryError("attendance_monitor_projects", result.error);
    return result.data;
  },
);

function selectProjects(
  projects: AttendanceMonitorProject[],
  role: MonitorRole,
  projectId?: string,
  defaultScope: "ACTIVE" | "AUTHORIZED" = "ACTIVE",
) {
  if (role === "FOREMAN") {
    const assigned = projects.find((project) =>
      ["ACTIVE", "PLANNED"].includes(project.status),
    );
    return assigned ? [assigned] : projects.slice(0, 1);
  }
  if (projectId) {
    const selected = projects.find((project) => project.id === projectId);
    if (
      selected &&
      (defaultScope === "AUTHORIZED" || selected.status === "ACTIVE")
    ) {
      return [selected];
    }
  }
  return defaultScope === "AUTHORIZED"
    ? projects
    : projects.filter((project) => project.status === "ACTIVE");
}

function mapSessions(sessionRows: SessionRow[]) {
  return new Map(
    sessionRows.map((row) => [
      row.id,
      {
        breaks: row.break_intervals
          .map((attendanceBreak): AttendanceBreak => ({
            endedAt: attendanceBreak.ended_at,
            id: attendanceBreak.id,
            startedAt: attendanceBreak.started_at,
          }))
          .sort((left, right) => left.startedAt.localeCompare(right.startedAt)),
        enteredAt: row.entered_at,
        exitedAt: row.exited_at,
        id: row.id,
        workerId: row.worker_id,
      } satisfies AttendanceSession,
    ]),
  );
}

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function datesBetween(startDate: string, endDate: string) {
  if (startDate > endDate) return [];
  const dates: string[] = [];
  let date = new Date(`${startDate}T12:00:00+08:00`);
  const end = new Date(`${endDate}T12:00:00+08:00`);
  while (date <= end) {
    dates.push(malaysiaDate(date));
    date = new Date(date.getTime() + 86_400_000);
  }
  return dates;
}

async function loadWorkerDays({
  dates,
  endDate,
  includeOffDayEmpty,
  now,
  projects,
  startDate,
}: {
  dates: string[];
  endDate: string;
  includeOffDayEmpty: boolean;
  now: Date;
  projects: AttendanceMonitorProject[];
  startDate: string;
}) {
  if (projects.length === 0 || dates.length === 0) {
    return {
      dayTypes: new Map<string, Tables<"project_days">["day_type"]>(),
      records: [],
    };
  }
  const projectIds = projects.map((project) => project.id);
  const supabase = await createServerSupabaseClient();
  const [assignments, sessionRows, projectDays, rawLeaveDays] =
    await Promise.all([
      loadAllRows<AssignmentRow>("attendance_monitor_assignments", (from, to) =>
        supabase
          .from("worker_project_assignments")
          .select("worker_id,project_id,starts_on,ends_on")
          .in("project_id", projectIds)
          .lte("starts_on", endDate)
          .or(`ends_on.is.null,ends_on.gt.${startDate}`)
          .order("id")
          .range(from, to),
      ),
      loadAllRows<SessionRow>("attendance_monitor_sessions", (from, to) =>
        supabase
          .from("attendance_sessions")
          .select("*,break_intervals(*)")
          .in("project_id", projectIds)
          .gte("work_date", startDate)
          .lte("work_date", endDate)
          .eq("record_status", "ACTIVE")
          .eq("break_intervals.record_status", "ACTIVE")
          .order("id")
          .range(from, to),
      ),
      loadAllRows<ProjectDayRow>(
        "attendance_monitor_project_days",
        (from, to) =>
          supabase
            .from("project_days")
            .select("project_id,work_date,day_type")
            .in("project_id", projectIds)
            .gte("work_date", startDate)
            .lte("work_date", endDate)
            .order("id")
            .range(from, to),
      ),
      loadAllRows<LeaveDayRow>("attendance_monitor_leave_days", (from, to) =>
        supabase
          .from("approved_leave_days")
          .select("worker_id,project_id,leave_date,leave_type_id")
          .in("project_id", projectIds)
          .gte("leave_date", startDate)
          .lte("leave_date", endDate)
          .order("id")
          .range(from, to),
      ),
    ]);

  const leaveDays = rawLeaveDays.filter(
    (
      row,
    ): row is typeof row & {
      leave_date: string;
      project_id: string;
      worker_id: string;
    } => Boolean(row.leave_date && row.project_id && row.worker_id),
  );
  const workerIds = [
    ...new Set([
      ...assignments.map((row) => row.worker_id),
      ...sessionRows.map((row) => row.worker_id),
      ...leaveDays.map((row) => row.worker_id),
    ]),
  ];
  const [
    employmentRows,
    classificationRows,
    workersResult,
    photosResult,
    tradesResult,
    skillsResult,
    leaveTypesResult,
  ] = await Promise.all([
    workerIds.length === 0
      ? Promise.resolve([] as EmploymentRow[])
      : loadAllRows<EmploymentRow>(
          "attendance_monitor_employment",
          (from, to) =>
            supabase
              .from("worker_employment_periods")
              .select("worker_id,status,starts_on,ends_on")
              .in("worker_id", workerIds)
              .lte("starts_on", endDate)
              .or(`ends_on.is.null,ends_on.gt.${startDate}`)
              .order("id")
              .range(from, to),
        ),
    workerIds.length === 0
      ? Promise.resolve([] as ClassificationRow[])
      : loadAllRows<ClassificationRow>(
          "attendance_monitor_classifications",
          (from, to) =>
            supabase
              .from("worker_classification_periods")
              .select("worker_id,trade_id,skill_level_id,starts_on,ends_on")
              .in("worker_id", workerIds)
              .lte("starts_on", endDate)
              .or(`ends_on.is.null,ends_on.gt.${startDate}`)
              .order("id")
              .range(from, to),
        ),
    workerIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("workers").select("id,legal_name").in("id", workerIds),
    workerIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("worker_documents")
          .select("id,worker_id")
          .in("worker_id", workerIds)
          .eq("file_kind", "PHOTO")
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false }),
    supabase.from("trades").select("id,name"),
    supabase.from("skill_levels").select("id,name"),
    supabase.from("leave_types").select("id,name"),
  ]);
  for (const [operation, result] of [
    ["attendance_monitor_workers", workersResult],
    ["attendance_monitor_photos", photosResult],
    ["attendance_monitor_trades", tradesResult],
    ["attendance_monitor_skills", skillsResult],
    ["attendance_monitor_leave_types", leaveTypesResult],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  const projectNames = new Map(projects.map((row) => [row.id, row.name]));
  const workerNames = new Map(
    (workersResult.data ?? []).map((row) => [row.id, row.legal_name]),
  );
  const photoIds = new Map<string, string>();
  for (const photo of photosResult.data ?? []) {
    if (!photoIds.has(photo.worker_id)) photoIds.set(photo.worker_id, photo.id);
  }
  const tradeNames = new Map(
    (tradesResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const skillNames = new Map(
    (skillsResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const leaveTypeNames = new Map(
    (leaveTypesResult.data ?? []).map((row) => [row.id, row.name]),
  );
  const dayTypes = new Map(
    projectDays.map((row) => [
      `${row.project_id}:${row.work_date}`,
      row.day_type,
    ]),
  );
  const sessionsById = mapSessions(sessionRows);
  const sessionsByKey = new Map<string, AttendanceSession[]>();
  for (const row of sessionRows) {
    const key = `${row.project_id}:${row.work_date}:${row.worker_id}`;
    const session = sessionsById.get(row.id);
    if (session)
      sessionsByKey.set(key, [...(sessionsByKey.get(key) ?? []), session]);
  }
  const leaveByKey = new Map(
    leaveDays.map((row) => [
      `${row.project_id}:${row.leave_date}:${row.worker_id}`,
      row.leave_type_id
        ? (leaveTypeNames.get(row.leave_type_id) ?? "Approved leave")
        : "Approved leave",
    ]),
  );

  const records: AttendanceWorkerDayRecord[] = [];
  for (const project of projects) {
    for (const date of dates) {
      const dayType =
        dayTypes.get(`${project.id}:${date}`) ?? defaultDayType(date);
      const expectedIds = new Set(
        assignments
          .filter(
            (row) => row.project_id === project.id && isEffectiveOn(row, date),
          )
          .map((row) => row.worker_id)
          .filter((workerId) =>
            employmentRows.some(
              (row) =>
                row.worker_id === workerId &&
                row.status === "ACTIVE" &&
                isEffectiveOn(row, date),
            ),
          ),
      );
      const eventIds = new Set<string>();
      for (const row of sessionRows) {
        if (row.project_id === project.id && row.work_date === date) {
          eventIds.add(row.worker_id);
        }
      }
      for (const row of leaveDays) {
        if (row.project_id === project.id && row.leave_date === date) {
          eventIds.add(row.worker_id);
        }
      }
      for (const workerId of new Set([...expectedIds, ...eventIds])) {
        const key = `${project.id}:${date}:${workerId}`;
        const sessions = sessionsByKey.get(key) ?? [];
        const approvedLeaveType = leaveByKey.get(key) ?? null;
        if (
          !includeOffDayEmpty &&
          dayType !== "NORMAL" &&
          sessions.length === 0 &&
          !approvedLeaveType
        ) {
          continue;
        }
        const classification = classificationRows.find(
          (row) => row.worker_id === workerId && isEffectiveOn(row, date),
        );
        records.push(
          buildAttendanceWorkerDay(
            {
              approvedLeaveType,
              dayType,
              isExpected: expectedIds.has(workerId),
              projectId: project.id,
              projectName: projectNames.get(project.id) ?? "Project",
              sessions,
              skillName: classification
                ? (skillNames.get(classification.skill_level_id) ?? null)
                : null,
              tradeName: classification
                ? (tradeNames.get(classification.trade_id) ?? null)
                : null,
              workDate: date,
              workerId,
              workerName: workerNames.get(workerId) ?? "Worker record",
              workerPhotoId: photoIds.get(workerId) ?? null,
            },
            now,
          ),
        );
      }
    }
  }
  return { dayTypes, records };
}

function scopeLabel(projects: AttendanceMonitorProject[], allLabel: string) {
  return projects.length === 1 ? projects[0]!.name : allLabel;
}

export async function getDailyAttendanceMonitor({
  now = new Date(),
  projectId,
  role,
  workDate,
}: {
  now?: Date;
  projectId?: string;
  role: MonitorRole;
  workDate: string;
}): Promise<DailyAttendanceMonitor> {
  const authorizedProjects = await listAttendanceMonitorProjects();
  const projects = selectProjects(authorizedProjects, role, projectId);
  const { dayTypes, records } = await loadWorkerDays({
    dates: [workDate],
    endDate: workDate,
    includeOffDayEmpty: true,
    now,
    projects,
    startDate: workDate,
  });
  const projectSummaries = projects
    .map((project): AttendanceProjectSummary => {
      const dayType =
        dayTypes.get(`${project.id}:${workDate}`) ?? defaultDayType(workDate);
      return {
        ...summarizeAttendance(
          records.filter((record) => record.projectId === project.id),
          [dayType],
        ),
        dayType,
        projectId: project.id,
        projectName: project.name,
      };
    })
    .sort(
      (left, right) =>
        right.recordsWithIssues - left.recordsWithIssues ||
        (left.attendancePercent ?? 101) - (right.attendancePercent ?? 101) ||
        left.projectName.localeCompare(right.projectName),
    );
  return {
    projects,
    projectSummaries,
    records: records.sort(
      (left, right) =>
        left.workerName.localeCompare(right.workerName) ||
        left.projectName.localeCompare(right.projectName),
    ),
    scopeLabel: scopeLabel(projects, "All active projects"),
    summary: summarizeAttendance(
      records,
      projectSummaries.map((summary) => summary.dayType),
    ),
    workDate,
  };
}

export async function getMonthlyAttendanceMonitor({
  month,
  now = new Date(),
  projectId,
  role,
}: {
  month: string;
  now?: Date;
  projectId?: string;
  role: MonitorRole;
}): Promise<MonthlyAttendanceMonitor> {
  const authorizedProjects = await listAttendanceMonitorProjects();
  const projects = selectProjects(
    authorizedProjects,
    role,
    projectId,
    "AUTHORIZED",
  );
  const startDate = `${month}-01`;
  const today = malaysiaDate(now);
  const endDate = month === today.slice(0, 7) ? today : monthEnd(month);
  const dates = startDate > today ? [] : datesBetween(startDate, endDate);
  const { dayTypes, records } = await loadWorkerDays({
    dates,
    endDate,
    includeOffDayEmpty: false,
    now,
    projects,
    startDate,
  });
  return {
    month,
    projects,
    records: records.sort(
      (left, right) =>
        right.workDate.localeCompare(left.workDate) ||
        left.workerName.localeCompare(right.workerName),
    ),
    rollups: rollupAttendanceMonth(records),
    scopeLabel: scopeLabel(projects, "All authorized projects"),
    summary: summarizeAttendance(records, [...dayTypes.values()]),
  };
}

export async function getTodayAttendanceDashboardSummary() {
  const workDate = malaysiaDate(new Date());
  const monitor = await getDailyAttendanceMonitor({ role: "CEO", workDate });
  return monitor.summary;
}

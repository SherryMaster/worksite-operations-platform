import "server-only";

import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type LeaveRequest = Tables<"leave_requests">;

export type LeaveRequestView = LeaveRequest & {
  attendanceConflict: boolean;
  document: Tables<"leave_request_documents"> | null;
  leaveTypeName: string;
  projectName: string;
  workerName: string;
  workerPhotoId: string | null;
};

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  logger.error("phase_5_query_failed", { code: error?.code, operation });
  throw new Error("Leave information could not be loaded.");
}

export async function listLeaveTypes(includeInactive = false) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("leave_types").select("*").order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const result = await query;
  if (result.error) throwQueryError("leave_types", result.error);
  return result.data;
}

export async function listLeaveRequests(filters?: {
  projectId?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  workerId?: string;
}) {
  const supabase = await createServerSupabaseClient();
  let requestQuery = supabase
    .from("leave_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (filters?.projectId) {
    requestQuery = requestQuery.eq("project_id", filters.projectId);
  }
  if (filters?.workerId) {
    requestQuery = requestQuery.eq("worker_id", filters.workerId);
  }
  if (filters?.status) {
    requestQuery = requestQuery.eq("status", filters.status);
  }

  const requestResult = await requestQuery;
  if (requestResult.error) {
    throwQueryError("leave_requests", requestResult.error);
  }
  const requests = requestResult.data;
  if (requests.length === 0) return [];

  const workerIds = [...new Set(requests.map((row) => row.worker_id))];
  const projectIds = [...new Set(requests.map((row) => row.project_id))];
  const leaveTypeIds = [...new Set(requests.map((row) => row.leave_type_id))];
  const requestIds = requests.map((row) => row.id);
  const minimumDate = requests.reduce(
    (value, row) => (row.starts_on < value ? row.starts_on : value),
    requests[0].starts_on,
  );
  const maximumDate = requests.reduce(
    (value, row) => (row.ends_on > value ? row.ends_on : value),
    requests[0].ends_on,
  );

  const [workers, workerPhotos, projects, leaveTypes, documents, attendance] =
    await Promise.all([
      supabase.from("workers").select("id,legal_name").in("id", workerIds),
      supabase
        .from("worker_documents")
        .select("id,worker_id")
        .in("worker_id", workerIds)
        .eq("file_kind", "PHOTO")
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false }),
      supabase.from("projects").select("id,name").in("id", projectIds),
      supabase.from("leave_types").select("id,name").in("id", leaveTypeIds),
      supabase
        .from("leave_request_documents")
        .select("*")
        .in("leave_request_id", requestIds),
      supabase
        .from("attendance_sessions")
        .select("worker_id,project_id,work_date")
        .in("worker_id", workerIds)
        .in("project_id", projectIds)
        .gte("work_date", minimumDate)
        .lte("work_date", maximumDate)
        .eq("record_status", "ACTIVE"),
    ]);

  for (const [operation, result] of [
    ["leave_workers", workers],
    ["leave_worker_photos", workerPhotos],
    ["leave_projects", projects],
    ["leave_type_names", leaveTypes],
    ["leave_documents", documents],
    ["leave_attendance_conflicts", attendance],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  const workerNames = new Map(
    (workers.data ?? []).map((row) => [row.id, row.legal_name]),
  );
  const workerPhotoIds = new Map<string, string>();
  for (const photo of workerPhotos.data ?? []) {
    if (!workerPhotoIds.has(photo.worker_id)) {
      workerPhotoIds.set(photo.worker_id, photo.id);
    }
  }
  const projectNames = new Map(
    (projects.data ?? []).map((row) => [row.id, row.name]),
  );
  const typeNames = new Map(
    (leaveTypes.data ?? []).map((row) => [row.id, row.name]),
  );
  const documentsByRequest = new Map(
    (documents.data ?? []).map((row) => [row.leave_request_id, row]),
  );

  return requests
    .map((request): LeaveRequestView => ({
      ...request,
      attendanceConflict: (attendance.data ?? []).some(
        (row) =>
          row.worker_id === request.worker_id &&
          row.project_id === request.project_id &&
          row.work_date >= request.starts_on &&
          row.work_date <= request.ends_on,
      ),
      document: documentsByRequest.get(request.id) ?? null,
      leaveTypeName:
        typeNames.get(request.leave_type_id) ?? "Unavailable leave type",
      projectName:
        projectNames.get(request.project_id) ?? "Unavailable project",
      workerName: workerNames.get(request.worker_id) ?? "Worker record",
      workerPhotoId: workerPhotoIds.get(request.worker_id) ?? null,
    }))
    .sort(
      (left, right) =>
        Number(left.status !== "PENDING") -
          Number(right.status !== "PENDING") ||
        right.created_at.localeCompare(left.created_at),
    );
}

export async function getLeaveSubmissionOptions() {
  const supabase = await createServerSupabaseClient();
  const today = malaysiaDateInputValue();
  const [assignments, employment, workers, projects, leaveTypes] =
    await Promise.all([
      supabase
        .from("worker_project_assignments")
        .select("worker_id,project_id,starts_on,ends_on")
        .lte("starts_on", today)
        .or(`ends_on.is.null,ends_on.gt.${today}`),
      supabase
        .from("worker_employment_periods")
        .select("worker_id,status,starts_on,ends_on")
        .eq("status", "ACTIVE")
        .lte("starts_on", today)
        .or(`ends_on.is.null,ends_on.gt.${today}`),
      supabase.from("workers").select("id,legal_name").order("legal_name"),
      supabase
        .from("projects")
        .select("id,name")
        .in("status", ["PLANNED", "ACTIVE"])
        .order("name"),
      supabase
        .from("leave_types")
        .select("id,name")
        .eq("is_active", true)
        .order("name"),
    ]);

  for (const [operation, result] of [
    ["leave_option_assignments", assignments],
    ["leave_option_employment", employment],
    ["leave_option_workers", workers],
    ["leave_option_projects", projects],
    ["leave_option_types", leaveTypes],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  const activeWorkerIds = new Set(
    (employment.data ?? []).map((row) => row.worker_id),
  );
  const workerNames = new Map(
    (workers.data ?? []).map((row) => [row.id, row.legal_name]),
  );
  const projectNames = new Map(
    (projects.data ?? []).map((row) => [row.id, row.name]),
  );

  return {
    leaveTypes: leaveTypes.data ?? [],
    projects: projects.data ?? [],
    workers: (assignments.data ?? [])
      .filter((row) => activeWorkerIds.has(row.worker_id))
      .map((row) => ({
        id: row.worker_id,
        name: workerNames.get(row.worker_id) ?? "Worker record",
        projectId: row.project_id,
        projectName: projectNames.get(row.project_id) ?? "Unavailable project",
      }))
      .sort((left, right) => left.name.localeCompare(right.name)),
  };
}

export async function getPendingLeaveCount() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("leave_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "PENDING");
  if (result.error) throwQueryError("pending_leave_count", result.error);
  return result.count ?? 0;
}

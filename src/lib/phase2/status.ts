import type { Database } from "@/types/database";

export type ProjectStatus = Database["public"]["Enums"]["project_status"];

const transitions: Record<ProjectStatus, ProjectStatus[]> = {
  PLANNED: ["ACTIVE"],
  ACTIVE: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["ACTIVE", "ARCHIVED"],
  CANCELLED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: ["PLANNED"],
};

export function nextProjectStatuses(status: ProjectStatus): ProjectStatus[] {
  return transitions[status];
}

export function projectStatusLabel(status: ProjectStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

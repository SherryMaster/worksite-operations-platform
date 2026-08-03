import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type ProjectRow = Tables<"projects">;
type AssignmentRow = Tables<"foreman_project_assignments">;
type ApplicationUserRow = Tables<"application_users">;

type ClerkUserShape = {
  emailAddresses: Array<{ emailAddress: string; id: string }>;
  firstName: string | null;
  id: string;
  lastName: string | null;
  primaryEmailAddressId: string | null;
  username: string | null;
};

export type ForemanSummary = {
  applicationUserId: string;
  clerkUserId: string;
  displayName: string;
  emailAddress: string | null;
  isActive: boolean;
  projectId: string | null;
  projectName: string | null;
  username: string | null;
};

export type ProjectSummary = ProjectRow & {
  currentForeman: ForemanSummary | null;
};

export type ProjectDetail = ProjectSummary & {
  assignments: Array<
    AssignmentRow & {
      foreman: ForemanSummary | null;
    }
  >;
  statusHistory: Tables<"project_status_history">[];
};

function primaryEmail(user: ClerkUserShape): string | null {
  return (
    user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null
  );
}

function clerkDisplayName(user: ClerkUserShape): string {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return fullName || user.username || primaryEmail(user) || "Unnamed account";
}

async function getClerkUsers(userIds: string[]) {
  if (userIds.length === 0) {
    return new Map<string, ClerkUserShape>();
  }

  const client = await clerkClient();
  const response = await client.users.getUserList({
    limit: Math.min(userIds.length, 100),
    userId: userIds.slice(0, 100),
  });

  return new Map(
    response.data.map((user) => [user.id, user as unknown as ClerkUserShape]),
  );
}

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  logger.error("phase_2_query_failed", {
    operation,
    code: error?.code,
  });
  throw new Error("The requested operational data could not be loaded.");
}

export async function listForemen(): Promise<ForemanSummary[]> {
  const supabase = await createServerSupabaseClient();
  const [usersResult, assignmentsResult, projectsResult] = await Promise.all([
    supabase
      .from("application_users")
      .select("*")
      .eq("role", "FOREMAN")
      .order("created_at"),
    supabase
      .from("foreman_project_assignments")
      .select("*")
      .is("ends_on", null),
    supabase.from("projects").select("id,name"),
  ]);

  if (usersResult.error) {
    throwQueryError("list_foremen", usersResult.error);
  }
  if (assignmentsResult.error) {
    throwQueryError("list_foreman_assignments", assignmentsResult.error);
  }
  if (projectsResult.error) {
    throwQueryError("list_foreman_projects", projectsResult.error);
  }

  const users = usersResult.data as ApplicationUserRow[];
  const clerkUsers = await getClerkUsers(
    users.map((user) => user.clerk_user_id),
  );
  const assignmentsByForeman = new Map(
    assignmentsResult.data.map((assignment) => [
      assignment.foreman_user_id,
      assignment,
    ]),
  );
  const projectsById = new Map(
    projectsResult.data.map((project) => [project.id, project]),
  );

  return users.map((user) => {
    const clerkUser = clerkUsers.get(user.clerk_user_id);
    const assignment = assignmentsByForeman.get(user.id);
    const project = assignment
      ? projectsById.get(assignment.project_id)
      : undefined;

    return {
      applicationUserId: user.id,
      clerkUserId: user.clerk_user_id,
      displayName: clerkUser
        ? clerkDisplayName(clerkUser)
        : "Unavailable Clerk account",
      emailAddress: clerkUser ? primaryEmail(clerkUser) : null,
      isActive: user.is_active,
      projectId: project?.id ?? null,
      projectName: project?.name ?? null,
      username: clerkUser?.username ?? null,
    };
  });
}

export async function listProjects(): Promise<ProjectSummary[]> {
  const supabase = await createServerSupabaseClient();
  const [projectsResult, assignmentsResult, foremen] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", {
      ascending: false,
    }),
    supabase
      .from("foreman_project_assignments")
      .select("*")
      .is("ends_on", null),
    listForemen(),
  ]);

  if (projectsResult.error) {
    throwQueryError("list_projects", projectsResult.error);
  }
  if (assignmentsResult.error) {
    throwQueryError("list_project_assignments", assignmentsResult.error);
  }

  const foremenById = new Map(
    foremen.map((foreman) => [foreman.applicationUserId, foreman]),
  );
  const assignmentsByProject = new Map(
    assignmentsResult.data.map((assignment) => [
      assignment.project_id,
      assignment,
    ]),
  );

  return projectsResult.data.map((project) => {
    const assignment = assignmentsByProject.get(project.id);
    return {
      ...project,
      currentForeman: assignment
        ? (foremenById.get(assignment.foreman_user_id) ?? null)
        : null,
    };
  });
}

export async function getProject(
  projectId: string,
): Promise<ProjectDetail | null> {
  const supabase = await createServerSupabaseClient();
  const [projectResult, assignmentsResult, historyResult, foremen] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", projectId).maybeSingle(),
      supabase
        .from("foreman_project_assignments")
        .select("*")
        .eq("project_id", projectId)
        .order("starts_on", { ascending: false }),
      supabase
        .from("project_status_history")
        .select("*")
        .eq("project_id", projectId)
        .order("effective_at", { ascending: false }),
      listForemen(),
    ]);

  if (projectResult.error) {
    throwQueryError("get_project", projectResult.error);
  }
  if (assignmentsResult.error) {
    throwQueryError("get_project_assignments", assignmentsResult.error);
  }
  if (historyResult.error) {
    throwQueryError("get_project_history", historyResult.error);
  }
  if (!projectResult.data) {
    return null;
  }

  const foremenById = new Map(
    foremen.map((foreman) => [foreman.applicationUserId, foreman]),
  );
  const currentAssignment = assignmentsResult.data.find(
    (assignment) => assignment.ends_on === null,
  );

  return {
    ...projectResult.data,
    currentForeman: currentAssignment
      ? (foremenById.get(currentAssignment.foreman_user_id) ?? null)
      : null,
    assignments: assignmentsResult.data.map((assignment) => ({
      ...assignment,
      foreman:
        foremenById.get(assignment.foreman_user_id) ??
        ({
          applicationUserId: assignment.foreman_user_id,
          clerkUserId: "",
          displayName: "Former Foreman",
          emailAddress: null,
          isActive: false,
          projectId: null,
          projectName: null,
          username: null,
        } satisfies ForemanSummary),
    })),
    statusHistory: historyResult.data,
  };
}

export async function getProjectIdentity(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (result.error) throwQueryError("get_project_identity", result.error);
  return result.data;
}

export async function getProjectHistory(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const [assignmentsResult, historyResult, foremen] = await Promise.all([
    supabase
      .from("foreman_project_assignments")
      .select("*")
      .eq("project_id", projectId)
      .order("starts_on", { ascending: false }),
    supabase
      .from("project_status_history")
      .select("*")
      .eq("project_id", projectId)
      .order("effective_at", { ascending: false }),
    listForemen(),
  ]);
  if (assignmentsResult.error) {
    throwQueryError("get_project_assignment_history", assignmentsResult.error);
  }
  if (historyResult.error) {
    throwQueryError("get_project_status_history", historyResult.error);
  }
  const foremenById = new Map(
    foremen.map((foreman) => [foreman.applicationUserId, foreman]),
  );
  return {
    assignments: assignmentsResult.data.map((assignment) => ({
      ...assignment,
      foreman: foremenById.get(assignment.foreman_user_id) ?? null,
    })),
    statusHistory: historyResult.data,
  };
}

export async function getProjectOverviewData(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const [assignmentResult, foremen] = await Promise.all([
    supabase
      .from("foreman_project_assignments")
      .select("foreman_user_id")
      .eq("project_id", projectId)
      .is("ends_on", null)
      .maybeSingle(),
    listForemen(),
  ]);
  if (assignmentResult.error) {
    throwQueryError("get_project_current_foreman", assignmentResult.error);
  }
  const currentForemanId = assignmentResult.data?.foreman_user_id;
  const currentForeman = currentForemanId
    ? (foremen.find(
        (foreman) => foreman.applicationUserId === currentForemanId,
      ) ?? null)
    : null;
  return { currentForeman, foremen };
}

export async function getCurrentWorkerCountsByProject() {
  const supabase = await createServerSupabaseClient();
  const today = malaysiaDateInputValue();
  const result = await supabase
    .from("worker_project_assignments")
    .select("project_id")
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gt.${today}`);
  if (result.error) {
    throwQueryError("current_worker_counts_by_project", result.error);
  }
  return result.data.reduce<Record<string, number>>((counts, assignment) => {
    counts[assignment.project_id] = (counts[assignment.project_id] ?? 0) + 1;
    return counts;
  }, {});
}

export async function getCurrentWorkerCount(projectId: string) {
  const supabase = await createServerSupabaseClient();
  const today = malaysiaDateInputValue();
  const result = await supabase
    .from("worker_project_assignments")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .lte("starts_on", today)
    .or(`ends_on.is.null,ends_on.gt.${today}`);
  if (result.error)
    throwQueryError("current_project_worker_count", result.error);
  return result.count ?? 0;
}

export async function getDashboardData() {
  const [projects, foremen, settings] = await Promise.all([
    listProjects(),
    listForemen(),
    getCompanySettings(),
  ]);

  return {
    projects,
    foremen,
    companyConfigured: Boolean(settings?.legal_name && settings.display_name),
    unassignedActiveForemen: foremen.filter(
      (foreman) => foreman.isActive && !foreman.projectId,
    ),
    projectsWithoutForemen: projects.filter(
      (project) =>
        ["PLANNED", "ACTIVE"].includes(project.status) &&
        !project.currentForeman,
    ),
  };
}

export async function getCompanySettings() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .eq("singleton", true)
    .maybeSingle();

  if (error) {
    throwQueryError("get_company_settings", error);
  }
  return data;
}

export async function getSettingsData() {
  const supabase = await createServerSupabaseClient();
  const [foremen, tradesResult, skillsResult, settings] = await Promise.all([
    listForemen(),
    supabase.from("trades").select("*").order("name"),
    supabase.from("skill_levels").select("*").order("name"),
    getCompanySettings(),
  ]);

  if (tradesResult.error) {
    throwQueryError("get_trades", tradesResult.error);
  }
  if (skillsResult.error) {
    throwQueryError("get_skill_levels", skillsResult.error);
  }
  return {
    foremen,
    trades: tradesResult.data,
    skills: skillsResult.data,
    settings,
  };
}

export async function listTrades() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("trades").select("*").order("name");
  if (result.error) throwQueryError("get_trades", result.error);
  return result.data;
}

export async function listSkillLevels() {
  const supabase = await createServerSupabaseClient();
  const result = await supabase.from("skill_levels").select("*").order("name");
  if (result.error) throwQueryError("get_skill_levels", result.error);
  return result.data;
}

type AuditQueryOptions = {
  actorIds?: string[];
  date?: string;
  entityIds?: string[];
  module?: string;
  offset?: number;
  query?: string;
  workerId?: string;
};

function auditDateRange(date: string) {
  const start = new Date(`${date}T00:00:00+08:00`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { end: end.toISOString(), start: start.toISOString() };
}

export async function getAuditEntryCount(
  options: Omit<AuditQueryOptions, "offset"> = {},
) {
  if (options.actorIds?.length === 0) return 0;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("audit_entries")
    .select("id", { count: "exact", head: true });
  if (options.module) query = query.eq("module", options.module);
  if (options.actorIds) query = query.in("actor_user_id", options.actorIds);
  if (options.workerId) {
    const workerId = options.workerId.replace(/[^a-f0-9-]/gi, "");
    query = query.or(
      `entity_id.eq.${workerId},before_data->>worker_id.eq.${workerId},after_data->>worker_id.eq.${workerId}`,
    );
  }
  const normalizedQuery = options.query?.trim().replace(/[%_,]/g, "");
  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    const clauses = [
      `action.ilike.${pattern}`,
      `entity_type.ilike.${pattern}`,
      `module.ilike.${pattern}`,
    ];
    if (options.entityIds?.length) {
      clauses.push(`entity_id.in.(${options.entityIds.join(",")})`);
    }
    query = query.or(clauses.join(","));
  }
  if (options.date) {
    const range = auditDateRange(options.date);
    query = query.gte("occurred_at", range.start).lt("occurred_at", range.end);
  }
  const { count, error } = await query;
  if (error) throwQueryError("get_audit_entry_count", error);
  return count ?? 0;
}

export async function getAuditEntries(
  limit = 100,
  options: AuditQueryOptions = {},
) {
  if (options.actorIds?.length === 0) return [];
  const supabase = await createServerSupabaseClient();
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);
  let query = supabase
    .from("audit_entries")
    .select("*")
    .order("occurred_at", { ascending: false });
  if (options.module) query = query.eq("module", options.module);
  if (options.actorIds) query = query.in("actor_user_id", options.actorIds);
  if (options.workerId) {
    const workerId = options.workerId.replace(/[^a-f0-9-]/gi, "");
    query = query.or(
      `entity_id.eq.${workerId},before_data->>worker_id.eq.${workerId},after_data->>worker_id.eq.${workerId}`,
    );
  }
  const normalizedQuery = options.query?.trim().replace(/[%_,]/g, "");
  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    const clauses = [
      `action.ilike.${pattern}`,
      `entity_type.ilike.${pattern}`,
      `module.ilike.${pattern}`,
    ];
    if (options.entityIds?.length) {
      clauses.push(`entity_id.in.(${options.entityIds.join(",")})`);
    }
    query = query.or(clauses.join(","));
  }
  if (options.date) {
    const range = auditDateRange(options.date);
    query = query.gte("occurred_at", range.start).lt("occurred_at", range.end);
  }
  const { data, error } = await query.range(offset, offset + safeLimit - 1);

  if (error) {
    throwQueryError("get_audit_entries", error);
  }

  if (data.length === 0) {
    return [];
  }

  const records = data.map((entry) => {
    const before =
      entry.before_data &&
      typeof entry.before_data === "object" &&
      !Array.isArray(entry.before_data)
        ? entry.before_data
        : {};
    const after =
      entry.after_data &&
      typeof entry.after_data === "object" &&
      !Array.isArray(entry.after_data)
        ? entry.after_data
        : {};
    return {
      entry,
      foremanUserId:
        entry.entity_type === "application_users"
          ? entry.entity_id
          : typeof after.foreman_user_id === "string"
            ? after.foreman_user_id
            : typeof before.foreman_user_id === "string"
              ? before.foreman_user_id
              : null,
      projectId:
        entry.entity_type === "projects"
          ? entry.entity_id
          : typeof after.project_id === "string"
            ? after.project_id
            : typeof before.project_id === "string"
              ? before.project_id
              : null,
      workerId:
        entry.entity_type === "workers"
          ? entry.entity_id
          : typeof after.worker_id === "string"
            ? after.worker_id
            : typeof before.worker_id === "string"
              ? before.worker_id
              : null,
    };
  });
  const userIds = [
    ...new Set(
      records.flatMap((record) =>
        [record.entry.actor_user_id, record.foremanUserId].filter(
          (value): value is string => Boolean(value),
        ),
      ),
    ),
  ];
  const projectIds = [
    ...new Set(
      records
        .map((record) => record.projectId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const workerIds = [
    ...new Set(
      records
        .map((record) => record.workerId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const [usersResult, projectsResult, workersResult] = await Promise.all([
    userIds.length
      ? supabase
          .from("application_users")
          .select("id,clerk_user_id")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? supabase.from("projects").select("id,name").in("id", projectIds)
      : Promise.resolve({ data: [], error: null }),
    workerIds.length
      ? supabase.from("workers").select("id,legal_name").in("id", workerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (usersResult.error) {
    throwQueryError("get_audit_users", usersResult.error);
  }
  if (projectsResult.error) {
    throwQueryError("get_audit_projects", projectsResult.error);
  }
  if (workersResult.error) {
    throwQueryError("get_audit_workers", workersResult.error);
  }

  const clerkUsers = await getClerkUsers(
    usersResult.data.map((user) => user.clerk_user_id),
  );
  const userNames = new Map(
    usersResult.data.map((actor) => {
      const user = clerkUsers.get(actor.clerk_user_id);
      return [actor.id, user ? clerkDisplayName(user) : "System user"];
    }),
  );
  const projectNames = new Map(
    projectsResult.data.map((project) => [project.id, project.name]),
  );
  const workerNames = new Map(
    workersResult.data.map((worker) => [worker.id, worker.legal_name]),
  );

  return records.map(({ entry, foremanUserId, projectId, workerId }) => {
    return {
      ...entry,
      actorName: userNames.get(entry.actor_user_id) ?? "System user",
      foremanName: foremanUserId
        ? (userNames.get(foremanUserId) ?? "Foreman account")
        : null,
      projectName: projectId
        ? (projectNames.get(projectId) ?? "Project record")
        : null,
      workerName: workerId
        ? (workerNames.get(workerId) ?? "Worker record")
        : null,
    };
  });
}

export async function getWorkerAuditEntries(workerId: string, limit = 30) {
  return getAuditEntries(limit, { workerId });
}

export async function findAuditActorIds(actorQuery: string | undefined) {
  const normalized = actorQuery?.trim().toLowerCase();
  if (!normalized) return undefined;

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("application_users")
    .select("id,clerk_user_id");
  if (error) throwQueryError("find_audit_actors", error);

  const clerkUsers = await getClerkUsers(
    data.map((user) => user.clerk_user_id),
  );
  return data
    .filter((user) => {
      const clerkUser = clerkUsers.get(user.clerk_user_id);
      return clerkUser
        ? clerkDisplayName(clerkUser).toLowerCase().includes(normalized)
        : false;
    })
    .map((user) => user.id);
}

export async function findAuditEntityIds(searchQuery: string | undefined) {
  const normalized = searchQuery?.trim().replace(/[%_,]/g, "");
  if (!normalized) return undefined;

  const supabase = await createServerSupabaseClient();
  const pattern = `%${normalized}%`;
  const [workers, projects] = await Promise.all([
    supabase.from("workers").select("id").ilike("legal_name", pattern),
    supabase.from("projects").select("id").ilike("name", pattern),
  ]);
  if (workers.error) throwQueryError("find_audit_workers", workers.error);
  if (projects.error) throwQueryError("find_audit_projects", projects.error);

  return [
    ...workers.data.map((worker) => worker.id),
    ...projects.data.map((project) => project.id),
  ];
}

export async function getForemanWorkspace() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .in("status", ["PLANNED", "ACTIVE"])
    .maybeSingle();

  if (error) {
    throwQueryError("get_foreman_workspace", error);
  }

  return data;
}

import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

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
  publicMetadata: Record<string, unknown>;
  twoFactorEnabled: boolean;
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
  twoFactorEnabled: boolean;
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

export type InvitationSummary = {
  createdAt: number;
  emailAddress: string;
  id: string;
  status: string;
};

export type UnmappedForeman = {
  clerkUserId: string;
  displayName: string;
  emailAddress: string | null;
  twoFactorEnabled: boolean;
  username: string | null;
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
      twoFactorEnabled: clerkUser?.twoFactorEnabled ?? false,
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
          twoFactorEnabled: false,
          username: null,
        } satisfies ForemanSummary),
    })),
    statusHistory: historyResult.data,
  };
}

export async function getDashboardData() {
  const [projects, foremen, settings] = await Promise.all([
    listProjects(),
    listForemen(),
    getCompanySettings(),
  ]);
  const client = await clerkClient();
  const invitations = await client.invitations.getInvitationList({
    limit: 100,
    status: "pending",
  });

  return {
    projects,
    foremen,
    companyConfigured: Boolean(settings?.legal_name && settings.display_name),
    pendingInvitationCount: invitations.totalCount,
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
  const client = await clerkClient();
  const [
    foremen,
    tradesResult,
    skillsResult,
    settings,
    invitationsResult,
    allClerkUsers,
    mappedUsersResult,
  ] = await Promise.all([
    listForemen(),
    supabase.from("trades").select("*").order("name"),
    supabase.from("skill_levels").select("*").order("name"),
    getCompanySettings(),
    client.invitations.getInvitationList({ limit: 100, status: "pending" }),
    client.users.getUserList({ limit: 100, orderBy: "-created_at" }),
    supabase.from("application_users").select("clerk_user_id"),
  ]);

  if (tradesResult.error) {
    throwQueryError("get_trades", tradesResult.error);
  }
  if (skillsResult.error) {
    throwQueryError("get_skill_levels", skillsResult.error);
  }
  if (mappedUsersResult.error) {
    throwQueryError("get_mapped_users", mappedUsersResult.error);
  }

  const mappedClerkIds = new Set(
    mappedUsersResult.data.map((user) => user.clerk_user_id),
  );
  const unmappedForemen = allClerkUsers.data
    .filter(
      (user) =>
        !mappedClerkIds.has(user.id) &&
        user.publicMetadata.worksiteRole === "FOREMAN",
    )
    .map((user): UnmappedForeman => ({
      clerkUserId: user.id,
      displayName: clerkDisplayName(user as unknown as ClerkUserShape),
      emailAddress: primaryEmail(user as unknown as ClerkUserShape),
      twoFactorEnabled: user.twoFactorEnabled,
      username: user.username,
    }));

  return {
    foremen,
    trades: tradesResult.data,
    skills: skillsResult.data,
    settings,
    invitations: invitationsResult.data.map(
      (invitation): InvitationSummary => ({
        createdAt: invitation.createdAt,
        emailAddress: invitation.emailAddress,
        id: invitation.id,
        status: invitation.status,
      }),
    ),
    unmappedForemen,
  };
}

export async function getAuditEntries() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("audit_entries")
    .select("*")
    .order("occurred_at", { ascending: false })
    .limit(100);

  if (error) {
    throwQueryError("get_audit_entries", error);
  }

  if (data.length === 0) {
    return [];
  }

  const actorIds = [...new Set(data.map((entry) => entry.actor_user_id))];
  const { data: actors, error: actorError } = await supabase
    .from("application_users")
    .select("id,clerk_user_id")
    .in("id", actorIds);

  if (actorError) {
    throwQueryError("get_audit_actors", actorError);
  }

  const clerkUsers = await getClerkUsers(
    actors.map((actor) => actor.clerk_user_id),
  );
  const actorNames = new Map(
    actors.map((actor) => {
      const user = clerkUsers.get(actor.clerk_user_id);
      return [actor.id, user ? clerkDisplayName(user) : "System user"];
    }),
  );

  return data.map((entry) => ({
    ...entry,
    actorName: actorNames.get(entry.actor_user_id) ?? "System user",
  }));
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

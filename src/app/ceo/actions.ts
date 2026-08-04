"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthorizedActor } from "@/lib/auth/access";
import { getRequestClerkClient } from "@/lib/auth/request-context";
import {
  dependencyActionMessage,
  isDependencyError,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";
import {
  actionError,
  actionSuccess,
  assignmentSchema,
  categorySchema,
  clerkUserIdSchema,
  companySettingsSchema,
  foremanAccountSchema,
  foremanPasswordSchema,
  projectSchema,
  projectStatusSchema,
  uuidSchema,
  type ActionState,
} from "@/lib/phase2/validation";

async function getCeoContext() {
  try {
    return await getAuthorizedActor("CEO");
  } catch (error) {
    if (isDependencyError(error)) {
      return { failure: actionError(dependencyActionMessage(error)) } as const;
    }
    throw error;
  }
}

function databaseErrorMessage(
  error: { code?: string; message: string },
  operation: string,
) {
  const failure = recordDependencyFailure(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "write",
    routeFamily: "/ceo/projects|settings",
    surface: "server_action",
  });
  if (failure.category.startsWith("AUTH_") || failure.retryable) {
    return dependencyActionMessage(failure);
  }
  if (error.code === "23505") {
    return "That value is already in use.";
  }
  if (error.code === "23P01") {
    return "The selected assignment overlaps an existing assignment.";
  }
  if (error.code === "P0001") {
    return error.message;
  }
  return "The change could not be saved. Please try again.";
}

export async function createProjectAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = projectSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    contractorName: formData.get("contractorName"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  });

  if (!result.success) {
    return actionError(
      "Check the highlighted project details.",
      result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: result.data.name,
      client_name: result.data.clientName,
      contractor_name: result.data.contractorName,
      location: result.data.location,
      start_date: result.data.startDate,
      end_date: result.data.endDate,
      notes: result.data.notes,
      created_by: actorId,
      updated_by: actorId,
    })
    .select("id")
    .single();

  if (error) {
    return actionError(databaseErrorMessage(error, "project_create"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  redirect(`/ceo/projects/${data.id}`);
}

export async function updateProjectAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedId = uuidSchema.safeParse(projectId);
  const result = projectSchema.safeParse({
    name: formData.get("name"),
    clientName: formData.get("clientName"),
    contractorName: formData.get("contractorName"),
    location: formData.get("location"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    notes: formData.get("notes"),
  });

  if (!parsedId.success || !result.success) {
    return actionError(
      "Check the highlighted project details.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase
    .from("projects")
    .update({
      name: result.data.name,
      client_name: result.data.clientName,
      contractor_name: result.data.contractorName,
      location: result.data.location,
      start_date: result.data.startDate,
      end_date: result.data.endDate,
      notes: result.data.notes,
      updated_by: actorId,
    })
    .eq("id", parsedId.data);

  if (error) {
    return actionError(databaseErrorMessage(error, "project_update"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  revalidatePath(`/ceo/projects/${parsedId.data}`);
  return actionSuccess("Project details saved.");
}

export async function changeProjectStatusAction(
  projectId: string,
  targetStatus: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsedId = uuidSchema.safeParse(projectId);
  const parsedStatus = projectStatusSchema.safeParse(targetStatus);
  if (!parsedId.success || !parsedStatus.success) {
    return actionError("Invalid project status request.");
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase
    .from("projects")
    .update({ status: parsedStatus.data, updated_by: actorId })
    .eq("id", parsedId.data);

  if (error) {
    return actionError(databaseErrorMessage(error, "project_status_update"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  revalidatePath(`/ceo/projects/${parsedId.data}`);
  revalidatePath("/ceo/workers");
  revalidatePath("/foreman");
  revalidatePath("/foreman/workers");
  return actionSuccess(`Project moved to ${parsedStatus.data.toLowerCase()}.`);
}

export async function assignForemanAction(
  projectId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsedProjectId = uuidSchema.safeParse(projectId);
  const result = assignmentSchema.safeParse({
    foremanUserId: formData.get("foremanUserId"),
    startsOn: formData.get("startsOn"),
  });

  if (!parsedProjectId.success || !result.success) {
    return actionError(
      "Select an active Foreman and a valid effective date.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const { error } = await supabase.rpc("assign_foreman", {
    project_id: parsedProjectId.data,
    foreman_user_id: result.data.foremanUserId,
    starts_on: result.data.startsOn,
  });

  if (error) {
    return actionError(databaseErrorMessage(error, "foreman_assignment"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  revalidatePath(`/ceo/projects/${parsedProjectId.data}`);
  revalidatePath("/ceo/settings");
  revalidatePath("/foreman");
  return actionSuccess("Foreman assignment updated.");
}

async function saveCategory(
  table: "trades" | "skill_levels",
  categoryId: string | null,
  formData: FormData,
): Promise<ActionState> {
  const result = categorySchema.safeParse({ name: formData.get("name") });
  if (!result.success) {
    return actionError(
      "Enter a category name between 2 and 80 characters.",
      result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const operation = categoryId
    ? supabase
        .from(table)
        .update({ name: result.data.name, updated_by: actorId })
        .eq("id", categoryId)
    : supabase.from(table).insert({
        name: result.data.name,
        created_by: actorId,
        updated_by: actorId,
      });
  const { error } = await operation;

  if (error) {
    return actionError(databaseErrorMessage(error, `category_save_${table}`));
  }

  revalidatePath("/ceo/settings");
  return actionSuccess(categoryId ? "Category renamed." : "Category added.");
}

export async function createTradeAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return saveCategory("trades", null, formData);
}

export async function createSkillAction(
  _previousState: ActionState,
  formData: FormData,
) {
  return saveCategory("skill_levels", null, formData);
}

export async function renameTradeAction(
  categoryId: string,
  _previousState: ActionState,
  formData: FormData,
) {
  return saveCategory("trades", categoryId, formData);
}

export async function renameSkillAction(
  categoryId: string,
  _previousState: ActionState,
  formData: FormData,
) {
  return saveCategory("skill_levels", categoryId, formData);
}

export async function setCategoryActiveAction(
  table: "trades" | "skill_levels",
  categoryId: string,
  isActive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsedId = uuidSchema.safeParse(categoryId);
  if (!parsedId.success) {
    return actionError("Invalid category.");
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase
    .from(table)
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", parsedId.data);

  if (error) {
    return actionError(databaseErrorMessage(error, `category_status_${table}`));
  }

  revalidatePath("/ceo/settings");
  return actionSuccess(
    isActive ? "Category restored." : "Category deactivated.",
  );
}

export async function updateCompanySettingsAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = companySettingsSchema.safeParse({
    legalName: formData.get("legalName"),
    displayName: formData.get("displayName"),
  });

  if (!result.success) {
    return actionError(
      "Check the company names.",
      result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: result.data.legalName,
      display_name: result.data.displayName,
      updated_by: actorId,
    })
    .eq("singleton", true);

  if (error) {
    return actionError(databaseErrorMessage(error, "company_settings_update"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  return actionSuccess("Company settings saved.");
}

export async function createForemanAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = foremanAccountSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    username: formData.get("username"),
    emailAddress: formData.get("emailAddress"),
    initialPassword: formData.get("initialPassword"),
  });
  if (!result.success) {
    return actionError(
      "Check the Foreman account details.",
      result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  let createdClerkUserId: string | null = null;

  try {
    const client = await getRequestClerkClient();
    const clerkUser = await client.users.createUser({
      firstName: result.data.firstName,
      lastName: result.data.lastName ?? undefined,
      username: result.data.username,
      password: result.data.initialPassword,
      emailAddress: result.data.emailAddress
        ? [result.data.emailAddress]
        : undefined,
      publicMetadata: { worksiteRole: "FOREMAN" },
    });
    createdClerkUserId = clerkUser.id;

    const { error } = await supabase.from("application_users").insert({
      clerk_user_id: clerkUser.id,
      role: "FOREMAN",
      is_active: true,
    });

    if (error) {
      try {
        await client.users.deleteUser(clerkUser.id);
      } catch (cleanupError) {
        recordDependencyFailure(cleanupError, {
          dependency: "CLERK_BACKEND",
          idempotent: true,
          operation: "foreman_account_rollback",
          operationKind: "write",
          routeFamily: "/ceo/settings",
          surface: "server_action",
        });
      }
      throw error;
    }
  } catch (error) {
    const failure = recordDependencyFailure(error, {
      dependency: createdClerkUserId ? "SUPABASE_DATA" : "CLERK_BACKEND",
      operation: "foreman_account_create",
      operationKind: "write",
      routeFamily: "/ceo/settings",
      surface: "server_action",
    });
    return actionError(
      failure.category.includes("TRANSIENT") ||
        failure.category.startsWith("AUTH_")
        ? dependencyActionMessage(failure)
        : "The Foreman account could not be created. The username or email may already be in use, or the password may not meet the security rules.",
    );
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  return actionSuccess(
    "Foreman account created. Share the username and initial password securely.",
  );
}

export async function resetForemanPasswordAction(
  applicationUserId: string,
  clerkUserId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void _previousState;
  const parsedApplicationUserId = uuidSchema.safeParse(applicationUserId);
  const parsedClerkUserId = clerkUserIdSchema.safeParse(clerkUserId);
  const result = foremanPasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
  });
  if (
    !parsedApplicationUserId.success ||
    !parsedClerkUserId.success ||
    !result.success
  ) {
    return actionError(
      "Enter a new password with at least 8 characters.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { data: foreman, error: foremanError } = await supabase
    .from("application_users")
    .select("id")
    .eq("id", parsedApplicationUserId.data)
    .eq("clerk_user_id", parsedClerkUserId.data)
    .eq("role", "FOREMAN")
    .maybeSingle();

  if (foremanError) {
    const failure = recordDependencyFailure(foremanError, {
      dependency: "SUPABASE_DATA",
      operation: "foreman_password_account_lookup",
      operationKind: "read",
      routeFamily: "/ceo/settings",
      surface: "server_action",
    });
    return actionError(dependencyActionMessage(failure));
  }
  if (!foreman) {
    return actionError("The Foreman account could not be verified.");
  }

  try {
    const client = await getRequestClerkClient();
    await client.users.updateUser(parsedClerkUserId.data, {
      password: result.data.newPassword,
      signOutOfOtherSessions: true,
    });

    const { error: auditError } = await supabase.from("audit_entries").insert({
      actor_user_id: actorId,
      action: "users.password_reset",
      module: "users",
      entity_type: "application_users",
      entity_id: parsedApplicationUserId.data,
      after_data: { active_sessions_revoked: true },
    });
    if (auditError) {
      recordDependencyFailure(auditError, {
        dependency: "SUPABASE_DATA",
        operation: "foreman_password_audit",
        operationKind: "write",
        routeFamily: "/ceo/settings",
        surface: "server_action",
      });
      return actionError(
        "The password changed, but its audit entry could not be saved. Contact support before retrying.",
      );
    }
  } catch (error) {
    const failure = recordDependencyFailure(error, {
      dependency: "CLERK_BACKEND",
      operation: "foreman_password_reset",
      operationKind: "write",
      routeFamily: "/ceo/settings",
      surface: "server_action",
    });
    return actionError(
      failure.category === "CLERK_BACKEND_TRANSIENT"
        ? dependencyActionMessage(failure)
        : "The password could not be changed. It may not meet Clerk’s security rules.",
    );
  }

  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/audit");
  return actionSuccess(
    "Password changed and existing account sessions were signed out.",
  );
}

export async function setForemanActiveAction(
  applicationUserId: string,
  isActive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsedId = uuidSchema.safeParse(applicationUserId);
  if (!parsedId.success) {
    return actionError("Invalid Foreman account.");
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const { error } = await supabase
    .from("application_users")
    .update({ is_active: isActive })
    .eq("id", parsedId.data)
    .eq("role", "FOREMAN");

  if (error) {
    return actionError(databaseErrorMessage(error, "foreman_status_update"));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  revalidatePath("/foreman");
  return actionSuccess(
    isActive ? "Foreman account activated." : "Foreman account deactivated.",
  );
}

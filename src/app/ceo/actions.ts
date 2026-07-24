"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/access";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  await requireRole("CEO");
  const { userId } = await auth();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("application_users")
    .select("id")
    .eq("clerk_user_id", userId!)
    .single();

  if (error) {
    logger.error("ceo_actor_lookup_failed", { code: error.code });
    throw new Error("The CEO account could not be verified.");
  }

  return { actorId: data.id, supabase };
}

function databaseErrorMessage(error: { code?: string; message: string }) {
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

  const { actorId, supabase } = await getCeoContext();
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
    logger.error("project_create_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
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

  const { actorId, supabase } = await getCeoContext();
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
    logger.error("project_update_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
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

  const { actorId, supabase } = await getCeoContext();
  const { error } = await supabase
    .from("projects")
    .update({ status: parsedStatus.data, updated_by: actorId })
    .eq("id", parsedId.data);

  if (error) {
    logger.error("project_status_update_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  revalidatePath(`/ceo/projects/${parsedId.data}`);
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

  const { supabase } = await getCeoContext();
  const { error } = await supabase.rpc("assign_foreman", {
    project_id: parsedProjectId.data,
    foreman_user_id: result.data.foremanUserId,
    starts_on: result.data.startsOn,
  });

  if (error) {
    logger.error("foreman_assignment_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
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

  const { actorId, supabase } = await getCeoContext();
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
    logger.error("category_save_failed", { table, code: error.code });
    return actionError(databaseErrorMessage(error));
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

  const { actorId, supabase } = await getCeoContext();
  const { error } = await supabase
    .from(table)
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", parsedId.data);

  if (error) {
    logger.error("category_status_failed", { table, code: error.code });
    return actionError(databaseErrorMessage(error));
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

  const { actorId, supabase } = await getCeoContext();
  const { error } = await supabase
    .from("company_settings")
    .update({
      legal_name: result.data.legalName,
      display_name: result.data.displayName,
      updated_by: actorId,
    })
    .eq("singleton", true);

  if (error) {
    logger.error("company_settings_update_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
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
    mfaRequired: formData.get("mfaRequired"),
  });
  if (!result.success) {
    return actionError(
      "Check the Foreman account details.",
      result.error.flatten().fieldErrors,
    );
  }

  const { supabase } = await getCeoContext();
  const client = await clerkClient();
  let createdClerkUserId: string | null = null;

  try {
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
      mfa_required: result.data.mfaRequired,
    });

    if (error) {
      await client.users.deleteUser(clerkUser.id);
      throw error;
    }
  } catch (error) {
    logger.error("foreman_account_create_failed", {
      createdClerkUserId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError(
      "The Foreman account could not be created. The username or email may already be in use, or the password may not meet the security rules.",
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

  const { actorId, supabase } = await getCeoContext();
  const client = await clerkClient();
  const { data: foreman, error: foremanError } = await supabase
    .from("application_users")
    .select("id")
    .eq("id", parsedApplicationUserId.data)
    .eq("clerk_user_id", parsedClerkUserId.data)
    .eq("role", "FOREMAN")
    .maybeSingle();

  if (foremanError || !foreman) {
    return actionError("The Foreman account could not be verified.");
  }

  try {
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
      logger.error("foreman_password_audit_failed", {
        code: auditError.code,
      });
      return actionError(
        "The password changed, but its audit entry could not be saved. Contact support before retrying.",
      );
    }
  } catch (error) {
    logger.error("foreman_password_reset_failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError(
      "The password could not be changed. It may not meet Clerk’s security rules.",
    );
  }

  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/audit");
  return actionSuccess(
    "Password changed and existing account sessions were signed out.",
  );
}

export async function setForemanMfaRequirementAction(
  applicationUserId: string,
  clerkUserId: string,
  mfaRequired: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsedApplicationUserId = uuidSchema.safeParse(applicationUserId);
  const parsedClerkUserId = clerkUserIdSchema.safeParse(clerkUserId);
  if (!parsedApplicationUserId.success || !parsedClerkUserId.success) {
    return actionError("Invalid Foreman account.");
  }

  const { actorId, supabase } = await getCeoContext();
  const client = await clerkClient();
  const { data: foreman, error: foremanError } = await supabase
    .from("application_users")
    .select("id, mfa_required")
    .eq("id", parsedApplicationUserId.data)
    .eq("clerk_user_id", parsedClerkUserId.data)
    .eq("role", "FOREMAN")
    .maybeSingle();

  if (foremanError || !foreman) {
    return actionError("The Foreman account could not be verified.");
  }
  if (foreman.mfa_required && mfaRequired) {
    return actionSuccess("MFA is already required for this Foreman.");
  }
  const removingOptionalEnrollment = !mfaRequired && !foreman.mfa_required;

  try {
    if (!mfaRequired) {
      await client.users.disableUserMFA(parsedClerkUserId.data);
    }

    const { error } = removingOptionalEnrollment
      ? await supabase.from("audit_entries").insert({
          actor_user_id: actorId,
          action: "users.mfa_disabled",
          module: "users",
          entity_type: "application_users",
          entity_id: parsedApplicationUserId.data,
          after_data: { enrolled_mfa_methods_removed: true },
        })
      : await supabase
          .from("application_users")
          .update({ mfa_required: mfaRequired })
          .eq("id", parsedApplicationUserId.data)
          .eq("role", "FOREMAN");

    if (error) {
      logger.error("foreman_mfa_requirement_update_failed", {
        code: error.code,
      });
      if (removingOptionalEnrollment) {
        return actionError(
          "MFA was turned off, but its audit entry could not be saved. Contact support before retrying.",
        );
      }
      return actionError(databaseErrorMessage(error));
    }
  } catch (error) {
    logger.error("foreman_mfa_management_failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError("The Foreman MFA setting could not be changed.");
  }

  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/audit");
  revalidatePath("/foreman");
  return actionSuccess(
    mfaRequired
      ? "MFA is now required for this Foreman."
      : "MFA is now off for this Foreman.",
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

  const { supabase } = await getCeoContext();
  const { error } = await supabase
    .from("application_users")
    .update({ is_active: isActive })
    .eq("id", parsedId.data)
    .eq("role", "FOREMAN");

  if (error) {
    logger.error("foreman_status_update_failed", { code: error.code });
    return actionError(databaseErrorMessage(error));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  revalidatePath("/foreman");
  return actionSuccess(
    isActive ? "Foreman account activated." : "Foreman account deactivated.",
  );
}

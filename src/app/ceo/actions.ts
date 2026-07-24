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
  foremanInvitationSchema,
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

export async function inviteForemanAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = foremanInvitationSchema.safeParse({
    emailAddress: formData.get("emailAddress"),
  });
  if (!result.success) {
    return actionError(
      "Enter a valid invitation email.",
      result.error.flatten().fieldErrors,
    );
  }

  const { actorId, supabase } = await getCeoContext();
  const client = await clerkClient();
  let invitationId: string | null = null;

  try {
    const invitation = await client.invitations.createInvitation({
      emailAddress: result.data.emailAddress,
      redirectUrl: "/accept-invitation",
      publicMetadata: { worksiteRole: "FOREMAN" },
    });
    invitationId = invitation.id;

    const { error } = await supabase.from("audit_entries").insert({
      actor_user_id: actorId,
      action: "users.invited",
      module: "users",
      entity_type: "clerk_invitation",
      entity_id: invitation.id,
      after_data: { emailAddress: result.data.emailAddress },
    });

    if (error) {
      await client.invitations.revokeInvitation(invitation.id);
      throw error;
    }
  } catch (error) {
    logger.error("foreman_invitation_failed", {
      invitationId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError(
      "The invitation could not be sent. The address may already be invited or registered.",
    );
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  return actionSuccess("Foreman invitation sent.");
}

export async function revokeInvitationAction(
  invitationId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  if (!invitationId.startsWith("inv_")) {
    return actionError("Invalid invitation.");
  }

  const { actorId, supabase } = await getCeoContext();
  const client = await clerkClient();

  try {
    await client.invitations.revokeInvitation(invitationId);
    const { error } = await supabase.from("audit_entries").insert({
      actor_user_id: actorId,
      action: "users.invitation_revoked",
      module: "users",
      entity_type: "clerk_invitation",
      entity_id: invitationId,
    });
    if (error) {
      throw error;
    }
  } catch (error) {
    logger.error("foreman_invitation_revoke_failed", {
      invitationId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError("The invitation could not be revoked.");
  }

  revalidatePath("/ceo/settings");
  return actionSuccess("Invitation revoked.");
}

export async function activateForemanAction(
  clerkUserId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsedId = clerkUserIdSchema.safeParse(clerkUserId);
  if (!parsedId.success) {
    return actionError("Invalid Clerk account.");
  }

  const { supabase } = await getCeoContext();
  const client = await clerkClient();

  try {
    const clerkUser = await client.users.getUser(parsedId.data);
    if (clerkUser.publicMetadata.worksiteRole !== "FOREMAN") {
      return actionError(
        "This account was not created by a Foreman invitation.",
      );
    }

    const { error } = await supabase.from("application_users").insert({
      clerk_user_id: parsedId.data,
      role: "FOREMAN",
      is_active: true,
    });

    if (error) {
      logger.error("foreman_activation_failed", { code: error.code });
      return actionError(databaseErrorMessage(error));
    }
  } catch (error) {
    logger.error("foreman_clerk_lookup_failed", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return actionError("The invited Clerk account could not be verified.");
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/settings");
  return actionSuccess("Foreman account activated.");
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

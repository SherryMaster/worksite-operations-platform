"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/access";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  actionError,
  actionSuccess,
  createWorkerSchema,
  documentTypeSchema,
  employmentChangeSchema,
  moneyToSen,
  rateChangeSchema,
  updateWorkerSchema,
  workerTransferSchema,
  type Phase3ActionState,
} from "@/lib/phase3/validation";
import { uuidSchema, type ActionState } from "@/lib/phase2/validation";

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
    logger.error("phase_3_ceo_lookup_failed", { code: error.code });
    throw new Error("The CEO account could not be verified.");
  }
  return { actorId: data.id, supabase };
}

function optionalFormValue(formData: FormData, name: string) {
  return formData.get(name) ?? "";
}

function workerInput(formData: FormData) {
  return {
    legalName: formData.get("legalName"),
    phoneNumber: formData.get("phoneNumber"),
    alternatePhone: optionalFormValue(formData, "alternatePhone"),
    address: optionalFormValue(formData, "address"),
    nationality: optionalFormValue(formData, "nationality"),
    cnicNumber: optionalFormValue(formData, "cnicNumber"),
    passportNumber: optionalFormValue(formData, "passportNumber"),
    workPermitNumber: optionalFormValue(formData, "workPermitNumber"),
    workPermitIssueDate: optionalFormValue(formData, "workPermitIssueDate"),
    workPermitExpiryDate: optionalFormValue(formData, "workPermitExpiryDate"),
    notes: optionalFormValue(formData, "notes"),
    tradeId: formData.get("tradeId"),
    skillLevelId: formData.get("skillLevelId"),
    foodDeduction: formData.get("foodDeduction"),
    confirmDuplicate: formData.get("confirmDuplicate"),
  };
}

function normalizedIdentifier(value: string | null) {
  return value?.replace(/\s+/g, "").toUpperCase() ?? "";
}

async function findDuplicate(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  cnicNumber: string | null,
  passportNumber: string | null,
  excludeWorkerId?: string,
) {
  const matches = [];
  if (cnicNumber) {
    let query = supabase
      .from("workers")
      .select("id,legal_name")
      .eq("cnic_number", normalizedIdentifier(cnicNumber))
      .limit(1);
    if (excludeWorkerId) query = query.neq("id", excludeWorkerId);
    matches.push(query);
  }
  if (passportNumber) {
    let query = supabase
      .from("workers")
      .select("id,legal_name")
      .eq("passport_number", normalizedIdentifier(passportNumber))
      .limit(1);
    if (excludeWorkerId) query = query.neq("id", excludeWorkerId);
    matches.push(query);
  }
  if (matches.length === 0) return null;

  const results = await Promise.all(matches);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    logger.error("worker_duplicate_lookup_failed", {
      code: failed.error.code,
    });
    throw new Error("Worker identity could not be checked.");
  }
  return results.flatMap((result) => result.data)[0] ?? null;
}

function databaseMessage(error: { code?: string; message: string }) {
  if (error.code === "23P01") {
    return "That effective period overlaps existing worker history.";
  }
  if (error.code === "23505") {
    return "A conflicting current worker record already exists.";
  }
  if (error.code === "P0001") return error.message;
  return "The worker change could not be saved. Please try again.";
}

export async function createWorkerAction(
  _previousState: Phase3ActionState,
  formData: FormData,
): Promise<Phase3ActionState> {
  const result = createWorkerSchema.safeParse({
    ...workerInput(formData),
    employmentStatus: formData.get("employmentStatus"),
    employmentStartsOn: formData.get("employmentStartsOn"),
    hourlyRate: formData.get("hourlyRate"),
    rateStartsOn: formData.get("rateStartsOn"),
    projectId: formData.get("projectId"),
    assignmentStartsOn: formData.get("assignmentStartsOn"),
  });
  if (!result.success) {
    return actionError(
      "Check the highlighted worker details.",
      result.error.flatten().fieldErrors,
    );
  }

  const { supabase } = await getCeoContext();
  const duplicate = await findDuplicate(
    supabase,
    result.data.cnicNumber,
    result.data.passportNumber,
  );
  if (duplicate && !result.data.confirmDuplicate) {
    return {
      status: "error",
      message:
        "A worker with the same CNIC or passport may already exist. Open that record before deciding to continue.",
      duplicateWorkerId: duplicate.id,
      duplicateWorkerName: duplicate.legal_name,
    };
  }

  const { data, error } = await supabase.rpc("create_worker_record", {
    p_address: result.data.address ?? "",
    p_alternate_phone: result.data.alternatePhone ?? "",
    p_assignment_starts_on: result.data.assignmentStartsOn,
    p_cnic_number: normalizedIdentifier(result.data.cnicNumber),
    p_employment_starts_on: result.data.employmentStartsOn,
    p_employment_status: result.data.employmentStatus,
    p_food_deduction_sen: moneyToSen(result.data.foodDeduction),
    p_hourly_rate_sen: moneyToSen(result.data.hourlyRate),
    p_legal_name: result.data.legalName,
    p_nationality: result.data.nationality ?? "",
    p_notes: result.data.notes ?? "",
    p_passport_number: normalizedIdentifier(result.data.passportNumber),
    p_phone_number: result.data.phoneNumber,
    p_project_id: result.data.projectId ?? "",
    p_rate_starts_on: result.data.rateStartsOn,
    p_skill_level_id: result.data.skillLevelId,
    p_trade_id: result.data.tradeId,
    p_work_permit_expiry_date: result.data.workPermitExpiryDate ?? "",
    p_work_permit_issue_date: result.data.workPermitIssueDate ?? "",
    p_work_permit_number: normalizedIdentifier(result.data.workPermitNumber),
  });
  if (error) {
    logger.error("worker_create_failed", { code: error.code });
    return actionError(databaseMessage(error));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/workers");
  revalidatePath("/ceo/projects");
  revalidatePath("/foreman");
  revalidatePath("/foreman/workers");
  redirect(`/ceo/workers/${data}`);
}

export async function updateWorkerAction(
  workerId: string,
  _previousState: Phase3ActionState,
  formData: FormData,
): Promise<Phase3ActionState> {
  const id = uuidSchema.safeParse(workerId);
  const result = updateWorkerSchema.safeParse(workerInput(formData));
  if (!id.success || !result.success) {
    return actionError(
      "Check the highlighted worker details.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }

  const { supabase } = await getCeoContext();
  const duplicate = await findDuplicate(
    supabase,
    result.data.cnicNumber,
    result.data.passportNumber,
    id.data,
  );
  if (duplicate && !result.data.confirmDuplicate) {
    return {
      status: "error",
      message:
        "Another worker has the same CNIC or passport. Review that record before continuing.",
      duplicateWorkerId: duplicate.id,
      duplicateWorkerName: duplicate.legal_name,
    };
  }

  const { error } = await supabase.rpc("edit_worker_profile", {
    p_address: result.data.address ?? "",
    p_alternate_phone: result.data.alternatePhone ?? "",
    p_cnic_number: normalizedIdentifier(result.data.cnicNumber),
    p_food_deduction_sen: moneyToSen(result.data.foodDeduction),
    p_legal_name: result.data.legalName,
    p_nationality: result.data.nationality ?? "",
    p_notes: result.data.notes ?? "",
    p_passport_number: normalizedIdentifier(result.data.passportNumber),
    p_phone_number: result.data.phoneNumber,
    p_skill_level_id: result.data.skillLevelId,
    p_trade_id: result.data.tradeId,
    p_work_permit_expiry_date: result.data.workPermitExpiryDate ?? "",
    p_work_permit_issue_date: result.data.workPermitIssueDate ?? "",
    p_work_permit_number: normalizedIdentifier(result.data.workPermitNumber),
    p_worker_id: id.data,
  });
  if (error) {
    logger.error("worker_update_failed", { code: error.code });
    return actionError(databaseMessage(error));
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/workers");
  revalidatePath(`/ceo/workers/${id.data}`);
  revalidatePath("/foreman/workers");
  return actionSuccess("Worker profile saved.");
}

export async function changeWorkerEmploymentAction(
  workerId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = uuidSchema.safeParse(workerId);
  const result = employmentChangeSchema.safeParse({
    status: formData.get("status"),
    startsOn: formData.get("startsOn"),
    reason: optionalFormValue(formData, "reason"),
  });
  if (!id.success || !result.success) {
    return actionError(
      "Check the employment change.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }
  const { supabase } = await getCeoContext();
  const { error } = await supabase.rpc("set_worker_employment_status", {
    p_reason: result.data.reason ?? "",
    p_starts_on: result.data.startsOn,
    p_status: result.data.status,
    p_worker_id: id.data,
  });
  if (error) return actionError(databaseMessage(error));

  revalidatePath("/ceo");
  revalidatePath("/ceo/workers");
  revalidatePath(`/ceo/workers/${id.data}`);
  revalidatePath("/ceo/projects");
  revalidatePath("/foreman");
  revalidatePath("/foreman/workers");
  return actionSuccess("Employment status changed.");
}

export async function transferWorkerAction(
  workerId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = uuidSchema.safeParse(workerId);
  const result = workerTransferSchema.safeParse({
    projectId: formData.get("projectId"),
    startsOn: formData.get("startsOn"),
  });
  if (!id.success || !result.success) {
    return actionError(
      "Check the assignment details.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }
  const { supabase } = await getCeoContext();
  const { error } = await supabase.rpc("move_worker", {
    p_project_id: result.data.projectId ?? "",
    p_starts_on: result.data.startsOn,
    p_worker_id: id.data,
  });
  if (error) return actionError(databaseMessage(error));

  revalidatePath("/ceo");
  revalidatePath("/ceo/projects");
  revalidatePath("/ceo/workers");
  revalidatePath(`/ceo/workers/${id.data}`);
  revalidatePath("/foreman");
  revalidatePath("/foreman/workers");
  return actionSuccess(
    result.data.projectId
      ? "Worker assignment changed."
      : "Worker is now awaiting assignment.",
  );
}

export async function changeWorkerRateAction(
  workerId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = uuidSchema.safeParse(workerId);
  const result = rateChangeSchema.safeParse({
    hourlyRate: formData.get("hourlyRate"),
    startsOn: formData.get("startsOn"),
  });
  if (!id.success || !result.success) {
    return actionError(
      "Check the rate details.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }
  const { supabase } = await getCeoContext();
  const { error } = await supabase.rpc("set_worker_rate", {
    p_hourly_rate_sen: moneyToSen(result.data.hourlyRate),
    p_starts_on: result.data.startsOn,
    p_worker_id: id.data,
  });
  if (error) return actionError(databaseMessage(error));

  revalidatePath(`/ceo/workers/${id.data}`);
  return actionSuccess("Hourly rate saved with its effective date.");
}

export async function createDocumentTypeAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = documentTypeSchema.safeParse({
    name: formData.get("name"),
    expectsIssueDate: formData.get("expectsIssueDate"),
    expectsExpiryDate: formData.get("expectsExpiryDate"),
  });
  if (!result.success) {
    return actionError(
      "Check the document type.",
      result.error.flatten().fieldErrors,
    );
  }
  const { actorId, supabase } = await getCeoContext();
  const { error } = await supabase.from("document_types").insert({
    created_by: actorId,
    expects_expiry_date: result.data.expectsExpiryDate,
    expects_issue_date: result.data.expectsIssueDate,
    name: result.data.name,
    updated_by: actorId,
  });
  if (error) return actionError(databaseMessage(error));
  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/workers");
  return actionSuccess("Document type added.");
}

export async function setDocumentTypeActiveAction(
  documentTypeId: string,
  isActive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const id = uuidSchema.safeParse(documentTypeId);
  if (!id.success) return actionError("Invalid document type.");
  const { actorId, supabase } = await getCeoContext();
  const { error } = await supabase
    .from("document_types")
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", id.data);
  if (error) return actionError(databaseMessage(error));
  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/workers");
  return actionSuccess(
    isActive ? "Document type restored." : "Document type deactivated.",
  );
}

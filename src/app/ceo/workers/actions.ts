"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedActor } from "@/lib/auth/access";
import {
  bestEffortStorageCleanup,
  uploadWorkerFile,
} from "@/lib/phase3/file-storage";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  dependencyActionMessage,
  isDependencyError,
  recordDependencyFailure,
  throwDependencyError,
} from "@/lib/server/dependency-error";
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
import {
  hasOptionalUploadFailures,
  validateWorkerFile,
} from "@/lib/phase3/files";

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

function optionalFormValue(formData: FormData, name: string) {
  return formData.get(name) ?? "";
}

function workerInput(formData: FormData) {
  let documents: unknown = [];
  try {
    documents = JSON.parse(String(formData.get("documentsJson") ?? "[]"));
  } catch {
    documents = null;
  }
  return {
    legalName: formData.get("legalName"),
    phoneNumber: formData.get("phoneNumber"),
    address: optionalFormValue(formData, "address"),
    nationality: optionalFormValue(formData, "nationality"),
    documents,
    hourlyRate: formData.get("hourlyRate"),
    rateEffectiveOn: optionalFormValue(formData, "rateEffectiveOn"),
    tradeId: formData.get("tradeId"),
    skillLevelId: formData.get("skillLevelId"),
    foodDeduction: formData.get("foodDeduction"),
    confirmDuplicate: formData.get("confirmDuplicate"),
  };
}

async function findDuplicate(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  documents: Array<{
    documentNumber: string | null;
    documentTypeId: string;
  }>,
  excludeWorkerId?: string,
) {
  const result = await supabase.rpc("find_worker_identity_duplicate", {
    p_documents: documents,
    p_exclude_worker_id: excludeWorkerId ?? null,
  });
  if (result.error) {
    throwDependencyError(result.error, {
      dependency: "SUPABASE_DATA",
      operation: "worker_duplicate_lookup",
      operationKind: "read",
      routeFamily: "/ceo/workers",
      surface: "server_action",
    });
  }
  return result.data[0] ?? null;
}

function databaseMessage(
  error: { code?: string; message: string },
  operation: string,
) {
  const failure = recordDependencyFailure(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "write",
    routeFamily: "/ceo/workers",
    surface: "server_action",
  });
  if (failure.category.startsWith("AUTH_") || failure.retryable) {
    return dependencyActionMessage(failure);
  }
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
  return saveWorkerRecord(null, formData, createWorkerSchema);
}

export async function updateWorkerAction(
  workerId: string,
  _previousState: Phase3ActionState,
  formData: FormData,
): Promise<Phase3ActionState> {
  return saveWorkerRecord(workerId, formData, updateWorkerSchema);
}

async function saveWorkerRecord(
  workerId: string | null,
  formData: FormData,
  schema: typeof createWorkerSchema,
): Promise<Phase3ActionState> {
  const id = workerId ? uuidSchema.safeParse(workerId) : null;
  const result = schema.safeParse(workerInput(formData));
  if ((id && !id.success) || !result.success) {
    return actionError(
      "Check the highlighted worker details.",
      result.success ? undefined : result.error.flatten().fieldErrors,
    );
  }

  const preflightFailures = new Map<string, string>();
  for (const document of result.data.documents) {
    const file = formData.get(`documentFile-${document.clientKey}`);
    if (file instanceof File && file.size > 0) {
      const validation = validateWorkerFile(file, "DOCUMENT");
      if (!validation.ok)
        preflightFailures.set(document.clientKey, validation.message);
    }
  }
  const preflightPhoto = formData.get("photoFile");
  if (preflightPhoto instanceof File && preflightPhoto.size > 0) {
    const validation = validateWorkerFile(preflightPhoto, "PHOTO");
    if (!validation.ok) preflightFailures.set("photo", validation.message);
  }

  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  let duplicate;
  try {
    duplicate = await findDuplicate(
      supabase,
      result.data.documents,
      id?.success ? id.data : undefined,
    );
  } catch (error) {
    if (isDependencyError(error)) {
      return actionError(dependencyActionMessage(error));
    }
    throw error;
  }
  if (duplicate && !result.data.confirmDuplicate) {
    return {
      status: "error",
      message:
        "A worker with the same CNIC or Passport may already exist. Review the masked match before deliberately continuing.",
      duplicateWorkerId: duplicate.id,
      duplicateWorkerName: duplicate.legal_name,
    };
  }

  const save = await supabase.rpc("save_worker_record", {
    p_address: result.data.address ?? "",
    p_confirm_duplicate: result.data.confirmDuplicate,
    p_documents: result.data.documents,
    p_food_deduction_sen: moneyToSen(result.data.foodDeduction),
    p_hourly_rate_sen: moneyToSen(result.data.hourlyRate),
    p_legal_name: result.data.legalName,
    p_nationality: result.data.nationality,
    p_phone_number: result.data.phoneNumber,
    p_rate_effective_on: result.data.rateEffectiveOn ?? "",
    p_skill_level_id: result.data.skillLevelId,
    p_trade_id: result.data.tradeId,
    p_worker_id: id?.success ? id.data : "",
  });
  if (save.error) {
    return actionError(databaseMessage(save.error, "worker_record_save"));
  }

  const saved = save.data as {
    documentIds?: Record<string, string>;
    workerId?: string;
  } | null;
  const savedWorkerId = saved?.workerId;
  if (!savedWorkerId)
    return actionError("The saved worker could not be opened.");

  const failures: Array<{ clientKey: string; message: string }> = [
    ...preflightFailures,
  ].map(([clientKey, message]) => ({ clientKey, message }));
  for (const document of result.data.documents) {
    if (document.fileAction === "remove" && document.id) {
      const removal = await supabase.rpc("remove_worker_document", {
        p_document_id: document.id,
        p_remove_document: false,
      });
      if (removal.error) {
        recordDependencyFailure(removal.error, {
          dependency: "SUPABASE_DATA",
          operation: "worker_file_remove",
          operationKind: "write",
          routeFamily: "/ceo/workers",
          surface: "server_action",
        });
        failures.push({
          clientKey: document.clientKey,
          message:
            "The metadata was saved, but the existing file could not be removed.",
        });
      } else {
        await bestEffortStorageCleanup({
          bucketId: removal.data[0]?.bucket_id ?? null,
          objectPath: removal.data[0]?.object_path ?? null,
          supabase,
        });
      }
    }
    const file = formData.get(`documentFile-${document.clientKey}`);
    if (preflightFailures.has(document.clientKey)) continue;
    if (
      document.fileAction !== "replace" ||
      !(file instanceof File) ||
      file.size === 0
    )
      continue;
    const upload = await uploadWorkerFile({
      documentId:
        saved?.documentIds?.[document.clientKey] ?? document.id ?? undefined,
      file,
      kind: "DOCUMENT",
      supabase,
      workerId: savedWorkerId,
    });
    if (!upload.ok) {
      failures.push({ clientKey: document.clientKey, message: upload.message });
    }
  }

  let removedDocumentIds: string[] = [];
  try {
    const parsed = JSON.parse(
      String(formData.get("removedDocumentIds") ?? "[]"),
    );
    if (Array.isArray(parsed)) {
      removedDocumentIds = parsed.filter(
        (value): value is string => uuidSchema.safeParse(value).success,
      );
    }
  } catch {
    removedDocumentIds = [];
  }
  if (removedDocumentIds.length > 0) {
    const removedDocuments = await supabase
      .from("worker_documents")
      .select("bucket_id,object_path")
      .in("id", removedDocumentIds)
      .eq("status", "REMOVED");
    if (removedDocuments.error) {
      recordDependencyFailure(removedDocuments.error, {
        dependency: "SUPABASE_DATA",
        operation: "removed_worker_documents_lookup",
        operationKind: "read",
        routeFamily: "/ceo/workers",
        surface: "server_action",
      });
    }
    for (const document of removedDocuments.data ?? []) {
      await bestEffortStorageCleanup({
        bucketId: document.bucket_id,
        objectPath: document.object_path,
        supabase,
      });
    }
  }

  const photoAction = String(formData.get("photoAction") ?? "keep");
  const currentPhotoId = uuidSchema.safeParse(formData.get("currentPhotoId"));
  if (photoAction === "remove" && currentPhotoId.success) {
    const removal = await supabase.rpc("remove_worker_document", {
      p_document_id: currentPhotoId.data,
      p_remove_document: true,
    });
    if (!removal.error) {
      await bestEffortStorageCleanup({
        bucketId: removal.data[0]?.bucket_id ?? null,
        objectPath: removal.data[0]?.object_path ?? null,
        supabase,
      });
    } else {
      recordDependencyFailure(removal.error, {
        dependency: "SUPABASE_DATA",
        operation: "worker_photo_remove",
        operationKind: "write",
        routeFamily: "/ceo/workers",
        surface: "server_action",
      });
      failures.push({
        clientKey: "photo",
        message:
          "The profile changes were saved, but the photo could not be removed.",
      });
    }
  }
  const photo = formData.get("photoFile");
  if (photoAction === "replace" && photo instanceof File && photo.size > 0) {
    if (preflightFailures.has("photo")) {
      // Metadata is already safely committed; the Review warning offers retry.
    } else {
      const upload = await uploadWorkerFile({
        file: photo,
        kind: "PHOTO",
        supabase,
        workerId: savedWorkerId,
      });
      if (!upload.ok)
        failures.push({ clientKey: "photo", message: upload.message });
    }
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/workers");
  revalidatePath(`/ceo/workers/${savedWorkerId}`);
  revalidatePath("/ceo/projects");
  revalidatePath("/foreman");
  revalidatePath("/foreman/workers");

  return hasOptionalUploadFailures({ failed: failures, uploaded: [] })
    ? {
        status: "success",
        message:
          "Worker metadata was saved, but one or more optional files need retrying in Documents.",
        partialUploadFailures: failures,
        workerId: savedWorkerId,
      }
    : {
        ...actionSuccess(
          workerId ? "Worker changes saved." : "Worker created.",
        ),
        workerId: savedWorkerId,
      };
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
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const { error } = await supabase.rpc("set_worker_employment_status", {
    p_reason: result.data.reason ?? "",
    p_starts_on: result.data.startsOn,
    p_status: result.data.status,
    p_worker_id: id.data,
  });
  if (error)
    return actionError(databaseMessage(error, "worker_employment_change"));

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
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const { error } = await supabase.rpc("move_worker", {
    p_project_id: result.data.projectId ?? "",
    p_starts_on: result.data.startsOn,
    p_worker_id: id.data,
  });
  if (error) return actionError(databaseMessage(error, "worker_transfer"));

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
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const { error } = await supabase.rpc("set_worker_rate", {
    p_hourly_rate_sen: moneyToSen(result.data.hourlyRate),
    p_starts_on: result.data.startsOn,
    p_worker_id: id.data,
  });
  if (error) return actionError(databaseMessage(error, "worker_rate_change"));

  revalidatePath(`/ceo/workers/${id.data}`);
  return actionSuccess("Hourly rate saved with its effective date.");
}

export async function createDocumentTypeAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const result = documentTypeSchema.safeParse({
    name: formData.get("name"),
    expectsDocumentNumber: formData.get("expectsDocumentNumber"),
    expectsIssueDate: formData.get("expectsIssueDate"),
    expectsExpiryDate: formData.get("expectsExpiryDate"),
    isRepeatable: formData.get("isRepeatable"),
  });
  if (!result.success) {
    return actionError(
      "Check the document type.",
      result.error.flatten().fieldErrors,
    );
  }
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase.from("document_types").insert({
    created_by: actorId,
    expects_document_number: result.data.expectsDocumentNumber,
    expects_expiry_date: result.data.expectsExpiryDate,
    expects_issue_date: result.data.expectsIssueDate,
    is_repeatable: result.data.isRepeatable,
    name: result.data.name,
    updated_by: actorId,
  });
  if (error) return actionError(databaseMessage(error, "document_type_create"));
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
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const { error } = await supabase
    .from("document_types")
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", id.data);
  if (error) return actionError(databaseMessage(error, "document_type_status"));
  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/workers");
  return actionSuccess(
    isActive ? "Document type restored." : "Document type deactivated.",
  );
}

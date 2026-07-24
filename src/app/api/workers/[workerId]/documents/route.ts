import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/access";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { documentMetadataSchema } from "@/lib/phase3/validation";
import { uuidSchema } from "@/lib/phase2/validation";

const allowedDocumentTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);
const allowedPhotoTypes = new Set(["image/jpeg", "image/png"]);
const maximumBytes = 10 * 1024 * 1024;

function resultRedirect(request: Request, workerId: string, result: string) {
  return NextResponse.redirect(
    new URL(`/ceo/workers/${workerId}?file=${result}#documents`, request.url),
    303,
  );
}

function safeFilename(filename: string) {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(-120) || "worker-file";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> },
) {
  await requireRole("CEO");
  const { workerId } = await params;
  const parsedWorkerId = uuidSchema.safeParse(workerId);
  if (!parsedWorkerId.success) {
    return new Response("Invalid worker.", { status: 400 });
  }

  const formData = await request.formData();
  const supabase = await createServerSupabaseClient();
  const intent = formData.get("intent");

  if (intent === "remove") {
    const documentId = uuidSchema.safeParse(formData.get("documentId"));
    if (!documentId.success) {
      return resultRedirect(request, workerId, "invalid");
    }
    const { data: document, error: lookupError } = await supabase
      .from("worker_documents")
      .select("id,worker_id")
      .eq("id", documentId.data)
      .eq("worker_id", parsedWorkerId.data)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (lookupError || !document) {
      return resultRedirect(request, workerId, "invalid");
    }

    const { data, error } = await supabase.rpc("remove_worker_file", {
      p_document_id: document.id,
    });
    if (error || !data[0]) {
      logger.error("worker_file_remove_failed", { code: error?.code });
      return resultRedirect(request, workerId, "failed");
    }

    const cleanup = await supabase.storage
      .from(data[0].bucket_id)
      .remove([data[0].object_path]);
    if (cleanup.error) {
      logger.error("worker_file_storage_cleanup_failed", {
        code: cleanup.error.name,
      });
    }
    revalidatePath(`/ceo/workers/${workerId}`);
    return resultRedirect(
      request,
      workerId,
      cleanup.error ? "removed-cleanup-warning" : "removed",
    );
  }

  const metadata = documentMetadataSchema.safeParse({
    fileKind: formData.get("fileKind"),
    documentTypeId: formData.get("documentTypeId"),
    documentNumber: formData.get("documentNumber"),
    issueDate: formData.get("issueDate"),
    expiryDate: formData.get("expiryDate"),
    replaceDocumentId: formData.get("replaceDocumentId"),
  });
  const file = formData.get("file");
  if (!metadata.success || !(file instanceof File)) {
    return resultRedirect(request, workerId, "invalid");
  }

  const allowedTypes =
    metadata.data.fileKind === "PHOTO"
      ? allowedPhotoTypes
      : allowedDocumentTypes;
  if (
    file.size < 1 ||
    file.size > maximumBytes ||
    !allowedTypes.has(file.type)
  ) {
    return resultRedirect(request, workerId, "invalid");
  }

  const { data: worker, error: workerError } = await supabase
    .from("workers")
    .select("id")
    .eq("id", parsedWorkerId.data)
    .maybeSingle();
  if (workerError || !worker) {
    return resultRedirect(request, workerId, "invalid");
  }

  if (metadata.data.documentTypeId) {
    const { data: documentType, error: typeError } = await supabase
      .from("document_types")
      .select("expects_issue_date,expects_expiry_date")
      .eq("id", metadata.data.documentTypeId)
      .eq("is_active", true)
      .maybeSingle();
    if (
      typeError ||
      !documentType ||
      (documentType.expects_issue_date && !metadata.data.issueDate) ||
      (documentType.expects_expiry_date && !metadata.data.expiryDate)
    ) {
      return resultRedirect(request, workerId, "invalid");
    }
  }

  const fileId = randomUUID();
  const bucketId =
    metadata.data.fileKind === "PHOTO" ? "worker-photos" : "worker-documents";
  const objectPath = `${worker.id}/${fileId}-${safeFilename(file.name)}`;
  const upload = await supabase.storage
    .from(bucketId)
    .upload(objectPath, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (upload.error) {
    logger.error("worker_file_upload_failed", { code: upload.error.name });
    return resultRedirect(request, workerId, "failed");
  }

  const { error } = await supabase.rpc("register_worker_file", {
    p_bucket_id: bucketId,
    p_byte_size: file.size,
    p_document_number: metadata.data.documentNumber ?? "",
    p_document_type_id: metadata.data.documentTypeId ?? "",
    p_expiry_date: metadata.data.expiryDate ?? "",
    p_file_kind: metadata.data.fileKind,
    p_id: fileId,
    p_issue_date: metadata.data.issueDate ?? "",
    p_mime_type: file.type,
    p_object_path: objectPath,
    p_original_filename: file.name,
    p_replace_document_id: metadata.data.replaceDocumentId ?? "",
    p_worker_id: worker.id,
  });
  if (error) {
    await supabase.storage.from(bucketId).remove([objectPath]);
    logger.error("worker_file_metadata_failed", { code: error.code });
    return resultRedirect(request, workerId, "failed");
  }

  revalidatePath(`/ceo/workers/${workerId}`);
  revalidatePath("/ceo/workers");
  revalidatePath("/ceo");
  return resultRedirect(
    request,
    workerId,
    metadata.data.replaceDocumentId ? "replaced" : "uploaded",
  );
}

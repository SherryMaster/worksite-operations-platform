import "server-only";

import { randomUUID } from "node:crypto";

import {
  safeWorkerFilename,
  validateWorkerFile,
  type WorkerFileKind,
} from "@/lib/phase3/files";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

export async function uploadWorkerFile({
  documentId,
  file,
  kind,
  supabase,
  workerId,
}: {
  documentId?: string;
  file: File;
  kind: WorkerFileKind;
  supabase: SupabaseClient;
  workerId: string;
}) {
  const validation = validateWorkerFile(file, kind);
  if (!validation.ok) return validation;

  const fileId = randomUUID();
  const bucketId = kind === "PHOTO" ? "worker-photos" : "worker-documents";
  const objectPath = `${workerId}/${fileId}-${safeWorkerFilename(file.name)}`;
  const upload = await supabase.storage
    .from(bucketId)
    .upload(objectPath, await file.arrayBuffer(), {
      contentType: validation.descriptor.mimeType,
      upsert: false,
    });
  if (upload.error) {
    logger.error("worker_file_upload_failed", { code: upload.error.name });
    return {
      message: "The optional file could not be uploaded.",
      ok: false,
    } as const;
  }

  const registration = await supabase.rpc("attach_worker_file", {
    p_bucket_id: bucketId,
    p_byte_size: file.size,
    p_document_id: documentId ?? "",
    p_file_kind: kind,
    p_id: fileId,
    p_mime_type: validation.descriptor.mimeType,
    p_object_path: objectPath,
    p_original_filename: file.name,
    p_worker_id: workerId,
  });
  if (registration.error) {
    await supabase.storage.from(bucketId).remove([objectPath]);
    logger.error("worker_file_registration_failed", {
      code: registration.error.code,
    });
    return {
      message:
        "The metadata was saved, but the optional file could not be attached.",
      ok: false,
    } as const;
  }

  return { documentId: registration.data, ok: true } as const;
}

export async function bestEffortStorageCleanup({
  bucketId,
  objectPath,
  supabase,
}: {
  bucketId: string | null;
  objectPath: string | null;
  supabase: SupabaseClient;
}) {
  if (!bucketId || !objectPath) return true;
  const cleanup = await supabase.storage.from(bucketId).remove([objectPath]);
  if (cleanup.error) {
    logger.error("worker_file_storage_cleanup_failed", {
      code: cleanup.error.name,
    });
    return false;
  }
  return true;
}

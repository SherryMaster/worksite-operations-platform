import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { requireRoleForRouteHandler } from "@/lib/auth/access";
import {
  bestEffortStorageCleanup,
  uploadWorkerFile,
} from "@/lib/phase3/file-storage";
import { documentMetadataSchema } from "@/lib/phase3/validation";
import { validateWorkerFile } from "@/lib/phase3/files";
import { uuidSchema } from "@/lib/phase2/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isRecoverableDependencyFailure,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

function resultRedirect(
  request: Request,
  workerId: string,
  result: string,
  reference?: string,
) {
  const destination = new URL(
    `/ceo/workers/${workerId}?section=documents&file=${result}`,
    request.url,
  );
  if (reference) destination.searchParams.set("reference", reference);
  return NextResponse.redirect(destination, 303);
}

async function updateWorkerDocuments(
  request: Request,
  { params }: { params: Promise<{ workerId: string }> },
) {
  await requireRoleForRouteHandler("CEO");
  const { workerId } = await params;
  const parsedWorkerId = uuidSchema.safeParse(workerId);
  if (!parsedWorkerId.success) {
    return new Response("Invalid worker.", { status: 400 });
  }

  const formData = await request.formData();
  const supabase = await createServerSupabaseClient();
  const intent = String(formData.get("intent") ?? "save");

  if (["remove", "remove-document", "remove-file"].includes(intent)) {
    const documentId = uuidSchema.safeParse(formData.get("documentId"));
    if (!documentId.success)
      return resultRedirect(request, workerId, "invalid");
    const document = await supabase
      .from("worker_documents")
      .select("id,worker_id")
      .eq("id", documentId.data)
      .eq("worker_id", parsedWorkerId.data)
      .eq("status", "ACTIVE")
      .maybeSingle();
    if (document.error) {
      const failure = recordDependencyFailure(document.error, {
        dependency: "SUPABASE_DATA",
        operation: "worker_document_remove_lookup",
        operationKind: "write",
        routeFamily: "/api/workers/[workerId]/documents",
        surface: "route_handler",
      });
      if (isRecoverableDependencyFailure(failure)) {
        return resultRedirect(request, workerId, "recovery", failure.digest);
      }
    }
    if (document.error || !document.data) {
      return resultRedirect(request, workerId, "invalid");
    }

    const removal = await supabase.rpc("remove_worker_document", {
      p_document_id: document.data.id,
      p_remove_document: intent !== "remove-file",
    });
    if (removal.error || !removal.data[0]) {
      if (removal.error) {
        const failure = recordDependencyFailure(removal.error, {
          dependency: "SUPABASE_DATA",
          operation: "worker_document_remove",
          operationKind: "write",
          routeFamily: "/api/workers/[workerId]/documents",
          surface: "route_handler",
        });
        if (isRecoverableDependencyFailure(failure)) {
          return resultRedirect(request, workerId, "recovery", failure.digest);
        }
      }
      return resultRedirect(request, workerId, "failed");
    }
    const cleaned = await bestEffortStorageCleanup({
      bucketId: removal.data[0].bucket_id,
      objectPath: removal.data[0].object_path,
      supabase,
    });
    revalidateWorker(workerId);
    return resultRedirect(
      request,
      workerId,
      cleaned
        ? intent === "remove-file"
          ? "file-removed"
          : "removed"
        : "removed-cleanup-warning",
    );
  }

  const metadata = documentMetadataSchema.safeParse({
    documentNumber: formData.get("documentNumber"),
    documentTypeId: formData.get("documentTypeId"),
    expiryDate: formData.get("expiryDate"),
    fileKind: formData.get("fileKind"),
    issueDate: formData.get("issueDate"),
    metadata: formData.get("metadata"),
    replaceDocumentId: formData.get("replaceDocumentId"),
  });
  if (!metadata.success) return resultRedirect(request, workerId, "invalid");

  const worker = await supabase
    .from("workers")
    .select("id")
    .eq("id", parsedWorkerId.data)
    .maybeSingle();
  if (worker.error) {
    const failure = recordDependencyFailure(worker.error, {
      dependency: "SUPABASE_DATA",
      operation: "worker_document_worker_lookup",
      operationKind: "read",
      routeFamily: "/api/workers/[workerId]/documents",
      surface: "route_handler",
    });
    if (isRecoverableDependencyFailure(failure)) {
      return resultRedirect(request, workerId, "recovery", failure.digest);
    }
  }
  if (worker.error || !worker.data)
    return resultRedirect(request, workerId, "invalid");

  const file = formData.get("file");
  const hasFile = file instanceof File && file.size > 0;
  const fileValidation = hasFile
    ? validateWorkerFile(file, metadata.data.fileKind)
    : null;
  if (metadata.data.fileKind === "PHOTO") {
    if (!hasFile || !fileValidation?.ok)
      return resultRedirect(request, workerId, "invalid");
    const upload = await uploadWorkerFile({
      file,
      kind: "PHOTO",
      supabase,
      workerId: worker.data.id,
    });
    if (!upload.ok) return resultRedirect(request, workerId, "failed");
    revalidateWorker(workerId);
    return resultRedirect(request, workerId, "photo-saved");
  }

  const type = await supabase
    .from("document_types")
    .select(
      "expects_document_number,expects_issue_date,expects_expiry_date,is_active",
    )
    .eq("id", metadata.data.documentTypeId!)
    .maybeSingle();
  if (
    type.error ||
    !type.data?.is_active ||
    (type.data.expects_document_number && !metadata.data.documentNumber) ||
    (type.data.expects_issue_date && !metadata.data.issueDate) ||
    (type.data.expects_expiry_date && !metadata.data.expiryDate)
  ) {
    if (type.error) {
      const failure = recordDependencyFailure(type.error, {
        dependency: "SUPABASE_DATA",
        operation: "worker_document_type_lookup",
        operationKind: "read",
        routeFamily: "/api/workers/[workerId]/documents",
        surface: "route_handler",
      });
      if (isRecoverableDependencyFailure(failure)) {
        return resultRedirect(request, workerId, "recovery", failure.digest);
      }
    }
    return resultRedirect(request, workerId, "invalid");
  }

  const saved = await supabase.rpc("save_worker_document_metadata", {
    p_confirm_duplicate: formData.get("confirmDuplicate") === "yes",
    p_document_id: metadata.data.replaceDocumentId ?? "",
    p_document_number: metadata.data.documentNumber ?? "",
    p_document_type_id: metadata.data.documentTypeId!,
    p_expiry_date: metadata.data.expiryDate ?? "",
    p_issue_date: metadata.data.issueDate ?? "",
    p_metadata: metadata.data.metadata,
    p_worker_id: worker.data.id,
  });
  if (saved.error) {
    const failure = recordDependencyFailure(saved.error, {
      dependency: "SUPABASE_DATA",
      operation: "worker_document_metadata_save",
      operationKind: "write",
      routeFamily: "/api/workers/[workerId]/documents",
      surface: "route_handler",
    });
    if (isRecoverableDependencyFailure(failure)) {
      return resultRedirect(request, workerId, "recovery", failure.digest);
    }
    return resultRedirect(request, workerId, "invalid");
  }

  if (hasFile) {
    if (!fileValidation?.ok) {
      revalidateWorker(workerId);
      return resultRedirect(request, workerId, "metadata-saved-upload-failed");
    }
    const upload = await uploadWorkerFile({
      documentId: saved.data,
      file,
      kind: "DOCUMENT",
      supabase,
      workerId: worker.data.id,
    });
    if (!upload.ok) {
      revalidateWorker(workerId);
      return resultRedirect(request, workerId, "metadata-saved-upload-failed");
    }
  }

  revalidateWorker(workerId);
  return resultRedirect(
    request,
    workerId,
    hasFile ? "document-saved" : "metadata-saved",
  );
}

export const POST = withDependencyRouteHandler(updateWorkerDocuments, {
  operation: "worker_documents_update",
  operationKind: "write",
  routeFamily: "/api/workers/[workerId]/documents",
  surface: "route_handler",
});

function revalidateWorker(workerId: string) {
  revalidatePath(`/ceo/workers/${workerId}`);
  revalidatePath(`/foreman/workers/${workerId}`);
  revalidatePath("/ceo/workers");
  revalidatePath("/foreman/workers");
  revalidatePath("/ceo");
}

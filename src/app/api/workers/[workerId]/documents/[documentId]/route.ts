import { NextResponse } from "next/server";

import { requireSignedInForRouteHandler } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/phase2/validation";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

async function getWorkerDocument(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ documentId: string; workerId: string }>;
  },
) {
  await requireSignedInForRouteHandler();

  const values = await params;
  const workerId = uuidSchema.safeParse(values.workerId);
  const documentId = uuidSchema.safeParse(values.documentId);
  if (!workerId.success || !documentId.success) {
    return new Response("File not found.", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: document, error } = await supabase
    .from("worker_documents")
    .select("bucket_id,file_kind,object_path,original_filename")
    .eq("id", documentId.data)
    .eq("worker_id", workerId.data)
    .maybeSingle();
  if (error) {
    throwDependencyError(error, {
      dependency: "SUPABASE_DATA",
      operation: "worker_document_lookup",
      operationKind: "read",
      routeFamily: "/api/workers/[workerId]/documents/[documentId]",
      surface: "route_handler",
    });
  }
  if (
    !document ||
    !document.bucket_id ||
    !document.object_path ||
    !document.original_filename
  ) {
    return new Response("File not found or no longer authorized.", {
      status: 404,
    });
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(document.bucket_id)
    .createSignedUrl(
      document.object_path,
      60,
      document.file_kind === "DOCUMENT"
        ? { download: document.original_filename }
        : undefined,
    );
  if (signedError) {
    throwDependencyError(signedError, {
      dependency: "SUPABASE_STORAGE",
      operation: "worker_document_signed_url",
      operationKind: "read",
      routeFamily: "/api/workers/[workerId]/documents/[documentId]",
      surface: "storage",
    });
  }

  return NextResponse.redirect(signed.signedUrl, 307);
}

export const GET = withDependencyRouteHandler(getWorkerDocument, {
  operation: "worker_document_download",
  routeFamily: "/api/workers/[workerId]/documents/[documentId]",
  surface: "route_handler",
});

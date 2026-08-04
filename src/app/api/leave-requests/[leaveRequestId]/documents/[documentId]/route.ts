import { NextResponse } from "next/server";

import { requireSignedInForRouteHandler } from "@/lib/auth/access";
import { uuidSchema } from "@/lib/phase2/validation";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function getLeaveDocument(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ documentId: string; leaveRequestId: string }>;
  },
) {
  await requireSignedInForRouteHandler();
  const values = await params;
  const requestId = uuidSchema.safeParse(values.leaveRequestId);
  const documentId = uuidSchema.safeParse(values.documentId);
  if (!requestId.success || !documentId.success) {
    return new Response("File not found.", { status: 404 });
  }

  const supabase = await createServerSupabaseClient();
  const document = await supabase
    .from("leave_request_documents")
    .select("bucket_id,object_path,original_filename")
    .eq("id", documentId.data)
    .eq("leave_request_id", requestId.data)
    .maybeSingle();
  if (document.error) {
    throwDependencyError(document.error, {
      dependency: "SUPABASE_DATA",
      operation: "leave_document_lookup",
      operationKind: "read",
      routeFamily:
        "/api/leave-requests/[leaveRequestId]/documents/[documentId]",
      surface: "route_handler",
    });
  }
  if (!document.data) {
    return new Response("File not found or no longer authorized.", {
      status: 404,
    });
  }
  const signed = await supabase.storage
    .from(document.data.bucket_id)
    .createSignedUrl(document.data.object_path, 60, {
      download: document.data.original_filename,
    });
  if (signed.error) {
    throwDependencyError(signed.error, {
      dependency: "SUPABASE_STORAGE",
      operation: "leave_document_signed_url",
      operationKind: "read",
      routeFamily:
        "/api/leave-requests/[leaveRequestId]/documents/[documentId]",
      surface: "storage",
    });
  }
  return NextResponse.redirect(signed.data.signedUrl, 307);
}

export const GET = withDependencyRouteHandler(getLeaveDocument, {
  operation: "leave_document_download",
  routeFamily: "/api/leave-requests/[leaveRequestId]/documents/[documentId]",
  surface: "route_handler",
});

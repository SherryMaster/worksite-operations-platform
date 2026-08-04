import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import {
  getCurrentAccessForRouteHandler,
  getAuthorizedActor,
} from "@/lib/auth/access";
import { leaveSubmissionSchema } from "@/lib/phase5/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isRecoverableDependencyFailure,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumBytes = 10 * 1024 * 1024;

function redirectResult(
  request: Request,
  role: "CEO" | "FOREMAN",
  result: string,
  reference?: string,
) {
  const destination = role === "CEO" ? "/ceo/leave" : "/foreman/leave";
  const url = new URL(`${destination}?result=${result}`, request.url);
  if (reference) url.searchParams.set("reference", reference);
  return NextResponse.redirect(url, 303);
}

async function submitLeaveRequest(request: Request) {
  const access = await getCurrentAccessForRouteHandler();
  if (access.status !== "AUTHORIZED" || !access.role) {
    return new Response("Active application access is required.", {
      status: 403,
    });
  }
  const role = access.role;
  const formData = await request.formData();
  const parsed = leaveSubmissionSchema.safeParse({
    endsOn: formData.get("endsOn"),
    leaveTypeId: formData.get("leaveTypeId"),
    notes: formData.get("notes"),
    projectId: formData.get("projectId"),
    reason: formData.get("reason"),
    startsOn: formData.get("startsOn"),
    workerId: formData.get("workerId"),
  });
  const fileValue = formData.get("file");
  const file =
    fileValue instanceof File && fileValue.size > 0 ? fileValue : null;
  if (
    !parsed.success ||
    (file &&
      (file.size > maximumBytes ||
        !allowedTypes.has(file.type) ||
        file.name.length > 255))
  ) {
    return redirectResult(request, role, "invalid");
  }

  const supabase = await createServerSupabaseClient();
  const submission = await supabase.rpc("submit_leave_request", {
    p_ends_on: parsed.data.endsOn,
    p_leave_type_id: parsed.data.leaveTypeId,
    p_notes: parsed.data.notes ?? "",
    p_project_id: parsed.data.projectId,
    p_reason: parsed.data.reason ?? "",
    p_starts_on: parsed.data.startsOn,
    p_worker_id: parsed.data.workerId,
  });
  if (submission.error) {
    const failure = recordDependencyFailure(submission.error, {
      dependency: "SUPABASE_DATA",
      operation: "leave_request_submit",
      operationKind: "write",
      routeFamily: "/api/leave-requests",
      surface: "route_handler",
    });
    if (isRecoverableDependencyFailure(failure)) {
      return redirectResult(request, role, "recovery", failure.digest);
    }
    return redirectResult(
      request,
      role,
      ["P0001", "23P01"].includes(submission.error.code)
        ? "conflict"
        : "failed",
    );
  }

  if (file) {
    const documentId = randomUUID();
    const objectPath = `${submission.data}/${documentId}`;
    const upload = await supabase.storage
      .from("leave-documents")
      .upload(objectPath, await file.arrayBuffer(), {
        contentType: file.type,
        upsert: false,
      });
    if (upload.error) {
      recordDependencyFailure(upload.error, {
        dependency: "SUPABASE_STORAGE",
        operation: "leave_document_upload",
        operationKind: "write",
        routeFamily: "/api/leave-requests",
        surface: "storage",
      });
      return redirectResult(request, role, "submitted-file-failed");
    }

    const actor = await getAuthorizedActor(role);
    const metadata = actor.actorId
      ? await supabase.from("leave_request_documents").insert({
          id: documentId,
          leave_request_id: submission.data,
          mime_type: file.type,
          object_path: objectPath,
          original_filename: file.name,
          size_bytes: file.size,
          uploaded_by: actor.actorId,
        })
      : { error: new Error("Actor not found") };
    if (metadata.error) {
      const cleanup = await supabase.storage
        .from("leave-documents")
        .remove([objectPath]);
      if (cleanup.error) {
        recordDependencyFailure(cleanup.error, {
          dependency: "SUPABASE_STORAGE",
          idempotent: true,
          operation: "leave_document_cleanup",
          operationKind: "write",
          routeFamily: "/api/leave-requests",
          surface: "storage",
        });
      }
      recordDependencyFailure(metadata.error, {
        dependency: "SUPABASE_DATA",
        operation: "leave_document_metadata",
        operationKind: "write",
        routeFamily: "/api/leave-requests",
        surface: "route_handler",
      });
      return redirectResult(request, role, "submitted-file-failed");
    }
  }

  revalidatePath("/ceo");
  revalidatePath("/ceo/leave");
  revalidatePath("/ceo/projects");
  revalidatePath("/ceo/workers");
  revalidatePath("/foreman/leave");
  return redirectResult(request, role, "submitted");
}

export const POST = withDependencyRouteHandler(submitLeaveRequest, {
  operation: "leave_request_submit",
  operationKind: "write",
  routeFamily: "/api/leave-requests",
  surface: "route_handler",
});

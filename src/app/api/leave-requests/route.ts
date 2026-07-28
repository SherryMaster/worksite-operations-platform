import { randomUUID } from "node:crypto";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { getCurrentAccess } from "@/lib/auth/access";
import { leaveSubmissionSchema } from "@/lib/phase5/validation";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
const maximumBytes = 10 * 1024 * 1024;

function redirectResult(
  request: Request,
  role: "CEO" | "FOREMAN",
  result: string,
) {
  const destination = role === "CEO" ? "/ceo/leave" : "/foreman/leave";
  return NextResponse.redirect(
    new URL(`${destination}?result=${result}`, request.url),
    303,
  );
}

export async function POST(request: Request) {
  const access = await getCurrentAccess();
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
    logger.error("leave_submit_failed", { code: submission.error.code });
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
      logger.error("leave_document_upload_failed", {
        code: upload.error.name,
      });
      return redirectResult(request, role, "submitted-file-failed");
    }

    const { userId } = await auth();
    const actor = await supabase
      .from("application_users")
      .select("id")
      .eq("clerk_user_id", userId!)
      .maybeSingle();
    const metadata = actor.data
      ? await supabase.from("leave_request_documents").insert({
          id: documentId,
          leave_request_id: submission.data,
          mime_type: file.type,
          object_path: objectPath,
          original_filename: file.name,
          size_bytes: file.size,
          uploaded_by: actor.data.id,
        })
      : { error: new Error("Actor not found") };
    if (metadata.error) {
      await supabase.storage.from("leave-documents").remove([objectPath]);
      logger.error("leave_document_metadata_failed", {
        code: "code" in metadata.error ? metadata.error.code : undefined,
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

import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleForRouteHandler } from "@/lib/auth/access";
import { safeWorkerFilename, validateWorkerFile } from "@/lib/phase3/files";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

const fileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  type: z.string().trim().min(1).max(150),
});

const requestSchema = z.object({
  files: z.array(fileSchema).max(100),
});

async function prepareImportUploads(request: Request) {
  await requireRoleForRouteHandler("CEO");
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (
    !parsed.success ||
    parsed.data.files.some((file) => !validateWorkerFile(file, "DOCUMENT").ok)
  ) {
    return NextResponse.json(
      {
        message:
          "Attach no more than 100 allowed business files of up to 10 MB each.",
      },
      { status: 400 },
    );
  }

  const duplicateNames = parsed.data.files.filter(
    (file, index, files) =>
      files.findIndex(
        (other) =>
          other.name.toLocaleLowerCase() === file.name.toLocaleLowerCase(),
      ) !== index,
  );
  if (duplicateNames.length > 0) {
    return NextResponse.json(
      { message: "Every attached document file name must be unique." },
      { status: 400 },
    );
  }

  const batchId = randomUUID();
  const supabase = await createServerSupabaseClient();
  const uploads = [];
  for (const file of parsed.data.files) {
    const id = randomUUID();
    const path = `imports/${batchId}/${id}-${safeWorkerFilename(file.name)}`;
    const signed = await supabase.storage
      .from("worker-documents")
      .createSignedUploadUrl(path);
    if (signed.error) {
      throwDependencyError(signed.error, {
        dependency: "SUPABASE_STORAGE",
        operation: "import_signed_upload_create",
        operationKind: "write",
        routeFamily: "/api/imports/uploads",
        surface: "storage",
      });
    }
    uploads.push({
      id,
      name: file.name,
      path,
      size: file.size,
      token: signed.data.token,
      type: file.type,
    });
  }

  return NextResponse.json({ batchId, uploads });
}

export const POST = withDependencyRouteHandler(prepareImportUploads, {
  operation: "import_uploads",
  operationKind: "write",
  routeFamily: "/api/imports/uploads",
  surface: "route_handler",
});

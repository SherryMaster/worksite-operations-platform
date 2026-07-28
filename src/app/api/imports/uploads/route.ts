import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/access";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const fileSchema = z.object({
  name: z.string().trim().min(1).max(255),
  size: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  type: z.enum(["application/pdf", "image/jpeg", "image/png"]),
});

const requestSchema = z.object({
  files: z.array(fileSchema).max(100),
});

function safeFilename(filename: string) {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(-120) || "import-file";
}

export async function POST(request: Request) {
  await requireRole("CEO");
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        message:
          "Attach no more than 100 PDF, JPEG, or PNG files of up to 10 MB each.",
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
    const path = `imports/${batchId}/${id}-${safeFilename(file.name)}`;
    const signed = await supabase.storage
      .from("worker-documents")
      .createSignedUploadUrl(path);
    if (signed.error) {
      logger.error("import_signed_upload_create_failed", {
        code: signed.error.name,
      });
      return NextResponse.json(
        { message: "A secure document upload could not be prepared." },
        { status: 500 },
      );
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

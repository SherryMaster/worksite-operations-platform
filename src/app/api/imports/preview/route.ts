import { createHash, randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRole } from "@/lib/auth/access";
import { validateWorkerFile } from "@/lib/phase3/files";
import {
  parseImportWorkbook,
  type ImportIssue,
  type ImportLookup,
} from "@/lib/phase7/import-workbook";
import { recordPhase7AuditEvent } from "@/lib/phase7/audit";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

const workbookMime =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const maximumWorkbookBytes = 3 * 1024 * 1024;
const stagedFilesSchema = z
  .array(
    z.object({
      id: z.string().uuid(),
      name: z.string().trim().min(1).max(255),
      path: z.string().min(20).max(500),
      size: z
        .number()
        .int()
        .min(1)
        .max(10 * 1024 * 1024),
      type: z.string().trim().min(1).max(150),
    }),
  )
  .max(100);

export async function POST(request: Request) {
  await requireRole("CEO");
  const formData = await request.formData();
  const parsedBatchId = z.string().uuid().safeParse(formData.get("batchId"));
  let stagedInput: unknown = [];
  try {
    stagedInput = JSON.parse(String(formData.get("stagedDocuments") ?? "[]"));
  } catch {
    stagedInput = null;
  }
  const parsedStaged = stagedFilesSchema.safeParse(stagedInput);
  if (
    !parsedStaged.success ||
    (parsedStaged.success &&
      parsedStaged.data.some(
        (file) => !validateWorkerFile(file, "DOCUMENT").ok,
      )) ||
    (parsedStaged.data.length > 0 && !parsedBatchId.success)
  ) {
    return NextResponse.json(
      { message: "The secure document upload references are invalid." },
      { status: 400 },
    );
  }
  const batchId = parsedBatchId.success ? parsedBatchId.data : randomUUID();
  const stagedFiles = parsedStaged.data;
  const uploadedPaths = stagedFiles.map((file) => file.path);
  const supabase = await createServerSupabaseClient();
  const cleanupUploads = async () => {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("worker-documents").remove(uploadedPaths);
    }
  };
  if (
    stagedFiles.some(
      (file) => !file.path.startsWith(`imports/${batchId}/${file.id}-`),
    )
  ) {
    return NextResponse.json(
      { message: "A secure document upload reference is out of scope." },
      { status: 400 },
    );
  }

  const workbookFile = formData.get("workbook");
  if (
    !(workbookFile instanceof File) ||
    !workbookFile.name.toLocaleLowerCase().endsWith(".xlsx") ||
    (workbookFile.type && workbookFile.type !== workbookMime) ||
    workbookFile.size < 1 ||
    workbookFile.size > maximumWorkbookBytes
  ) {
    await cleanupUploads();
    return NextResponse.json(
      { message: "Choose a valid .xlsx workbook no larger than 3 MB." },
      { status: 400 },
    );
  }

  const source = Buffer.from(await workbookFile.arrayBuffer());
  const checksum = createHash("sha256").update(source).digest("hex");
  const committed = await supabase
    .from("migration_batches")
    .select("id,file_name,committed_at,summary")
    .eq("file_checksum", checksum)
    .eq("status", "COMMITTED")
    .maybeSingle();
  if (committed.error) {
    await cleanupUploads();
    logger.error("import_checksum_lookup_failed", {
      code: committed.error.code,
    });
    return NextResponse.json(
      { message: "The workbook could not be checked for prior imports." },
      { status: 500 },
    );
  }
  if (committed.data) {
    await cleanupUploads();
    return NextResponse.json(
      {
        committedAt: committed.data.committed_at,
        message: `This exact workbook was already imported as “${committed.data.file_name}”. No duplicate rows were created.`,
        priorBatchId: committed.data.id,
        summary: committed.data.summary,
      },
      { status: 409 },
    );
  }

  const [projects, identityDocuments, trades, skills, documentTypes] =
    await Promise.all([
      supabase.from("projects").select("name,client_name"),
      supabase
        .from("worker_documents")
        .select("document_number,document_type_id")
        .eq("status", "ACTIVE")
        .not("document_number", "is", null),
      supabase.from("trades").select("name").eq("is_active", true),
      supabase.from("skill_levels").select("name").eq("is_active", true),
      supabase
        .from("document_types")
        .select(
          "id,name,system_code,expects_document_number,expects_issue_date,expects_expiry_date",
        )
        .eq("is_active", true),
    ]);
  for (const [operation, response] of [
    ["projects", projects],
    ["worker_identity_documents", identityDocuments],
    ["trades", trades],
    ["skills", skills],
    ["document_types", documentTypes],
  ] as const) {
    if (response.error) {
      await cleanupUploads();
      logger.error("import_lookup_failed", {
        code: response.error.code,
        operation,
      });
      return NextResponse.json(
        { message: "Import reference data could not be loaded." },
        { status: 500 },
      );
    }
  }

  const lookup: ImportLookup = {
    documentTypes: (documentTypes.data ?? []).map((item) => ({
      expectsDocumentNumber: item.expects_document_number,
      expectsExpiryDate: item.expects_expiry_date,
      expectsIssueDate: item.expects_issue_date,
      name: item.name,
    })),
    existingProjectIdentities: (projects.data ?? []).map(
      (project) =>
        `${project.name.trim().toLocaleLowerCase()}|${project.client_name.trim().toLocaleLowerCase()}`,
    ),
    existingWorkerIdentifiers: (identityDocuments.data ?? [])
      .filter((document) =>
        (documentTypes.data ?? []).some(
          (type) =>
            type.id === document.document_type_id &&
            ["CNIC", "PASSPORT"].includes(type.system_code ?? ""),
        ),
      )
      .flatMap((document) =>
        document.document_number
          ? [
              document.document_number
                .replace(/[^A-Z0-9]+/gi, "")
                .toLocaleUpperCase(),
            ]
          : [],
      ),
    skillNames: (skills.data ?? []).map((item) => item.name),
    tradeNames: (trades.data ?? []).map((item) => item.name),
  };

  let parsed;
  try {
    parsed = await parseImportWorkbook(source, lookup);
  } catch (error) {
    await cleanupUploads();
    logger.warn("import_workbook_parse_failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        message:
          "The workbook could not be read. Download a fresh template and copy the source data into it.",
      },
      { status: 400 },
    );
  }

  const stagedByName = new Map(
    stagedFiles.map((file) => [file.name.toLocaleLowerCase(), file]),
  );
  const attachmentIssues: ImportIssue[] = [];
  if (stagedByName.size !== stagedFiles.length) {
    for (const file of stagedFiles) {
      attachmentIssues.push({
        field: "Document Files",
        message: `The staged file name “${file.name}” is repeated.`,
        row: 0,
        sheet: "Attachments",
      });
    }
  }
  const requestedNames = new Set(
    parsed.payload.documents.map((item) => item.fileName.toLocaleLowerCase()),
  );
  for (const document of parsed.payload.documents) {
    if (!stagedByName.has(document.fileName.toLocaleLowerCase())) {
      attachmentIssues.push({
        field: "File Name",
        message: `Attach “${document.fileName}” to match this document row.`,
        row: 0,
        sheet: "WorkerDocuments",
      });
    }
  }
  for (const file of stagedFiles) {
    if (!requestedNames.has(file.name.toLocaleLowerCase())) {
      attachmentIssues.push({
        field: file.name,
        message:
          "This attached file has no matching WorkerDocuments row and will not be uploaded.",
        row: 0,
        sheet: "Attachments",
      });
    }
  }
  parsed.issues.push(...attachmentIssues);

  const stagedDocuments =
    parsed.issues.length === 0
      ? parsed.payload.documents.map((document) => {
          const file = stagedByName.get(document.fileName.toLocaleLowerCase())!;
          return {
            ...document,
            byteSize: file.size,
            id: file.id,
            mimeType: file.type,
            objectPath: file.path,
            originalFilename: file.name,
          };
        })
      : [];
  if (parsed.issues.length > 0) {
    await cleanupUploads();
  }

  const payload = {
    ...parsed.payload,
    documents: stagedDocuments,
  };
  const insert = await supabase
    .from("migration_batches")
    .insert({
      file_checksum: checksum,
      file_name: workbookFile.name,
      id: batchId,
      issues: parsed.issues as unknown as Json,
      payload: payload as unknown as Json,
      summary: parsed.summary,
    })
    .select("id,created_at")
    .single();
  if (insert.error) {
    await cleanupUploads();
    logger.error("import_batch_stage_failed", { code: insert.error.code });
    return NextResponse.json(
      { message: "The import preview could not be staged." },
      { status: 500 },
    );
  }

  await recordPhase7AuditEvent({
    action: "imports.preview",
    afterData: {
      file_name: workbookFile.name,
      issue_count: parsed.issues.length,
      summary: parsed.summary,
    },
    entityId: batchId,
    module: "imports",
  });

  return NextResponse.json({
    batchId,
    canCommit: parsed.issues.length === 0,
    createdAt: insert.data.created_at,
    fileName: workbookFile.name,
    issues: parsed.issues,
    message:
      parsed.issues.length === 0
        ? "Preview is valid and ready to commit."
        : "Nothing was imported. Correct the listed rows and preview the workbook again.",
    summary: parsed.summary,
  });
}

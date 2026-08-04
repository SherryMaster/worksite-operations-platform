import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireRoleForRouteHandler } from "@/lib/auth/access";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  isRecoverableDependencyFailure,
  recordDependencyFailure,
  throwDependencyError,
} from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

const requestSchema = z.object({ batchId: z.string().uuid() });

async function commitImport(request: Request) {
  await requireRoleForRouteHandler("CEO");
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { message: "The import preview reference is invalid." },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const batch = await supabase
    .from("migration_batches")
    .select("id,status,issues,summary")
    .eq("id", parsed.data.batchId)
    .maybeSingle();
  if (batch.error) {
    throwDependencyError(batch.error, {
      dependency: "SUPABASE_DATA",
      operation: "import_batch_lookup",
      operationKind: "read",
      routeFamily: "/api/imports/commit",
      surface: "route_handler",
    });
  }
  if (!batch.data) {
    return NextResponse.json(
      { message: "The import preview could not be found." },
      { status: 404 },
    );
  }
  if (batch.data.status === "COMMITTED") {
    return NextResponse.json({
      alreadyCommitted: true,
      message: "This preview was already imported. No duplicates were created.",
      summary: batch.data.summary,
    });
  }
  if (Array.isArray(batch.data.issues) && batch.data.issues.length > 0) {
    return NextResponse.json(
      { message: "Resolve every preview issue before importing." },
      { status: 409 },
    );
  }

  const committed = await supabase.rpc("commit_migration_batch", {
    p_batch_id: parsed.data.batchId,
  });
  if (committed.error) {
    const failure = recordDependencyFailure(committed.error, {
      dependency: "SUPABASE_DATA",
      operation: "import_batch_commit",
      operationKind: "write",
      routeFamily: "/api/imports/commit",
      surface: "route_handler",
    });
    if (isRecoverableDependencyFailure(failure)) throw failure;
    const message =
      committed.error.code === "23505"
        ? "A matching record was created after preview. Preview the workbook again before importing."
        : committed.error.message.includes("already been committed")
          ? "This workbook was already imported. No duplicates were created."
          : "The import was rolled back. No partial rows were committed.";
    return NextResponse.json({ message }, { status: 409 });
  }

  for (const path of [
    "/ceo",
    "/ceo/projects",
    "/ceo/workers",
    "/ceo/reports",
    "/ceo/imports",
    "/foreman",
    "/foreman/workers",
    "/foreman/reports",
  ]) {
    revalidatePath(path);
  }

  return NextResponse.json({
    message: "Import committed successfully.",
    summary: committed.data,
  });
}

export const POST = withDependencyRouteHandler(commitImport, {
  operation: "import_commit",
  operationKind: "write",
  routeFamily: "/api/imports/commit",
  surface: "route_handler",
});

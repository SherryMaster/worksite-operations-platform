import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { uuidSchema } from "@/lib/phase2/validation";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ documentId: string; workerId: string }>;
  },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Sign in required.", { status: 401 });

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
  if (
    error ||
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
    return new Response("File access could not be prepared.", { status: 500 });
  }

  return NextResponse.redirect(signed.signedUrl, 307);
}

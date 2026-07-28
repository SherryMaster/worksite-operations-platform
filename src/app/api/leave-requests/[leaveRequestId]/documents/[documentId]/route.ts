import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { uuidSchema } from "@/lib/phase2/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ documentId: string; leaveRequestId: string }>;
  },
) {
  const { userId } = await auth();
  if (!userId) return new Response("Sign in required.", { status: 401 });
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
  if (document.error || !document.data) {
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
    return new Response("File access could not be prepared.", { status: 500 });
  }
  return NextResponse.redirect(signed.data.signedUrl, 307);
}

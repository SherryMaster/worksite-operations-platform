import { NextResponse } from "next/server";

import { getCurrentAccess } from "@/lib/auth/access";
import { attendanceSyncRequestSchema } from "@/lib/phase4/validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AttendanceSyncResult } from "@/lib/phase4/types";

export async function POST(request: Request) {
  const access = await getCurrentAccess();
  if (access.status !== "AUTHORIZED") {
    return NextResponse.json(
      { message: "Attendance access is not available." },
      { status: 403 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = attendanceSyncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "One or more attendance actions are incomplete or invalid.",
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const results: Array<{
    clientActionId: string;
    result: AttendanceSyncResult;
  }> = [];

  for (const action of parsed.data.actions) {
    const response = await supabase.rpc("apply_attendance_action", {
      p_action_type: action.actionType,
      p_client_action_id: action.clientActionId,
      p_payload: action.payload,
      p_project_id: action.projectId,
    });

    if (response.error) {
      results.push({
        clientActionId: action.clientActionId,
        result: {
          message: "The server could not process this attendance action.",
          status: "FAILED",
        },
      });
      continue;
    }

    const value = response.data as {
      message?: unknown;
      status?: unknown;
    } | null;
    const status =
      value?.status === "SYNCED" ||
      value?.status === "FAILED" ||
      value?.status === "CONFLICT"
        ? value.status
        : "FAILED";
    results.push({
      clientActionId: action.clientActionId,
      result: {
        message:
          typeof value?.message === "string"
            ? value.message
            : "The server returned an invalid attendance response.",
        status,
      },
    });
  }

  return NextResponse.json(
    { results },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

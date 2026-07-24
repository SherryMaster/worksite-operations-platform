import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentAccess } from "@/lib/auth/access";
import {
  getAttendanceSnapshot,
  getForemanAttendanceSnapshot,
} from "@/lib/phase4/data";

const querySchema = z.object({
  date: z.iso.date(),
  project: z.uuid().optional(),
});

export async function GET(request: Request) {
  const access = await getCurrentAccess();
  if (access.status !== "AUTHORIZED") {
    return NextResponse.json(
      { message: "Attendance access is not available." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    date: url.searchParams.get("date"),
    project: url.searchParams.get("project") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Choose a valid attendance date." },
      { status: 400 },
    );
  }

  if (access.role === "CEO" && !parsed.data.project) {
    return NextResponse.json(
      { message: "Choose a project to load attendance." },
      { status: 400 },
    );
  }

  const snapshot =
    access.role === "FOREMAN"
      ? await getForemanAttendanceSnapshot(parsed.data.date)
      : await getAttendanceSnapshot(
          parsed.data.project as string,
          parsed.data.date,
        );

  return NextResponse.json(
    { snapshot },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

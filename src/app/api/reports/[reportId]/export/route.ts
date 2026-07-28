import { NextResponse } from "next/server";

import { getCurrentAccess } from "@/lib/auth/access";
import { recordPhase7AuditEvent } from "@/lib/phase7/audit";
import type { ReportRole } from "@/lib/phase7/report-definitions";
import { loadReport } from "@/lib/phase7/reports";
import { parseReportRequest } from "@/lib/phase7/validation";
import { buildReportWorkbook } from "@/lib/phase7/workbook";

function safeFilename(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const access = await getCurrentAccess();
  if (access.status !== "AUTHORIZED" || !access.role) {
    return NextResponse.json({ message: "Access denied." }, { status: 403 });
  }

  const { reportId: requestedReportId } = await params;
  const url = new URL(request.url);
  const values = Object.fromEntries(url.searchParams.entries());
  const parsed = parseReportRequest(
    requestedReportId,
    access.role as ReportRole,
    values,
  );
  if (parsed.reportId !== requestedReportId) {
    return NextResponse.json(
      { message: "This report is not available for your role." },
      { status: 403 },
    );
  }

  const report = await loadReport(parsed.reportId, parsed.filters);
  const workbook = await buildReportWorkbook(report);
  await recordPhase7AuditEvent({
    action: "exports.report",
    afterData: {
      filters: parsed.filters,
      report_id: parsed.reportId,
      row_count: report.rows.length,
    },
    entityId: parsed.reportId,
    module: "exports",
  });

  const filename = `${safeFilename(report.title)}-${report.generatedAt.slice(0, 10)}.xlsx`;
  return new Response(new Uint8Array(workbook), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}

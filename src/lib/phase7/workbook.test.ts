import ExcelJS from "@excel.js/exceljs";
import { describe, expect, it } from "vitest";

import { buildReportWorkbook } from "@/lib/phase7/workbook";

describe("Phase 7 Excel exports", () => {
  it("creates a filtered workbook and neutralizes spreadsheet formulas", async () => {
    const buffer = await buildReportWorkbook({
      columns: [
        { key: "worker", label: "Worker" },
        { key: "status", label: "Status" },
      ],
      filters: { status: "ACTIVE" },
      generatedAt: "2026-07-28T10:00:00.000Z",
      reportId: "current-workforce",
      rows: [{ status: "ACTIVE", worker: '=HYPERLINK("bad")' }],
      title: "Current workforce and assignments",
      truncated: false,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Report");

    expect(sheet?.getCell("A1").value).toBe(
      "Current workforce and assignments",
    );
    expect(sheet?.getCell("A6").value).toBe('\'=HYPERLINK("bad")');
    expect(sheet?.autoFilter).toBeTruthy();
  });
});

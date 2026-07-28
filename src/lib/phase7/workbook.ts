import ExcelJS from "@excel.js/exceljs";

import type { ReportResult } from "@/lib/phase7/report-definitions";

const brandFill = "292524";
const accentFill = "D97706";

function safeSpreadsheetText(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export async function buildReportWorkbook(report: ReportResult) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Worksite Operations Platform";
  workbook.created = new Date(report.generatedAt);
  workbook.modified = new Date(report.generatedAt);
  workbook.subject = "Filtered operational report";
  workbook.title = report.title;

  const sheet = workbook.addWorksheet("Report", {
    properties: { defaultRowHeight: 20 },
    views: [{ state: "frozen", ySplit: 5 }],
  });
  sheet.mergeCells(1, 1, 1, Math.max(report.columns.length, 1));
  const title = sheet.getCell(1, 1);
  title.value = report.title;
  title.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    name: "Aptos",
    size: 18,
  };
  title.fill = {
    fgColor: { argb: `FF${brandFill}` },
    type: "pattern",
    pattern: "solid",
  };
  title.alignment = { vertical: "middle" };
  sheet.getRow(1).height = 32;

  sheet.getCell("A2").value = "Generated";
  sheet.getCell("B2").value = new Date(report.generatedAt).toLocaleString(
    "en-MY",
    { timeZone: "Asia/Kuala_Lumpur" },
  );
  sheet.getCell("A3").value = "Filters";
  sheet.getCell("B3").value =
    Object.entries(report.filters)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ") || "No filters";
  sheet.getCell("A4").value = "Rows";
  sheet.getCell("B4").value = report.rows.length;

  for (const rowNumber of [2, 3, 4]) {
    sheet.getCell(rowNumber, 1).font = {
      bold: true,
      color: { argb: `FF${accentFill}` },
      name: "Aptos",
      size: 10,
    };
    sheet.getCell(rowNumber, 2).font = { name: "Aptos", size: 10 };
  }

  const header = sheet.getRow(5);
  header.values = report.columns.map((column) => column.label);
  header.font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    name: "Aptos",
    size: 10,
  };
  header.fill = {
    fgColor: { argb: `FF${brandFill}` },
    pattern: "solid",
    type: "pattern",
  };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;

  report.rows.forEach((sourceRow) => {
    const row = sheet.addRow(
      report.columns.map((column) => {
        const value = sourceRow[column.key];
        return typeof value === "string" ? safeSpreadsheetText(value) : value;
      }),
    );
    row.font = { name: "Aptos", size: 10 };
    row.alignment = { vertical: "top", wrapText: true };
    if (row.number % 2 === 0) {
      row.fill = {
        fgColor: { argb: "FFF5F5F4" },
        pattern: "solid",
        type: "pattern",
      };
    }
  });

  sheet.autoFilter = {
    from: { column: 1, row: 5 },
    to: { column: Math.max(report.columns.length, 1), row: 5 },
  };
  report.columns.forEach((column, index) => {
    const longest = Math.max(
      column.label.length,
      ...report.rows.map((row) => String(row[column.key] ?? "").length),
    );
    sheet.getColumn(index + 1).width = Math.min(Math.max(longest + 3, 14), 42);
  });
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        bottom: { color: { argb: "FFE7E5E4" }, style: "thin" },
      };
    });
  });

  return workbook.xlsx.writeBuffer();
}

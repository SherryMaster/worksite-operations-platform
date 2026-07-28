import { readFile } from "node:fs/promises";
import { join } from "node:path";

import ExcelJS from "@excel.js/exceljs";
import { describe, expect, it } from "vitest";

import { parseImportWorkbook } from "@/lib/phase7/import-workbook";

const lookup = {
  documentTypes: [
    {
      expectsExpiryDate: true,
      expectsIssueDate: false,
      name: "Passport",
    },
  ],
  existingProjectIdentities: [],
  existingWorkerIdentifiers: [],
  skillNames: ["Skilled"],
  tradeNames: ["Electrician"],
};

describe("Phase 7 fixed import workbook", () => {
  it("accepts a complete canonical workbook", async () => {
    const source = await readFile(
      join(process.cwd(), "public/templates/worksite-import-template.xlsx"),
    );
    const emptyTemplate = await parseImportWorkbook(source, lookup);
    expect(emptyTemplate.issues).toEqual([
      {
        message: "The workbook contains no import rows.",
        row: 0,
        sheet: "Workbook",
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const projects = workbook.addWorksheet("Projects");
    projects.addRow([
      "Project Key*",
      "Name*",
      "Client*",
      "Contractor",
      "Location*",
      "Start Date*",
      "End Date",
      "Status*",
    ]);
    projects.addRow([
      "PROJECT-1",
      "Tower A",
      "Example Client",
      "",
      "Kuala Lumpur",
      "2026-07-01",
      "",
      "ACTIVE",
    ]);
    const workers = workbook.addWorksheet("Workers");
    workers.addRow([
      "Worker Key*",
      "Legal Name*",
      "Phone*",
      "Alternate Phone",
      "Address",
      "Nationality",
      "CNIC",
      "Passport",
      "Work Permit",
      "Permit Issue Date",
      "Permit Expiry Date",
      "Employment Status*",
      "Employment Start Date*",
      "Trade*",
      "Skill Level*",
      "Monthly Food Deduction (MYR)*",
      "Notes",
    ]);
    workers.addRow([
      "WORKER-1",
      "Example Worker",
      "+60123456789",
      "",
      "",
      "Pakistan",
      "",
      "AB123456",
      "",
      "",
      "",
      "ACTIVE",
      "2026-07-01",
      "Electrician",
      "Skilled",
      120,
      "",
    ]);
    workbook
      .addWorksheet("WorkerDocuments")
      .addRow([
        "Worker Key*",
        "Document Type*",
        "Document Number",
        "Issue Date",
        "Expiry Date",
        "File Name*",
      ]);
    const assignments = workbook.addWorksheet("Assignments");
    assignments.addRow(["Worker Key*", "Project Key", "Effective Date*"]);
    assignments.addRow(["WORKER-1", "PROJECT-1", "2026-07-01"]);
    const rates = workbook.addWorksheet("Rates");
    rates.addRow(["Worker Key*", "Hourly Rate (MYR)*", "Effective Date*"]);
    rates.addRow(["WORKER-1", 18.5, "2026-07-01"]);

    const parsed = await parseImportWorkbook(
      new Uint8Array(await workbook.xlsx.writeBuffer()),
      lookup,
    );

    expect(parsed.issues).toEqual([]);
    expect(parsed.summary).toEqual({
      assignments: 1,
      documents: 0,
      projects: 1,
      rates: 1,
      workers: 1,
    });
    expect(parsed.payload.rates[0].hourlyRateSen).toBe(1850);
  });

  it("explains why a legacy workbook cannot be committed directly", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("safar").addRow(["WORKING PERIOD", "JULY 1-15"]);
    const parsed = await parseImportWorkbook(
      new Uint8Array(await workbook.xlsx.writeBuffer()),
      lookup,
    );

    expect(parsed.issues).toHaveLength(5);
    expect(parsed.issues[0].message).toContain("required");
    expect(parsed.summary.workers).toBe(0);
  });
});

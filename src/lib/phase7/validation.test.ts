import { describe, expect, it } from "vitest";

import { reportForRole, reportsForRole } from "@/lib/phase7/report-definitions";
import { parseReportRequest } from "@/lib/phase7/validation";

describe("Phase 7 report access and filters", () => {
  it("keeps payroll and audit reports CEO-only", () => {
    expect(reportForRole("payroll-adjustments", "FOREMAN")).toBeNull();
    expect(reportForRole("audit-activity", "FOREMAN")).toBeNull();
    expect(reportForRole("daily-attendance", "FOREMAN")?.id).toBe(
      "daily-attendance",
    );
    expect(reportsForRole("CEO")).toHaveLength(11);
  });

  it("falls back to the first permitted report", () => {
    expect(parseReportRequest("payment-status", "FOREMAN", {}).reportId).toBe(
      "current-workforce",
    );
  });

  it("rejects reversed date filters", () => {
    expect(() =>
      parseReportRequest("leave", "CEO", {
        dateFrom: "2026-07-31",
        dateTo: "2026-07-01",
      }),
    ).toThrow("The start date must be on or before the end date.");
  });
});

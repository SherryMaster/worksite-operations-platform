import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("attendance workflow separation", () => {
  it("keeps live AttendanceWorkspace only on Foreman Today", () => {
    expect(source("src/app/foreman/page.tsx")).toContain(
      "<AttendanceWorkspace",
    );
    expect(source("src/app/ceo/attendance/page.tsx")).not.toContain(
      "AttendanceWorkspace",
    );
    expect(source("src/app/foreman/attendance/page.tsx")).not.toContain(
      "AttendanceWorkspace",
    );
  });

  it("does not import device queue modules into monitor code", () => {
    for (const path of [
      "src/components/phase4/attendance-monitor.tsx",
      "src/components/phase4/attendance-record-detail.tsx",
      "src/lib/phase4/attendance-monitor-data.ts",
    ]) {
      const contents = source(path);
      expect(contents).not.toContain("offline-store");
      expect(contents).not.toContain("local-actions");
    }
  });

  it("uses a direct single-action correction without live marking controls", () => {
    const detail = source("src/components/phase4/attendance-record-detail.tsx");
    expect(detail).toContain('actionType: "CORRECT_DAY"');
    expect(detail).toContain("actions: [");
    for (const label of [
      "Enter worker",
      "Exit worker",
      "Start break",
      "End break",
    ]) {
      expect(detail).not.toContain(label);
    }
  });

  it("replaces the duplicate dashboard metric with attendance", () => {
    const dashboard = source("src/app/ceo/page.tsx");
    expect(dashboard).not.toContain("DashboardActionMetric");
    expect(dashboard).toContain("DashboardAttendanceMetric");
    expect(dashboard).toContain("Today’s attendance");
  });

  it("paginates approved leave using columns exposed by the leave-day view", () => {
    const data = source("src/lib/phase4/attendance-monitor-data.ts");
    const start = data.indexOf('.from("approved_leave_days")');
    const leaveQuery = data.slice(start, data.indexOf("    ]);", start));
    expect(leaveQuery).toContain('.order("leave_date")');
    expect(leaveQuery).toContain('.order("leave_request_id")');
    expect(leaveQuery).not.toContain('.order("id")');
  });
});

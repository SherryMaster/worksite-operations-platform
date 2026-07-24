import { describe, expect, it } from "vitest";

import { presentAuditEntry } from "@/lib/phase2/audit";

describe("audit presentation", () => {
  it("describes a project status change in plain English", () => {
    const result = presentAuditEntry({
      action: "projects.update",
      actorName: "Sherry",
      beforeData: { name: "Central Tower", status: "PLANNED" },
      afterData: { name: "Central Tower", status: "ACTIVE" },
      entityType: "projects",
      foremanName: null,
      module: "projects",
      projectName: "Central Tower",
      source: "ONLINE",
    });

    expect(result.title).toBe("Project status changed");
    expect(result.summary).toBe(
      "Sherry changed the status of “Central Tower”.",
    );
    expect(result.changes).toContainEqual({
      field: "Project status",
      from: "Planned",
      to: "Active",
    });
  });

  it("explains optional MFA changes without exposing internal IDs", () => {
    const result = presentAuditEntry({
      action: "users.update",
      actorName: "Sherry",
      beforeData: {
        clerk_user_id: "user_secret",
        mfa_required: false,
      },
      afterData: {
        clerk_user_id: "user_secret",
        mfa_required: true,
      },
      entityType: "application_users",
      foremanName: "Ali Khan",
      module: "users",
      projectName: null,
      source: "ONLINE",
    });

    expect(result.title).toBe("MFA required");
    expect(result.summary).toBe("Sherry required MFA for Ali Khan.");
    expect(result.changes).toEqual([
      { field: "MFA requirement", from: "Off", to: "Required" },
    ]);
  });

  it("explains removal of optional enrolled MFA methods", () => {
    const result = presentAuditEntry({
      action: "users.mfa_disabled",
      actorName: "Sherry",
      beforeData: null,
      afterData: { enrolled_mfa_methods_removed: true },
      entityType: "application_users",
      foremanName: "Ali Khan",
      module: "users",
      projectName: null,
      source: "ONLINE",
    });

    expect(result.title).toBe("MFA turned off");
    expect(result.summary).toBe(
      "Sherry turned MFA off for Ali Khan and removed the enrolled methods.",
    );
    expect(result.changes).toEqual([
      {
        field: "Authenticator and backup codes removed",
        from: null,
        to: "Yes",
      },
    ]);
  });
});

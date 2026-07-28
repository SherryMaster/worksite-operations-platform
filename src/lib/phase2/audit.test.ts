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

  it("describes worker rate changes in plain English and formats sen", () => {
    const result = presentAuditEntry({
      action: "worker_rates.insert",
      actorName: "Sherry",
      beforeData: null,
      afterData: {
        hourly_rate_sen: 1250,
        worker_id: "worker-secret-id",
      },
      entityType: "worker_rate_periods",
      foremanName: null,
      module: "worker_rates",
      projectName: null,
      source: "ONLINE",
      workerName: "Ahmad Khan",
    });

    expect(result.title).toBe("Hourly rate recorded");
    expect(result.summary).toBe(
      "Sherry updated Ahmad Khan’s effective hourly-rate history.",
    );
    expect(result.changes).toEqual([
      { field: "Hourly rate", from: null, to: "RM 12.50" },
    ]);
  });

  it("does not expose private worker file paths in activity details", () => {
    const result = presentAuditEntry({
      action: "documents.insert",
      actorName: "Sherry",
      beforeData: null,
      afterData: {
        bucket_id: "worker-documents",
        object_path: "private/secret.pdf",
        original_filename: "passport.pdf",
        status: "ACTIVE",
        worker_id: "worker-secret-id",
      },
      entityType: "worker_documents",
      foremanName: null,
      module: "documents",
      projectName: null,
      source: "ONLINE",
      workerName: "Ahmad Khan",
    });

    expect(result.title).toBe("Worker file uploaded");
    expect(result.summary).toContain("File contents and document numbers");
    expect(result.changes).toEqual([
      { field: "Record status", from: null, to: "Active" },
    ]);
  });

  it("describes an offline attendance correction for company staff", () => {
    const result = presentAuditEntry({
      action: "attendance.update",
      actorName: "Foreman Ali",
      beforeData: {
        entered_at: "2026-07-20T00:00:00.000Z",
        exited_at: null,
        project_id: "project-secret-id",
        record_status: "ACTIVE",
        worker_id: "worker-secret-id",
      },
      afterData: {
        correction_note: "Matched the signed worksite sheet",
        entered_at: "2026-07-20T00:30:00.000Z",
        exited_at: "2026-07-20T09:30:00.000Z",
        project_id: "project-secret-id",
        record_status: "ACTIVE",
        worker_id: "worker-secret-id",
      },
      entityType: "attendance_sessions",
      foremanName: null,
      module: "attendance",
      projectName: "Central Tower",
      source: "OFFLINE_SYNC",
      workerName: "Ahmad Khan",
    });

    expect(result.title).toBe("Worker exit or session details recorded");
    expect(result.summary).toContain("Ahmad Khan");
    expect(result.source).toBe("Synced from offline work");
    expect(result.changes).toContainEqual({
      field: "Correction reason",
      from: "Not set",
      to: "Matched the signed worksite sheet",
    });
    expect(JSON.stringify(result)).not.toContain("worker-secret-id");
  });

  it("describes a leave approval without exposing implementation IDs", () => {
    const result = presentAuditEntry({
      action: "leave.update",
      actorName: "Sherry",
      beforeData: {
        leave_type_id: "leave-type-secret",
        project_id: "project-secret",
        status: "PENDING",
        worker_id: "worker-secret",
      },
      afterData: {
        decided_by: "user-secret",
        leave_type_id: "leave-type-secret",
        project_id: "project-secret",
        status: "APPROVED",
        worker_id: "worker-secret",
      },
      entityType: "leave_requests",
      foremanName: null,
      module: "leave",
      projectName: "Central Tower",
      source: "ONLINE",
      workerName: "Ahmad Khan",
    });

    expect(result.title).toBe("Leave approved");
    expect(result.summary).toBe(
      "Sherry approved full-day unpaid leave for Ahmad Khan.",
    );
    expect(result.area).toBe("Leave");
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});

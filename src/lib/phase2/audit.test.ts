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

  it("describes payroll approval in plain English", () => {
    const result = presentAuditEntry({
      action: "payroll_runs.update",
      actorName: "Sherry",
      beforeData: { status: "DRAFT" },
      afterData: {
        approved_by: "user-secret",
        net_payroll_sen: 125000,
        status: "APPROVED",
      },
      entityType: "payroll_runs",
      foremanName: null,
      module: "payroll",
      projectName: null,
      source: "ONLINE",
    });

    expect(result.title).toBe("Monthly payroll approved");
    expect(result.summary).toBe(
      "Sherry approved the complete company payroll and created worker statements.",
    );
    expect(result.area).toBe("Payroll & payments");
    expect(result.changes).toContainEqual({
      field: "Net payroll",
      from: "Not set",
      to: "RM 1,250.00",
    });
    expect(JSON.stringify(result)).not.toContain("user-secret");
  });

  it("describes a recorded payroll payment without internal identifiers", () => {
    const result = presentAuditEntry({
      action: "payroll_payments.insert",
      actorName: "Sherry",
      beforeData: null,
      afterData: {
        amount_sen: 8050,
        payroll_worker_id: "payroll-worker-secret",
        method: "BANK_TRANSFER",
        payment_date: "2026-07-28",
      },
      entityType: "payroll_payments",
      foremanName: null,
      module: "payroll",
      projectName: null,
      source: "ONLINE",
      workerName: "Ahmad Khan",
    });

    expect(result.title).toBe("Worker payroll paid in full");
    expect(result.summary).toBe(
      "Sherry recorded one complete worker payroll payment.",
    );
    expect(result.changes).toContainEqual({
      field: "Amount",
      from: null,
      to: "RM 80.50",
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("describes migration commits in plain English", () => {
    const result = presentAuditEntry({
      action: "imports.commit",
      actorName: "Sherry",
      afterData: {
        file_name: "workers-july.xlsx",
        workers: 20,
      },
      beforeData: null,
      entityType: "migration_batches",
      foremanName: null,
      module: "imports",
      projectName: null,
      source: "IMPORT",
    });

    expect(result.title).toBe("Import workbook committed");
    expect(result.area).toBe("Data imports");
    expect(result.source).toBe("Imported");
    expect(result.summary).toContain("reconciliation totals");
  });

  it("redacts canonical document identifiers and metadata", () => {
    const result = presentAuditEntry({
      action: "worker_documents.update",
      actorName: "Sherry",
      beforeData: null,
      afterData: {
        document_number: "SECRET-PASSPORT",
        normalized_document_number: "secretpassport",
        metadata: { issuingCountry: "SECRET COUNTRY" },
        expiry_date: "2027-08-01",
      },
      entityType: "worker_documents",
      foremanName: null,
      module: "workers",
      projectName: null,
      source: "ONLINE",
      workerName: "Ali Worker",
    });
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(result.changes).toContainEqual({
      field: "Expiry date",
      from: null,
      to: "01 Aug 2027",
    });
  });
});

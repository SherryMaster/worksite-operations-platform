import { formatDate, formatDateTime, maskEmail } from "@/lib/phase2/format";
import type { Json } from "@/types/database";

const hiddenFields = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "ended_by",
  "actor_user_id",
  "clerk_user_id",
  "bucket_id",
  "object_path",
  "original_filename",
  "stored_filename",
  "mime_type",
  "size_bytes",
  "byte_size",
  "worker_id",
  "document_type_id",
  "replaced_by_document_id",
  "replaced_by_id",
  "uploaded_by",
  "changed_by",
  "trade_id",
  "skill_level_id",
  "attendance_session_id",
  "leave_request_id",
  "leave_type_id",
  "submitted_by",
  "decided_by",
  "payroll_run_id",
  "payroll_worker_id",
  "approval_revision_id",
  "source_payroll_worker_id",
  "target_payroll_worker_id",
  "generated_by",
  "approved_by",
  "paid_by",
  "snapshot",
]);

const fieldLabels: Record<string, string> = {
  active_sessions_revoked: "Existing sessions signed out",
  client_name: "Client",
  contractor_name: "Contractor",
  currency_code: "Currency",
  display_name: "Display name",
  end_date: "End date",
  enrolled_mfa_methods_removed: "Authenticator and backup codes removed",
  ends_on: "Assignment end date",
  expiry_date: "Expiry date",
  file_kind: "File type",
  foreman_user_id: "Foreman",
  is_active: "Account status",
  legal_name: "Legal name",
  location: "Location",
  mfa_required: "MFA requirement",
  name: "Name",
  notes: "Operational notes",
  project_id: "Project",
  hourly_rate_sen: "Hourly rate",
  monthly_amount_sen: "Monthly food deduction",
  issue_date: "Issue date",
  reason: "Reason",
  singleton: "Company settings record",
  start_date: "Start date",
  started_at: "Break started",
  starts_on: "Assignment effective date",
  status: "Project status",
  timezone: "Timezone",
  day_type: "Day type",
  entered_at: "Entered",
  exited_at: "Exited",
  ended_at: "Break ended",
  correction_note: "Correction reason",
  source: "Recorded through",
  work_date: "Work date",
  decision_note: "CEO decision note",
  decided_at: "Decision time",
  payroll_month: "Payroll month",
  period_start: "Period start",
  period_end: "Period end",
  calculation_revision: "Calculation revision",
  worker_count: "Worker count",
  gross_earnings_sen: "Gross earnings",
  additions_sen: "Additions",
  deductions_sen: "Deductions",
  food_deductions_sen: "Food deductions",
  food_deduction_sen: "Food deduction",
  net_payroll_sen: "Net payroll",
  net_pay_sen: "Net pay",
  blocking_exception_count: "Blocking exceptions",
  payment_status: "Payment status",
  amount_sen: "Amount",
  payment_date: "Payment date",
  method: "Payment method",
  reference: "Payment reference",
  approved_at: "Approval time",
  paid_at: "Payment recorded",
  statement_number: "Statement number",
  file_name: "Workbook",
  issue_count: "Issues found",
  report_id: "Report",
  row_count: "Rows exported",
  summary: "Reconciliation totals",
};

const areaLabels: Record<string, string> = {
  assignments: "Foreman assignments",
  categories: "Trades & skills",
  projects: "Projects",
  settings: "Company settings",
  users: "User accounts",
  documents: "Worker documents",
  worker_assignments: "Worker assignments",
  worker_rates: "Worker rates",
  workers: "Workers",
  attendance: "Attendance",
  attendance_day_types: "Attendance day types",
  leave: "Leave",
  payroll: "Payroll & payments",
  exports: "Report exports",
  imports: "Data imports",
};

type AuditRecord = Record<string, Json | undefined>;

export type AuditPresentationInput = {
  action: string;
  actorName: string;
  afterData: Json | null;
  beforeData: Json | null;
  entityType: string;
  foremanName: string | null;
  module: string;
  projectName: string | null;
  source: "IMPORT" | "OFFLINE_SYNC" | "ONLINE";
  workerName?: string | null;
};

export type AuditChange = {
  field: string;
  from: string | null;
  to: string;
};

export type AuditPresentation = {
  area: string;
  changes: AuditChange[];
  source: string;
  summary: string;
  title: string;
};

function asRecord(value: Json | null): AuditRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function categoryName(entityType: string, record: AuditRecord): string {
  const name = typeof record.name === "string" ? ` “${record.name}”` : "";
  return entityType === "trades" ? `trade${name}` : `skill level${name}`;
}

function projectName(input: AuditPresentationInput, record: AuditRecord) {
  return (
    input.projectName ??
    (typeof record.name === "string" ? record.name : "the project")
  );
}

function foremanName(input: AuditPresentationInput) {
  return input.foremanName ?? "the Foreman account";
}

function workerName(input: AuditPresentationInput) {
  return input.workerName ?? "the worker";
}

function describeAction(
  input: AuditPresentationInput,
  before: AuditRecord,
  after: AuditRecord,
): Pick<AuditPresentation, "summary" | "title"> {
  const actor = input.actorName;
  const project = projectName(input, after);
  const foreman = foremanName(input);
  const worker = workerName(input);

  if (input.entityType === "workers") {
    return input.action.endsWith(".insert")
      ? {
          title: "Worker profile created",
          summary: `${actor} created the worker profile for ${worker}.`,
        }
      : {
          title: "Worker profile updated",
          summary: `${actor} updated ${worker}’s identity or contact details.`,
        };
  }
  if (input.entityType === "worker_employment_periods") {
    return {
      title: input.action.endsWith(".insert")
        ? "Employment status recorded"
        : "Employment period closed",
      summary: `${actor} updated ${worker}’s employment history.`,
    };
  }
  if (input.entityType === "worker_classification_periods") {
    return {
      title: input.action.endsWith(".insert")
        ? "Trade and skill recorded"
        : "Trade and skill period closed",
      summary: `${actor} updated ${worker}’s trade and skill history.`,
    };
  }
  if (input.entityType === "worker_project_assignments") {
    return {
      title: input.action.endsWith(".insert")
        ? "Worker assigned to project"
        : "Worker assignment ended",
      summary: input.action.endsWith(".insert")
        ? `${actor} assigned ${worker} to “${project}”.`
        : `${actor} ended ${worker}’s assignment to “${project}”.`,
    };
  }
  if (input.entityType === "worker_rate_periods") {
    return {
      title: input.action.endsWith(".insert")
        ? "Hourly rate recorded"
        : "Hourly rate period closed",
      summary: `${actor} updated ${worker}’s effective hourly-rate history.`,
    };
  }
  if (input.entityType === "worker_food_deduction_periods") {
    return {
      title: input.action.endsWith(".insert")
        ? "Food deduction recorded"
        : "Food deduction period closed",
      summary: `${actor} updated ${worker}’s effective food-deduction history.`,
    };
  }
  if (input.entityType === "worker_documents") {
    return {
      title: input.action.endsWith(".insert")
        ? "Worker file uploaded"
        : "Worker file status changed",
      summary: `${actor} updated a private file for ${worker}. File contents and document numbers are not shown here.`,
    };
  }
  if (input.entityType === "document_types") {
    return {
      title: input.action.endsWith(".insert")
        ? "Document type added"
        : "Document type updated",
      summary: `${actor} updated the worker document-type settings.`,
    };
  }
  if (input.entityType === "project_days") {
    return {
      title: input.action.endsWith(".insert")
        ? "Project day type confirmed"
        : "Project day type changed",
      summary: `${actor} set the attendance day type for “${project}”.`,
    };
  }
  if (input.entityType === "attendance_sessions") {
    const voided = after.record_status === "VOID";
    return {
      title: voided
        ? "Work session replaced by a correction"
        : input.action.endsWith(".insert")
          ? "Worker entrance recorded"
          : "Worker exit or session details recorded",
      summary: voided
        ? `${actor} replaced an earlier work session for ${worker}; the previous value remains in history.`
        : `${actor} updated ${worker}’s attendance for “${project}”.`,
    };
  }
  if (input.entityType === "break_intervals") {
    return {
      title: input.action.endsWith(".insert")
        ? "Unpaid break started"
        : "Unpaid break updated",
      summary: `${actor} updated an unpaid break in ${worker}’s attendance.`,
    };
  }
  if (input.entityType === "leave_types") {
    const name = typeof after.name === "string" ? ` “${after.name}”` : "";
    const activated =
      before.is_active !== after.is_active && after.is_active === true;
    const deactivated =
      before.is_active !== after.is_active && after.is_active === false;
    return {
      title: input.action.endsWith(".insert")
        ? "Leave type added"
        : activated
          ? "Leave type restored"
          : deactivated
            ? "Leave type deactivated"
            : "Leave type updated",
      summary: `${actor} ${input.action.endsWith(".insert") ? "added" : activated ? "restored" : deactivated ? "deactivated" : "updated"} the leave type${name}.`,
    };
  }
  if (input.entityType === "leave_requests") {
    const statusChanged = before.status !== after.status;
    const status =
      typeof after.status === "string" ? after.status.toLowerCase() : null;
    return {
      title: statusChanged
        ? status === "approved"
          ? "Leave approved"
          : "Leave rejected"
        : "Leave request submitted",
      summary: statusChanged
        ? `${actor} ${status} full-day unpaid leave for ${worker}.`
        : `${actor} submitted full-day leave for ${worker} on “${project}”.`,
    };
  }
  if (input.entityType === "leave_request_documents") {
    return {
      title: "Leave supporting file attached",
      summary: `${actor} attached a private supporting file to ${worker}’s leave request. File contents and names are not shown here.`,
    };
  }
  if (input.entityType === "payroll_runs") {
    const approved =
      before.status !== after.status && after.status === "APPROVED";
    const needsReview =
      before.status !== after.status && after.status === "NEEDS_REVIEW";
    return {
      title: input.action.endsWith(".insert")
        ? "Monthly payroll generated"
        : approved
          ? "Monthly payroll approved"
          : needsReview
            ? "Payroll returned for review"
            : "Payroll recalculated",
      summary: input.action.endsWith(".insert")
        ? `${actor} generated a company payroll month for review.`
        : approved
          ? `${actor} approved the complete company payroll and created worker statements.`
          : needsReview
            ? `A source correction returned the affected company payroll to CEO review.`
            : `${actor} recalculated the company payroll from current attendance and rates.`,
    };
  }
  if (input.entityType === "payroll_adjustments") {
    const generated = after.source === "CORRECTION";
    return {
      title: input.action.endsWith(".delete")
        ? "Payroll adjustment removed"
        : generated
          ? "Paid-payroll correction created"
          : "Payroll adjustment recorded",
      summary: input.action.endsWith(".delete")
        ? `${actor} removed a draft payroll adjustment for ${worker}.`
        : generated
          ? `A correction to paid payroll created a traceable later adjustment for ${worker}.`
          : `${actor} recorded an addition or deduction for ${worker}.`,
    };
  }
  if (input.entityType === "payroll_statements") {
    return {
      title: "Worker payroll statement generated",
      summary: `${actor} generated an immutable approved payroll statement.`,
    };
  }
  if (input.entityType === "payroll_payments") {
    return {
      title: "Worker payroll paid in full",
      summary: `${actor} recorded one complete worker payroll payment.`,
    };
  }

  switch (input.action) {
    case "exports.report":
      return {
        title: "Report exported to Excel",
        summary: `${actor} downloaded a filtered operational report.`,
      };
    case "imports.preview":
      return {
        title: "Import workbook previewed",
        summary: `${actor} checked a workbook for row errors and duplicates. No company records changed during preview.`,
      };
    case "imports.commit":
      return {
        title: "Import workbook committed",
        summary: `${actor} imported a validated workbook and recorded its reconciliation totals.`,
      };
    case "projects.insert":
      return {
        title: "Project created",
        summary: `${actor} created the project “${project}”.`,
      };
    case "projects.update":
      if (before.status !== after.status) {
        return {
          title: "Project status changed",
          summary: `${actor} changed the status of “${project}”.`,
        };
      }
      return {
        title: "Project details updated",
        summary: `${actor} updated the details for “${project}”.`,
      };
    case "assignments.insert":
      return {
        title: "Foreman assigned",
        summary: `${actor} assigned ${foreman} to “${project}”.`,
      };
    case "assignments.update":
      return {
        title: "Foreman assignment ended",
        summary: `${actor} ended ${foreman}’s assignment to “${project}”.`,
      };
    case "users.insert":
      return {
        title: "Foreman account created",
        summary: `${actor} created the account for ${foreman}.`,
      };
    case "users.update":
      if (before.is_active !== after.is_active) {
        const active = after.is_active === true;
        return {
          title: active
            ? "Foreman account reactivated"
            : "Foreman account deactivated",
          summary: `${actor} ${active ? "restored" : "stopped"} access for ${foreman}.`,
        };
      }
      if (before.mfa_required !== after.mfa_required) {
        const required = after.mfa_required === true;
        return {
          title: required ? "MFA required" : "MFA turned off",
          summary: `${actor} ${required ? "required MFA for" : "turned MFA off for"} ${foreman}.`,
        };
      }
      return {
        title: "Foreman account updated",
        summary: `${actor} updated ${foreman}’s account.`,
      };
    case "users.password_reset":
      return {
        title: "Foreman password changed",
        summary: `${actor} changed the password for ${foreman} and signed out existing sessions.`,
      };
    case "users.mfa_disabled":
      return {
        title: "MFA turned off",
        summary: `${actor} turned MFA off for ${foreman} and removed the enrolled methods.`,
      };
    case "categories.insert": {
      const category = categoryName(input.entityType, after);
      return {
        title:
          input.entityType === "trades" ? "Trade added" : "Skill level added",
        summary: `${actor} added the ${category}.`,
      };
    }
    case "categories.update": {
      const category = categoryName(input.entityType, after);
      if (before.is_active !== after.is_active) {
        const active = after.is_active === true;
        return {
          title: active ? "Category restored" : "Category deactivated",
          summary: `${actor} ${active ? "restored" : "deactivated"} the ${category}.`,
        };
      }
      return {
        title: "Category renamed",
        summary: `${actor} renamed the ${category}.`,
      };
    }
    case "settings.update":
      return {
        title: "Company settings updated",
        summary: `${actor} updated the company identity settings.`,
      };
    case "users.invited":
      return {
        title: "Legacy Foreman invitation sent",
        summary: `${actor} sent a Foreman invitation before CEO-created accounts were introduced.`,
      };
    case "users.invitation_revoked":
      return {
        title: "Legacy Foreman invitation revoked",
        summary: `${actor} revoked a Foreman invitation.`,
      };
    default:
      return {
        title: "Activity recorded",
        summary: `${actor} made a recorded change in ${areaLabels[input.module] ?? "the application"}.`,
      };
  }
}

function formatValue(
  field: string,
  value: Json | undefined,
  input: AuditPresentationInput,
): string {
  if (value === null || value === undefined || value === "") return "Not set";
  if (field === "foreman_user_id") return foremanName(input);
  if (field === "project_id") return input.projectName ?? "Project record";
  if (field === "is_active") return value === true ? "Active" : "Inactive";
  if (field === "mfa_required") return value === true ? "Required" : "Off";
  if (field === "active_sessions_revoked") return value === true ? "Yes" : "No";
  if (
    typeof value === "string" &&
    (field.endsWith("_date") ||
      field.endsWith("_on") ||
      field === "start_date" ||
      field === "end_date")
  ) {
    return formatDate(value);
  }
  if (
    typeof value === "string" &&
    ["entered_at", "exited_at", "started_at", "ended_at"].includes(field)
  ) {
    return formatDateTime(value);
  }
  if (field === "status" && typeof value === "string") {
    return value.charAt(0) + value.slice(1).toLowerCase();
  }
  if (field.endsWith("_sen") && typeof value === "number") {
    return new Intl.NumberFormat("en-MY", {
      currency: "MYR",
      style: "currency",
    }).format(value / 100);
  }
  if (field.toLowerCase().includes("email") && typeof value === "string") {
    return maskEmail(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function describeChanges(
  input: AuditPresentationInput,
  before: AuditRecord,
  after: AuditRecord,
): AuditChange[] {
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((field) => !hiddenFields.has(field))
    .filter(
      (field) => JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    );

  return fields.map((field) => ({
    field:
      field === "status" && input.entityType !== "projects"
        ? "Record status"
        : (fieldLabels[field] ?? field.replaceAll("_", " ")),
    from: input.beforeData ? formatValue(field, before[field], input) : null,
    to: formatValue(field, after[field], input),
  }));
}

export function presentAuditEntry(
  input: AuditPresentationInput,
): AuditPresentation {
  const before = asRecord(input.beforeData);
  const after = asRecord(input.afterData);
  const description = describeAction(input, before, after);

  return {
    ...description,
    area: areaLabels[input.module] ?? "Application",
    source:
      input.source === "OFFLINE_SYNC"
        ? "Synced from offline work"
        : input.source === "IMPORT"
          ? "Imported"
          : "Made in the app",
    changes: describeChanges(input, before, after),
  };
}

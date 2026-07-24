import { formatDate, maskEmail } from "@/lib/phase2/format";
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
  foreman_user_id: "Foreman",
  is_active: "Account status",
  legal_name: "Legal name",
  location: "Location",
  mfa_required: "MFA requirement",
  name: "Name",
  notes: "Operational notes",
  project_id: "Project",
  singleton: "Company settings record",
  start_date: "Start date",
  starts_on: "Assignment effective date",
  status: "Project status",
  timezone: "Timezone",
};

const areaLabels: Record<string, string> = {
  assignments: "Foreman assignments",
  categories: "Trades & skills",
  projects: "Projects",
  settings: "Company settings",
  users: "User accounts",
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

function describeAction(
  input: AuditPresentationInput,
  before: AuditRecord,
  after: AuditRecord,
): Pick<AuditPresentation, "summary" | "title"> {
  const actor = input.actorName;
  const project = projectName(input, after);
  const foreman = foremanName(input);

  switch (input.action) {
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
  if (field === "status" && typeof value === "string") {
    return value.charAt(0) + value.slice(1).toLowerCase();
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
    field: fieldLabels[field] ?? field.replaceAll("_", " "),
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

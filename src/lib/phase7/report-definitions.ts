export type ReportRole = "CEO" | "FOREMAN";

export const reportDefinitions = [
  {
    id: "current-workforce",
    title: "Current workforce and assignments",
    description:
      "Current employment, trade, skill, project assignment, and document status for each worker.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "project-workforce",
    title: "Project workforce summary",
    description:
      "Worker totals by project, including active, suspended, and unassigned people.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "daily-attendance",
    title: "Daily attendance",
    description:
      "Worker attendance status and payable time categories for one work date.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "monthly-attendance",
    title: "Monthly attendance",
    description:
      "Recorded worker-days, leave, payable time, and exception totals for a month.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "attendance-exceptions",
    title: "Attendance exceptions",
    description:
      "Incomplete, invalid, overlapping, failed, and conflicting attendance records needing review.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "leave",
    title: "Leave",
    description:
      "Leave requests, decisions, supporting-document status, and attendance conflicts.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "payroll-adjustments",
    title: "Payroll and adjustments",
    description:
      "Monthly earnings, additions, deductions, food deductions, net pay, and adjustment reasons.",
    roles: ["CEO"],
  },
  {
    id: "payment-status",
    title: "Payment status",
    description:
      "Approved payroll payment state, payment date, method, amount, and reference.",
    roles: ["CEO"],
  },
  {
    id: "worker-history",
    title: "Worker assignment and rate history",
    description:
      "Effective-dated project assignments and hourly rates for worker history checks.",
    roles: ["CEO"],
  },
  {
    id: "document-expiry",
    title: "Expiring and expired documents",
    description:
      "Active worker documents that are expired or due to expire within 30 days.",
    roles: ["CEO", "FOREMAN"],
  },
  {
    id: "audit-activity",
    title: "Audit activity",
    description:
      "Plain-English company changes with actor, source, entity, and before/after details.",
    roles: ["CEO"],
  },
] as const;

export type ReportId = (typeof reportDefinitions)[number]["id"];

export const reportIds = new Set<ReportId>(
  reportDefinitions.map((report) => report.id),
);

export function reportsForRole(role: ReportRole) {
  return reportDefinitions.filter((report) =>
    (report.roles as readonly ReportRole[]).includes(role),
  );
}

export function reportForRole(reportId: string, role: ReportRole) {
  return reportsForRole(role).find((report) => report.id === reportId) ?? null;
}

export type ReportFilters = {
  actor?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: string;
  projectId?: string;
  query?: string;
  status?: string;
  workerId?: string;
};

export type ReportColumn = {
  key: string;
  label: string;
};

export type ReportCell = number | string | null;
export type ReportRow = Record<string, ReportCell>;

export type ReportResult = {
  columns: ReportColumn[];
  filters: ReportFilters;
  generatedAt: string;
  reportId: ReportId;
  rows: ReportRow[];
  title: string;
  truncated: boolean;
};

import "server-only";

import { calculateAttendance, formatMinutes } from "@/lib/phase4/calculations";
import {
  getAttendanceMonthRows,
  getAttendanceSnapshot,
  listAttendanceProjects,
} from "@/lib/phase4/data";
import { getAuditEntries, listProjects } from "@/lib/phase2/data";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { presentAuditEntry } from "@/lib/phase2/audit";
import { listWorkers } from "@/lib/phase3/data";
import { documentExpiryState, maskIdentifier } from "@/lib/phase3/format";
import { listLeaveRequests } from "@/lib/phase5/data";
import { getPayrollRun, listPayrollRuns } from "@/lib/phase6/data";
import { formatPayrollMinutes, formatSen } from "@/lib/phase6/calculations";
import type {
  ReportColumn,
  ReportFilters,
  ReportId,
  ReportResult,
  ReportRow,
} from "@/lib/phase7/report-definitions";
import { reportDefinitions } from "@/lib/phase7/report-definitions";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const rowLimit = 5000;

function reportTitle(reportId: ReportId) {
  return (
    reportDefinitions.find((report) => report.id === reportId)?.title ??
    "Report"
  );
}

function currentMonth() {
  return malaysiaDateInputValue().slice(0, 7);
}

function inDateRange(
  value: string,
  filters: Pick<ReportFilters, "dateFrom" | "dateTo">,
) {
  const date = value.slice(0, 10);
  return (
    (!filters.dateFrom || date >= filters.dateFrom) &&
    (!filters.dateTo || date <= filters.dateTo)
  );
}

function searchableRows(rows: ReportRow[], filters: ReportFilters) {
  const query = filters.query?.toLocaleLowerCase();
  return rows.filter((row) => {
    const text = Object.values(row)
      .filter((value) => value !== null)
      .join(" ")
      .toLocaleLowerCase();
    return (
      (!query || text.includes(query)) &&
      (!filters.status ||
        Object.entries(row).some(
          ([key, value]) =>
            key.toLocaleLowerCase().includes("status") &&
            String(value).toLocaleLowerCase() ===
              filters.status?.toLocaleLowerCase(),
        ))
    );
  });
}

function result(
  reportId: ReportId,
  filters: ReportFilters,
  columns: ReportColumn[],
  sourceRows: ReportRow[],
): ReportResult {
  const filtered = searchableRows(sourceRows, filters);
  return {
    columns,
    filters,
    generatedAt: new Date().toISOString(),
    reportId,
    rows: filtered.slice(0, rowLimit),
    title: reportTitle(reportId),
    truncated: filtered.length > rowLimit,
  };
}

async function currentWorkforce(filters: ReportFilters) {
  const workers = await listWorkers({
    project: filters.projectId,
    query: filters.query,
    status: filters.status,
  });
  return result(
    "current-workforce",
    { ...filters, query: undefined, status: undefined },
    [
      { key: "worker", label: "Worker" },
      { key: "phone", label: "Phone" },
      { key: "cnic", label: "CNIC" },
      { key: "passport", label: "Passport" },
      { key: "workPermit", label: "Work Permit" },
      { key: "employmentStatus", label: "Employment status" },
      { key: "project", label: "Current project" },
      { key: "trade", label: "Trade" },
      { key: "skill", label: "Skill level" },
      { key: "documentStatus", label: "Document status" },
    ],
    workers.map((worker) => ({
      documentStatus: worker.documentWarning,
      cnic: maskIdentifier(worker.identityDocuments.cnic),
      employmentStatus: worker.currentEmployment?.status ?? "NOT SET",
      phone: worker.phone_number,
      passport: maskIdentifier(worker.identityDocuments.passport),
      project: worker.projectName ?? "Awaiting assignment",
      skill: worker.skillName ?? "Not set",
      trade: worker.tradeName ?? "Not set",
      worker: worker.legal_name,
      workPermit: maskIdentifier(worker.identityDocuments.workPermit),
    })),
  );
}

async function projectWorkforce(filters: ReportFilters) {
  const [projects, workers] = await Promise.all([
    listProjects(),
    listWorkers({ project: filters.projectId }),
  ]);
  const rows = projects
    .filter((project) => !filters.projectId || project.id === filters.projectId)
    .map((project) => {
      const assigned = workers.filter(
        (worker) => worker.currentAssignment?.project_id === project.id,
      );
      return {
        activeWorkers: assigned.filter(
          (worker) => worker.currentEmployment?.status === "ACTIVE",
        ).length,
        documentAlerts: assigned.filter((worker) =>
          ["EXPIRED", "EXPIRING"].includes(worker.documentWarning),
        ).length,
        foreman: project.currentForeman?.displayName ?? "Not assigned",
        project: project.name,
        projectStatus: project.status,
        suspendedWorkers: assigned.filter(
          (worker) => worker.currentEmployment?.status === "SUSPENDED",
        ).length,
        totalWorkers: assigned.length,
      };
    });
  return result(
    "project-workforce",
    filters,
    [
      { key: "project", label: "Project" },
      { key: "projectStatus", label: "Project status" },
      { key: "foreman", label: "Foreman" },
      { key: "totalWorkers", label: "Total workers" },
      { key: "activeWorkers", label: "Active workers" },
      { key: "suspendedWorkers", label: "Suspended workers" },
      { key: "documentAlerts", label: "Document alerts" },
    ],
    rows,
  );
}

async function attendanceProjects(projectId?: string) {
  const projects = await listAttendanceProjects();
  return projectId
    ? projects.filter((project) => project.id === projectId)
    : projects;
}

async function dailyAttendance(filters: ReportFilters) {
  const workDate = filters.date ?? malaysiaDateInputValue();
  const projects = await attendanceProjects(filters.projectId);
  const snapshots = (
    await Promise.all(
      projects.map((project) => getAttendanceSnapshot(project.id, workDate)),
    )
  ).filter((snapshot) => snapshot !== null);
  const rows = snapshots.flatMap((snapshot) =>
    snapshot.workers
      .filter((worker) => !filters.workerId || worker.id === filters.workerId)
      .map((worker) => {
        const calculation = calculateAttendance(
          snapshot.sessions.filter((session) => session.workerId === worker.id),
          snapshot.dayType,
          workDate,
        );
        return {
          date: workDate,
          dayType: snapshot.dayType.replaceAll("_", " "),
          exceptions: worker.approvedLeaveType
            ? 0
            : calculation.exceptions.length,
          normalTime: worker.approvedLeaveType
            ? "0h 00m"
            : formatMinutes(calculation.normalMinutes),
          overtime: worker.approvedLeaveType
            ? "0h 00m"
            : formatMinutes(calculation.overtimeMinutes),
          project: snapshot.projectName,
          status: worker.approvedLeaveType ? "LEAVE" : calculation.status,
          totalPayable: worker.approvedLeaveType
            ? "0h 00m"
            : formatMinutes(calculation.totalPayableMinutes),
          worker: worker.legalName,
        };
      }),
  );
  return result(
    "daily-attendance",
    filters,
    [
      { key: "date", label: "Date" },
      { key: "project", label: "Project" },
      { key: "worker", label: "Worker" },
      { key: "dayType", label: "Day type" },
      { key: "status", label: "Status" },
      { key: "normalTime", label: "Normal time" },
      { key: "overtime", label: "Overtime" },
      { key: "totalPayable", label: "Total payable time" },
      { key: "exceptions", label: "Exceptions" },
    ],
    rows,
  );
}

async function monthRows(filters: ReportFilters) {
  const month = filters.month ?? currentMonth();
  const projects = await attendanceProjects(filters.projectId);
  const byProject = await Promise.all(
    projects.map(async (project) => ({
      project,
      rows: await getAttendanceMonthRows(project.id, month),
    })),
  );
  return { byProject, month };
}

async function monthlyAttendance(filters: ReportFilters) {
  const { byProject, month } = await monthRows(filters);
  const rows = byProject.flatMap(({ project, rows: workerDays }) =>
    workerDays
      .filter((row) => !filters.workerId || row.workerId === filters.workerId)
      .map((row) => ({
        date: row.date,
        exceptions: row.exceptionCount,
        month,
        normalTime: formatMinutes(row.normalMinutes),
        overtime: formatMinutes(row.overtimeMinutes),
        project: project.name,
        publicHolidayTime: formatMinutes(row.publicHolidayMinutes),
        status: row.status,
        sundayTime: formatMinutes(row.sundayMinutes),
        totalPayable: formatMinutes(row.totalMinutes),
        worker: row.workerName,
      })),
  );
  return result(
    "monthly-attendance",
    filters,
    [
      { key: "date", label: "Date" },
      { key: "project", label: "Project" },
      { key: "worker", label: "Worker" },
      { key: "status", label: "Status" },
      { key: "normalTime", label: "Normal time" },
      { key: "overtime", label: "Overtime" },
      { key: "sundayTime", label: "Sunday time" },
      { key: "publicHolidayTime", label: "Public holiday time" },
      { key: "totalPayable", label: "Total payable time" },
      { key: "exceptions", label: "Exceptions" },
    ],
    rows,
  );
}

async function attendanceExceptions(filters: ReportFilters) {
  const { byProject } = await monthRows(filters);
  const calculationRows = byProject.flatMap(({ project, rows }) =>
    rows
      .filter((row) => row.exceptionCount > 0)
      .map((row) => ({
        action: "Correct the worker-day from Attendance.",
        date: row.date,
        details: `${row.exceptionCount} incomplete or invalid time record(s).`,
        project: project.name,
        source: "Attendance record",
        status: row.status,
        worker: row.workerName,
      })),
  );
  return result(
    "attendance-exceptions",
    filters,
    [
      { key: "date", label: "Date" },
      { key: "project", label: "Project" },
      { key: "worker", label: "Worker" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "details", label: "What needs attention" },
      { key: "action", label: "Recommended action" },
    ],
    calculationRows,
  );
}

async function leaveReport(filters: ReportFilters) {
  const status = ["APPROVED", "PENDING", "REJECTED"].includes(
    filters.status ?? "",
  )
    ? (filters.status as "APPROVED" | "PENDING" | "REJECTED")
    : undefined;
  const requests = await listLeaveRequests({
    projectId: filters.projectId,
    status,
    workerId: filters.workerId,
  });
  const rows = requests
    .filter(
      (request) =>
        (!filters.dateFrom || request.ends_on >= filters.dateFrom) &&
        (!filters.dateTo || request.starts_on <= filters.dateTo),
    )
    .map((request) => ({
      attendanceConflict: request.attendanceConflict ? "Yes" : "No",
      decision: request.decision_note ?? "Not decided",
      document: request.document ? "Attached" : "None",
      endDate: request.ends_on,
      leaveType: request.leaveTypeName,
      project: request.projectName,
      startDate: request.starts_on,
      status: request.status,
      worker: request.workerName,
    }));
  return result(
    "leave",
    { ...filters, status: undefined },
    [
      { key: "worker", label: "Worker" },
      { key: "project", label: "Project" },
      { key: "leaveType", label: "Leave type" },
      { key: "startDate", label: "Start date" },
      { key: "endDate", label: "End date" },
      { key: "status", label: "Status" },
      { key: "document", label: "Supporting document" },
      { key: "attendanceConflict", label: "Attendance conflict" },
      { key: "decision", label: "Decision note" },
    ],
    rows,
  );
}

async function selectedPayroll(filters: ReportFilters) {
  const runs = await listPayrollRuns();
  const month = filters.month ?? currentMonth();
  const selected =
    runs.find((run) => run.payroll_month.slice(0, 7) === month) ?? null;
  return selected ? getPayrollRun(selected.id) : null;
}

async function payrollAdjustments(filters: ReportFilters) {
  const payroll = await selectedPayroll(filters);
  const rows =
    payroll?.workers
      .filter(
        (worker) =>
          (!filters.projectId ||
            worker.primary_project_id === filters.projectId) &&
          (!filters.workerId || worker.worker_id === filters.workerId),
      )
      .map((worker) => ({
        additions: formatSen(worker.additions_sen),
        adjustmentReasons:
          worker.adjustments.map((item) => item.reason).join("; ") || "None",
        deductions: formatSen(worker.deductions_sen),
        foodDeduction: formatSen(worker.food_deduction_sen),
        grossEarnings: formatSen(worker.gross_earnings_sen),
        month: payroll.run.payroll_month.slice(0, 7),
        netPay: formatSen(worker.net_pay_sen),
        payableTime: formatPayrollMinutes(
          worker.normal_minutes +
            worker.overtime_minutes +
            worker.sunday_minutes +
            worker.public_holiday_minutes,
        ),
        project: worker.primaryProjectName ?? "Multiple / unassigned",
        status: payroll.run.status,
        worker: worker.worker_name,
      })) ?? [];
  return result(
    "payroll-adjustments",
    filters,
    [
      { key: "month", label: "Payroll month" },
      { key: "worker", label: "Worker" },
      { key: "project", label: "Primary project" },
      { key: "status", label: "Payroll status" },
      { key: "payableTime", label: "Payable time" },
      { key: "grossEarnings", label: "Gross earnings" },
      { key: "additions", label: "Additions" },
      { key: "deductions", label: "Deductions" },
      { key: "foodDeduction", label: "Food deduction" },
      { key: "netPay", label: "Net pay" },
      { key: "adjustmentReasons", label: "Adjustment reasons" },
    ],
    rows,
  );
}

async function paymentStatus(filters: ReportFilters) {
  const payroll = await selectedPayroll(filters);
  const rows =
    payroll?.workers
      .filter(
        (worker) =>
          (!filters.projectId ||
            worker.primary_project_id === filters.projectId) &&
          (!filters.workerId || worker.worker_id === filters.workerId),
      )
      .map((worker) => ({
        amount: worker.payment ? formatSen(worker.payment.amount_sen) : "—",
        method: worker.payment?.method.replaceAll("_", " ") ?? "—",
        month: payroll.run.payroll_month.slice(0, 7),
        paymentDate: worker.payment?.payment_date ?? "—",
        project: worker.primaryProjectName ?? "Multiple / unassigned",
        reference: worker.payment?.reference ?? "—",
        status: worker.payment_status,
        worker: worker.worker_name,
      })) ?? [];
  return result(
    "payment-status",
    filters,
    [
      { key: "month", label: "Payroll month" },
      { key: "worker", label: "Worker" },
      { key: "project", label: "Primary project" },
      { key: "status", label: "Payment status" },
      { key: "amount", label: "Amount" },
      { key: "paymentDate", label: "Payment date" },
      { key: "method", label: "Method" },
      { key: "reference", label: "Reference" },
    ],
    rows,
  );
}

async function workerHistory(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient();
  const [workers, projects, assignments, rates] = await Promise.all([
    supabase.from("workers").select("id,legal_name").order("legal_name"),
    supabase.from("projects").select("id,name").order("name"),
    supabase
      .from("worker_project_assignments")
      .select("worker_id,project_id,starts_on,ends_on")
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_rate_periods")
      .select("worker_id,hourly_rate_sen,starts_on,ends_on")
      .order("starts_on", { ascending: false }),
  ]);
  for (const [operation, response] of [
    ["workers", workers],
    ["projects", projects],
    ["assignments", assignments],
    ["rates", rates],
  ] as const) {
    if (response.error) {
      throwDependencyError(response.error, {
        dependency: "SUPABASE_DATA",
        operation,
        operationKind: "read",
        routeFamily: "/ceo|foreman/reports",
        surface: "server_component",
      });
    }
  }
  const workerNames = new Map(
    (workers.data ?? []).map((worker) => [worker.id, worker.legal_name]),
  );
  const projectNames = new Map(
    (projects.data ?? []).map((project) => [project.id, project.name]),
  );
  const assignmentRows = (assignments.data ?? [])
    .filter(
      (row) =>
        (!filters.projectId || row.project_id === filters.projectId) &&
        (!filters.workerId || row.worker_id === filters.workerId) &&
        inDateRange(row.starts_on, filters),
    )
    .map((row) => ({
      endDate: row.ends_on ?? "Current",
      hourlyRate: "—",
      project: projectNames.get(row.project_id) ?? "Unavailable project",
      recordType: "Project assignment",
      startDate: row.starts_on,
      worker: workerNames.get(row.worker_id) ?? "Worker record",
    }));
  const rateRows = (rates.data ?? [])
    .filter(
      (row) =>
        (!filters.workerId || row.worker_id === filters.workerId) &&
        inDateRange(row.starts_on, filters),
    )
    .map((row) => ({
      endDate: row.ends_on ?? "Current",
      hourlyRate: formatSen(row.hourly_rate_sen),
      project: "—",
      recordType: "Hourly rate",
      startDate: row.starts_on,
      worker: workerNames.get(row.worker_id) ?? "Worker record",
    }));
  return result(
    "worker-history",
    filters,
    [
      { key: "worker", label: "Worker" },
      { key: "recordType", label: "History type" },
      { key: "project", label: "Project" },
      { key: "hourlyRate", label: "Hourly rate" },
      { key: "startDate", label: "Effective from" },
      { key: "endDate", label: "Effective until" },
    ],
    [...assignmentRows, ...rateRows],
  );
}

async function documentExpiry(filters: ReportFilters) {
  const supabase = await createServerSupabaseClient();
  const [documents, workerSummaries, types] = await Promise.all([
    supabase
      .from("worker_documents")
      .select("worker_id,document_type_id,document_number,expiry_date,status")
      .eq("file_kind", "DOCUMENT")
      .eq("status", "ACTIVE")
      .order("expiry_date"),
    listWorkers({ project: filters.projectId }),
    supabase.from("document_types").select("id,name").order("name"),
  ]);
  for (const [operation, response] of [
    ["documents", documents],
    ["document_types", types],
  ] as const) {
    if (response.error) {
      throwDependencyError(response.error, {
        dependency: "SUPABASE_DATA",
        operation,
        operationKind: "read",
        routeFamily: "/ceo|foreman/reports",
        surface: "server_component",
      });
    }
  }
  const workerNames = new Map(
    workerSummaries.map((worker) => [worker.id, worker.legal_name]),
  );
  const visibleWorkerIds = new Set(workerNames.keys());
  const typeNames = new Map(
    (types.data ?? []).map((type) => [type.id, type.name]),
  );
  const today = malaysiaDateInputValue();
  const rows = (documents.data ?? [])
    .filter(
      (document) =>
        visibleWorkerIds.has(document.worker_id) &&
        (!filters.workerId || document.worker_id === filters.workerId) &&
        ["EXPIRED", "EXPIRING"].includes(
          documentExpiryState(document.expiry_date, today),
        ),
    )
    .map((document) => ({
      documentNumber: document.document_number ?? "Not recorded",
      documentType: document.document_type_id
        ? (typeNames.get(document.document_type_id) ?? "Document")
        : "Document",
      expiryDate: document.expiry_date ?? "No expiry date",
      status: documentExpiryState(document.expiry_date, today),
      worker: workerNames.get(document.worker_id) ?? "Worker record",
    }));
  return result(
    "document-expiry",
    filters,
    [
      { key: "worker", label: "Worker" },
      { key: "documentType", label: "Document type" },
      { key: "documentNumber", label: "Document number" },
      { key: "expiryDate", label: "Expiry date" },
      { key: "status", label: "Status" },
    ],
    rows,
  );
}

async function auditActivity(filters: ReportFilters) {
  const actor = filters.actor?.toLocaleLowerCase();
  const entries = (await getAuditEntries(rowLimit)).filter(
    (entry) =>
      (!actor || entry.actorName.toLocaleLowerCase().includes(actor)) &&
      inDateRange(entry.occurred_at, filters),
  );
  const rows = entries.map((entry) => {
    const presentation = presentAuditEntry({
      action: entry.action,
      actorName: entry.actorName,
      afterData: entry.after_data,
      beforeData: entry.before_data,
      entityType: entry.entity_type,
      foremanName: entry.foremanName,
      module: entry.module,
      projectName: entry.projectName,
      source: entry.source,
      workerName: entry.workerName,
    });
    return {
      action: presentation.title,
      actor: entry.actorName,
      area: presentation.area,
      beforeAfter:
        presentation.changes
          .map(
            (change) =>
              `${change.field}: ${change.from ?? "not set"} → ${change.to}`,
          )
          .join("; ") || "No field-level values were recorded.",
      dateTime: entry.occurred_at,
      details: presentation.summary,
      entityReference: entry.entity_id,
      source: presentation.source,
    };
  });
  return result(
    "audit-activity",
    { ...filters, actor: undefined },
    [
      { key: "dateTime", label: "Date and time" },
      { key: "actor", label: "Changed by" },
      { key: "area", label: "Area" },
      { key: "action", label: "Action" },
      { key: "details", label: "What happened" },
      { key: "source", label: "Source" },
      { key: "beforeAfter", label: "Before and after" },
      { key: "entityReference", label: "Technical reference" },
    ],
    rows,
  );
}

export async function loadReport(
  reportId: ReportId,
  filters: ReportFilters,
): Promise<ReportResult> {
  switch (reportId) {
    case "current-workforce":
      return currentWorkforce(filters);
    case "project-workforce":
      return projectWorkforce(filters);
    case "daily-attendance":
      return dailyAttendance(filters);
    case "monthly-attendance":
      return monthlyAttendance(filters);
    case "attendance-exceptions":
      return attendanceExceptions(filters);
    case "leave":
      return leaveReport(filters);
    case "payroll-adjustments":
      return payrollAdjustments(filters);
    case "payment-status":
      return paymentStatus(filters);
    case "worker-history":
      return workerHistory(filters);
    case "document-expiry":
      return documentExpiry(filters);
    case "audit-activity":
      return auditActivity(filters);
  }
}

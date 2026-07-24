import "server-only";

import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { documentExpiryState } from "@/lib/phase3/format";
import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type Employment = Tables<"worker_employment_periods">;
type Classification = Tables<"worker_classification_periods">;
type Assignment = Tables<"worker_project_assignments">;
type Rate = Tables<"worker_rate_periods">;
type Deduction = Tables<"worker_food_deduction_periods">;
type Document = Tables<"worker_documents">;

export type WorkerSummary = Tables<"workers"> & {
  currentAssignment: Assignment | null;
  currentEmployment: Employment | null;
  currentClassification: Classification | null;
  documentWarning: "EXPIRED" | "EXPIRING" | "VALID" | "NONE";
  photoId: string | null;
  projectName: string | null;
  skillName: string | null;
  tradeName: string | null;
};

export type WorkerDetail = WorkerSummary & {
  assignments: Array<Assignment & { projectName: string }>;
  classifications: Array<
    Classification & { skillName: string; tradeName: string }
  >;
  currentDeduction: Deduction | null;
  currentRate: Rate | null;
  documents: Array<
    Document & {
      documentTypeName: string | null;
      expiryState: "EXPIRED" | "EXPIRING" | "VALID" | "NONE";
    }
  >;
  employment: Employment[];
  foodDeductions: Deduction[];
  rates: Rate[];
};

function throwQueryError(
  operation: string,
  error: { code?: string; message: string } | null,
): never {
  logger.error("phase_3_query_failed", { operation, code: error?.code });
  throw new Error("Worker information could not be loaded.");
}

function effective<T extends { ends_on: string | null; starts_on: string }>(
  rows: T[],
  date: string,
): T | null {
  return (
    rows.find(
      (row) => row.starts_on <= date && (!row.ends_on || row.ends_on > date),
    ) ?? null
  );
}

async function loadWorkerData() {
  const supabase = await createServerSupabaseClient();
  const [
    workers,
    employment,
    classifications,
    assignments,
    projects,
    trades,
    skills,
    documents,
  ] = await Promise.all([
    supabase.from("workers").select("*").order("legal_name"),
    supabase
      .from("worker_employment_periods")
      .select("*")
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_classification_periods")
      .select("*")
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_project_assignments")
      .select("*")
      .order("starts_on", { ascending: false }),
    supabase.from("projects").select("id,name,status").order("name"),
    supabase.from("trades").select("id,name,is_active").order("name"),
    supabase.from("skill_levels").select("id,name,is_active").order("name"),
    supabase
      .from("worker_documents")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  for (const [operation, result] of [
    ["workers", workers],
    ["worker_employment", employment],
    ["worker_classification", classifications],
    ["worker_assignments", assignments],
    ["worker_projects", projects],
    ["worker_trades", trades],
    ["worker_skills", skills],
    ["worker_documents", documents],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  return {
    assignments: assignments.data ?? [],
    classifications: classifications.data ?? [],
    documents: documents.data ?? [],
    employment: employment.data ?? [],
    projects: projects.data ?? [],
    skills: skills.data ?? [],
    trades: trades.data ?? [],
    workers: workers.data ?? [],
  };
}

function summarizeWorkers(
  data: Awaited<ReturnType<typeof loadWorkerData>>,
): WorkerSummary[] {
  const today = malaysiaDateInputValue();
  const projectNames = new Map(
    data.projects.map((project) => [project.id, project.name]),
  );
  const tradeNames = new Map(
    data.trades.map((trade) => [trade.id, trade.name]),
  );
  const skillNames = new Map(
    data.skills.map((skill) => [skill.id, skill.name]),
  );

  return data.workers.map((worker) => {
    const employment = data.employment.filter(
      (row) => row.worker_id === worker.id,
    );
    const classifications = data.classifications.filter(
      (row) => row.worker_id === worker.id,
    );
    const assignments = data.assignments.filter(
      (row) => row.worker_id === worker.id,
    );
    const documents = data.documents.filter(
      (row) => row.worker_id === worker.id && row.status === "ACTIVE",
    );
    const currentClassification = effective(classifications, today);
    const currentAssignment = effective(assignments, today);
    const warningStates = documents
      .filter((document) => document.file_kind === "DOCUMENT")
      .map((document) => documentExpiryState(document.expiry_date, today));
    const documentWarning = warningStates.includes("EXPIRED")
      ? "EXPIRED"
      : warningStates.includes("EXPIRING")
        ? "EXPIRING"
        : warningStates.includes("VALID")
          ? "VALID"
          : "NONE";

    return {
      ...worker,
      currentAssignment,
      currentClassification,
      currentEmployment: effective(employment, today),
      documentWarning,
      photoId:
        documents.find((document) => document.file_kind === "PHOTO")?.id ??
        null,
      projectName: currentAssignment
        ? (projectNames.get(currentAssignment.project_id) ?? "Unknown project")
        : null,
      skillName: currentClassification
        ? (skillNames.get(currentClassification.skill_level_id) ??
          "Unavailable skill")
        : null,
      tradeName: currentClassification
        ? (tradeNames.get(currentClassification.trade_id) ??
          "Unavailable trade")
        : null,
    };
  });
}

export async function listWorkers(filters?: {
  project?: string;
  query?: string;
  skill?: string;
  status?: string;
  trade?: string;
}) {
  const data = await loadWorkerData();
  const query = filters?.query?.trim().toLowerCase();
  return summarizeWorkers(data).filter((worker) => {
    const searchable = [
      worker.legal_name,
      worker.phone_number,
      worker.cnic_number,
      worker.passport_number,
      worker.projectName,
      worker.tradeName,
      worker.skillName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!query || searchable.includes(query)) &&
      (!filters?.project ||
        worker.currentAssignment?.project_id === filters.project) &&
      (!filters?.trade ||
        worker.currentClassification?.trade_id === filters.trade) &&
      (!filters?.skill ||
        worker.currentClassification?.skill_level_id === filters.skill) &&
      (!filters?.status || worker.currentEmployment?.status === filters.status)
    );
  });
}

export async function getWorker(
  workerId: string,
): Promise<WorkerDetail | null> {
  const data = await loadWorkerData();
  const summary = summarizeWorkers(data).find(
    (worker) => worker.id === workerId,
  );
  if (!summary) return null;

  const supabase = await createServerSupabaseClient();
  const [rates, deductions, documentTypes] = await Promise.all([
    supabase
      .from("worker_rate_periods")
      .select("*")
      .eq("worker_id", workerId)
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_food_deduction_periods")
      .select("*")
      .eq("worker_id", workerId)
      .order("starts_on", { ascending: false }),
    supabase.from("document_types").select("id,name").order("name"),
  ]);
  if (rates.error) throwQueryError("worker_rates", rates.error);
  if (deductions.error) throwQueryError("worker_deductions", deductions.error);
  if (documentTypes.error) {
    throwQueryError("worker_document_types", documentTypes.error);
  }

  const today = malaysiaDateInputValue();
  const projectNames = new Map(
    data.projects.map((project) => [project.id, project.name]),
  );
  const tradeNames = new Map(
    data.trades.map((trade) => [trade.id, trade.name]),
  );
  const skillNames = new Map(
    data.skills.map((skill) => [skill.id, skill.name]),
  );
  const documentTypeNames = new Map(
    documentTypes.data.map((type) => [type.id, type.name]),
  );

  return {
    ...summary,
    assignments: data.assignments
      .filter((row) => row.worker_id === workerId)
      .map((row) => ({
        ...row,
        projectName: projectNames.get(row.project_id) ?? "Unknown project",
      })),
    classifications: data.classifications
      .filter((row) => row.worker_id === workerId)
      .map((row) => ({
        ...row,
        skillName:
          skillNames.get(row.skill_level_id) ?? "Unavailable skill level",
        tradeName: tradeNames.get(row.trade_id) ?? "Unavailable trade",
      })),
    currentDeduction: effective(deductions.data, today),
    currentRate: effective(rates.data, today),
    documents: data.documents
      .filter((document) => document.worker_id === workerId)
      .map((document) => ({
        ...document,
        documentTypeName: document.document_type_id
          ? (documentTypeNames.get(document.document_type_id) ?? "Other")
          : null,
        expiryState: documentExpiryState(document.expiry_date, today),
      })),
    employment: data.employment.filter((row) => row.worker_id === workerId),
    foodDeductions: deductions.data,
    rates: rates.data,
  };
}

export async function getWorkerOptions() {
  const supabase = await createServerSupabaseClient();
  const [trades, skills, projects, documentTypes] = await Promise.all([
    supabase
      .from("trades")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("skill_levels")
      .select("id,name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("projects")
      .select("id,name")
      .in("status", ["PLANNED", "ACTIVE"])
      .order("name"),
    supabase
      .from("document_types")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);
  if (trades.error) throwQueryError("worker_options_trades", trades.error);
  if (skills.error) throwQueryError("worker_options_skills", skills.error);
  if (projects.error)
    throwQueryError("worker_options_projects", projects.error);
  if (documentTypes.error) {
    throwQueryError("worker_options_document_types", documentTypes.error);
  }
  return {
    documentTypes: documentTypes.data,
    projects: projects.data,
    skills: skills.data,
    trades: trades.data,
  };
}

export async function listDocumentTypes() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("document_types")
    .select("*")
    .order("name");
  if (error) throwQueryError("document_types", error);
  return data;
}

export async function getWorkerDashboardSummary() {
  const workers = await listWorkers();
  return {
    active: workers.filter(
      (worker) => worker.currentEmployment?.status === "ACTIVE",
    ).length,
    awaitingAssignment: workers.filter(
      (worker) =>
        worker.currentEmployment?.status === "ACTIVE" &&
        !worker.currentAssignment,
    ).length,
    documentAlerts: workers.filter((worker) =>
      ["EXPIRED", "EXPIRING"].includes(worker.documentWarning),
    ).length,
    leftOrArchived: workers.filter((worker) =>
      ["LEFT_COMPANY", "ARCHIVED"].includes(
        worker.currentEmployment?.status ?? "",
      ),
    ).length,
    suspended: workers.filter(
      (worker) => worker.currentEmployment?.status === "SUSPENDED",
    ).length,
    total: workers.length,
  };
}

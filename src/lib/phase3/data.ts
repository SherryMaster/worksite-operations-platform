import "server-only";

import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { documentExpiryState } from "@/lib/phase3/format";
import { throwDependencyError } from "@/lib/server/dependency-error";
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
  identityDocuments: {
    cnic: string | null;
    passport: string | null;
    workPermit: string | null;
  };
  photoId: string | null;
  primaryIdentifier: {
    documentId: string;
    number: string;
    systemCode: string;
    typeName: string;
  } | null;
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
      documentTypeSystemCode: string | null;
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
  throwDependencyError(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "read",
    routeFamily: "/ceo|foreman/workers",
    surface: "server_component",
  });
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

function isEmploymentStatus(value: string): value is Employment["status"] {
  return ["ACTIVE", "ARCHIVED", "LEFT_COMPANY", "SUSPENDED"].includes(value);
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
    documentTypes,
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
    supabase.from("document_types").select("id,name,system_code").order("name"),
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
    ["worker_document_types", documentTypes],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  return {
    assignments: assignments.data ?? [],
    classifications: classifications.data ?? [],
    documents: documents.data ?? [],
    documentTypes: documentTypes.data ?? [],
    employment: employment.data ?? [],
    projects: projects.data ?? [],
    skills: skills.data ?? [],
    trades: trades.data ?? [],
    workers: workers.data ?? [],
  };
}

async function loadWorkerDataForIds(workerIds: string[]) {
  const supabase = await createServerSupabaseClient();
  if (workerIds.length === 0) {
    return {
      assignments: [],
      classifications: [],
      documents: [],
      documentTypes: [],
      employment: [],
      projects: [],
      skills: [],
      trades: [],
      workers: [],
    } satisfies Awaited<ReturnType<typeof loadWorkerData>>;
  }

  const [
    workers,
    employment,
    classifications,
    assignments,
    projects,
    trades,
    skills,
    documents,
    documentTypes,
  ] = await Promise.all([
    supabase.from("workers").select("*").in("id", workerIds),
    supabase
      .from("worker_employment_periods")
      .select("*")
      .in("worker_id", workerIds)
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_classification_periods")
      .select("*")
      .in("worker_id", workerIds)
      .order("starts_on", { ascending: false }),
    supabase
      .from("worker_project_assignments")
      .select("*")
      .in("worker_id", workerIds)
      .order("starts_on", { ascending: false }),
    supabase.from("projects").select("id,name,status").order("name"),
    supabase.from("trades").select("id,name,is_active").order("name"),
    supabase.from("skill_levels").select("id,name,is_active").order("name"),
    supabase
      .from("worker_documents")
      .select("*")
      .in("worker_id", workerIds)
      .order("created_at", { ascending: false }),
    supabase.from("document_types").select("id,name,system_code").order("name"),
  ]);

  for (const [operation, result] of [
    ["worker_page", workers],
    ["worker_page_employment", employment],
    ["worker_page_classification", classifications],
    ["worker_page_assignments", assignments],
    ["worker_page_projects", projects],
    ["worker_page_trades", trades],
    ["worker_page_skills", skills],
    ["worker_page_documents", documents],
    ["worker_page_document_types", documentTypes],
  ] as const) {
    if (result.error) throwQueryError(operation, result.error);
  }

  const workersById = new Map(
    (workers.data ?? []).map((worker) => [worker.id, worker]),
  );
  return {
    assignments: assignments.data ?? [],
    classifications: classifications.data ?? [],
    documents: documents.data ?? [],
    documentTypes: documentTypes.data ?? [],
    employment: employment.data ?? [],
    projects: projects.data ?? [],
    skills: skills.data ?? [],
    trades: trades.data ?? [],
    workers: workerIds
      .map((workerId) => workersById.get(workerId))
      .filter((worker): worker is Tables<"workers"> => Boolean(worker)),
  };
}

function intersectWorkerIds(sets: string[][]): string[] | null {
  if (sets.length === 0) return null;
  return sets
    .slice(1)
    .reduce(
      (current, next) => current.filter((workerId) => next.includes(workerId)),
      sets[0],
    );
}

export async function listWorkersPage({
  page = 1,
  pageSize = 25,
  project,
  query,
  skill,
  status,
  trade,
}: {
  page?: number;
  pageSize?: number;
  project?: string;
  query?: string;
  skill?: string;
  status?: string;
  trade?: string;
}) {
  const supabase = await createServerSupabaseClient();
  const today = malaysiaDateInputValue();
  const relatedFilters: string[][] = [];
  const currentPeriod = `ends_on.is.null,ends_on.gt.${today}`;

  if (project) {
    const result = await supabase
      .from("worker_project_assignments")
      .select("worker_id")
      .eq("project_id", project)
      .lte("starts_on", today)
      .or(currentPeriod);
    if (result.error)
      throwQueryError("worker_page_project_filter", result.error);
    relatedFilters.push(result.data.map((row) => row.worker_id));
  }

  if (trade || skill) {
    let classificationQuery = supabase
      .from("worker_classification_periods")
      .select("worker_id")
      .lte("starts_on", today)
      .or(currentPeriod);
    if (trade) classificationQuery = classificationQuery.eq("trade_id", trade);
    if (skill) {
      classificationQuery = classificationQuery.eq("skill_level_id", skill);
    }
    const result = await classificationQuery;
    if (result.error) {
      throwQueryError("worker_page_classification_filter", result.error);
    }
    relatedFilters.push(result.data.map((row) => row.worker_id));
  }

  if (status && isEmploymentStatus(status)) {
    const result = await supabase
      .from("worker_employment_periods")
      .select("worker_id")
      .eq("status", status)
      .lte("starts_on", today)
      .or(currentPeriod);
    if (result.error)
      throwQueryError("worker_page_status_filter", result.error);
    relatedFilters.push(result.data.map((row) => row.worker_id));
  }

  const normalizedQuery = query?.trim().replace(/[%_,]/g, "");
  if (normalizedQuery) {
    const pattern = `%${normalizedQuery}%`;
    const [profileMatches, documentMatches] = await Promise.all([
      supabase
        .from("workers")
        .select("id")
        .or(`legal_name.ilike.${pattern},phone_number.ilike.${pattern}`),
      supabase
        .from("worker_documents")
        .select("worker_id")
        .eq("status", "ACTIVE")
        .ilike("document_number", pattern),
    ]);
    if (profileMatches.error) {
      throwQueryError("worker_page_profile_search", profileMatches.error);
    }
    if (documentMatches.error) {
      throwQueryError("worker_page_document_search", documentMatches.error);
    }
    relatedFilters.push([
      ...new Set([
        ...profileMatches.data.map((row) => row.id),
        ...documentMatches.data.map((row) => row.worker_id),
      ]),
    ]);
  }

  const matchingIds = intersectWorkerIds(relatedFilters);
  if (matchingIds?.length === 0) {
    return { items: [] as WorkerSummary[], page: 1, pageCount: 1, total: 0 };
  }

  const safePageSize = Math.min(Math.max(pageSize, 1), 100);
  const safePage = Math.max(page, 1);
  let workersQuery = supabase
    .from("workers")
    .select("id", { count: "exact" })
    .order("legal_name");

  if (matchingIds) workersQuery = workersQuery.in("id", matchingIds);
  const from = (safePage - 1) * safePageSize;
  const result = await workersQuery.range(from, from + safePageSize - 1);
  if (result.error) throwQueryError("worker_page", result.error);

  const total = result.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / safePageSize));
  if (safePage > pageCount) {
    return listWorkersPage({
      page: pageCount,
      pageSize: safePageSize,
      project,
      query,
      skill,
      status,
      trade,
    });
  }

  const workerIds = result.data.map((worker) => worker.id);
  const data = await loadWorkerDataForIds(workerIds);
  return {
    items: summarizeWorkers(data),
    page: safePage,
    pageCount,
    total,
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
  const documentTypes = new Map(
    data.documentTypes.map((type) => [type.id, type]),
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
    const primaryDocument = documents.find((document) => {
      const code = document.document_type_id
        ? documentTypes.get(document.document_type_id)?.system_code
        : null;
      return (
        document.file_kind === "DOCUMENT" &&
        Boolean(document.document_number) &&
        ["CNIC", "PASSPORT"].includes(code ?? "")
      );
    });
    const primaryType = primaryDocument?.document_type_id
      ? documentTypes.get(primaryDocument.document_type_id)
      : null;
    const identityNumber = (systemCode: string) =>
      documents.find(
        (document) =>
          document.file_kind === "DOCUMENT" &&
          document.document_type_id &&
          documentTypes.get(document.document_type_id)?.system_code ===
            systemCode,
      )?.document_number ?? null;

    return {
      ...worker,
      currentAssignment,
      currentClassification,
      currentEmployment: effective(employment, today),
      documentWarning,
      identityDocuments: {
        cnic: identityNumber("CNIC"),
        passport: identityNumber("PASSPORT"),
        workPermit: identityNumber("WORK_PERMIT"),
      },
      photoId:
        documents.find((document) => document.file_kind === "PHOTO")?.id ??
        null,
      primaryIdentifier:
        primaryDocument?.document_number && primaryType?.system_code
          ? {
              documentId: primaryDocument.id,
              number: primaryDocument.document_number,
              systemCode: primaryType.system_code,
              typeName: primaryType.name,
            }
          : null,
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
      worker.primaryIdentifier?.number,
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
  const data = await loadWorkerDataForIds([workerId]);
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
    supabase.from("document_types").select("id,name,system_code").order("name"),
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
        documentTypeSystemCode: document.document_type_id
          ? (documentTypes.data.find(
              (type) => type.id === document.document_type_id,
            )?.system_code ?? null)
          : null,
        expiryState: documentExpiryState(document.expiry_date, today),
      })),
    employment: data.employment.filter((row) => row.worker_id === workerId),
    foodDeductions: deductions.data,
    rates: rates.data,
  };
}

export async function getWorkerIdentity(workerId: string) {
  const supabase = await createServerSupabaseClient();
  const result = await supabase
    .from("workers")
    .select("id")
    .eq("id", workerId)
    .maybeSingle();
  if (result.error) throwQueryError("worker_identity", result.error);
  return result.data;
}

export async function getWorkerCore(workerId: string) {
  const data = await loadWorkerDataForIds([workerId]);
  return (
    summarizeWorkers(data).find((worker) => worker.id === workerId) ?? null
  );
}

export async function getWorkerEditDefaults(workerId: string) {
  const corePromise = getWorkerCore(workerId);
  const supabase = await createServerSupabaseClient();
  const [core, rates, deductions, documents] = await Promise.all([
    corePromise,
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
    supabase
      .from("worker_documents")
      .select("*")
      .eq("worker_id", workerId)
      .eq("status", "ACTIVE")
      .order("created_at"),
  ]);
  if (rates.error) throwQueryError("worker_edit_rates", rates.error);
  if (deductions.error) {
    throwQueryError("worker_edit_deductions", deductions.error);
  }
  if (documents.error)
    throwQueryError("worker_edit_documents", documents.error);
  if (!core) return null;
  const today = malaysiaDateInputValue();
  return {
    ...core,
    currentDeduction: effective(deductions.data ?? [], today),
    currentRate: effective(rates.data ?? [], today),
    documents: documents.data ?? [],
  };
}

export async function getWorkerForSection(
  workerId: string,
  section: string,
  corePromise: ReturnType<typeof getWorkerCore> = getWorkerCore(workerId),
): Promise<WorkerDetail | null> {
  const core = await corePromise;
  if (!core) return null;
  const supabase = await createServerSupabaseClient();
  const today = malaysiaDateInputValue();
  let assignments: WorkerDetail["assignments"] = [];
  let documents: WorkerDetail["documents"] = [];
  let employment: Employment[] = [];
  let rates: Rate[] = [];
  let foodDeductions: Deduction[] = [];
  let classifications: WorkerDetail["classifications"] = [];

  if (section === "work-history") {
    const [
      employmentResult,
      assignmentResult,
      classificationResult,
      rateResult,
      deductionResult,
      projectResult,
      tradeResult,
      skillResult,
    ] = await Promise.all([
      supabase
        .from("worker_employment_periods")
        .select("*")
        .eq("worker_id", workerId)
        .order("starts_on", { ascending: false }),
      supabase
        .from("worker_project_assignments")
        .select("*")
        .eq("worker_id", workerId)
        .order("starts_on", { ascending: false }),
      supabase
        .from("worker_classification_periods")
        .select("*")
        .eq("worker_id", workerId)
        .order("starts_on", { ascending: false }),
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
      supabase.from("projects").select("id,name"),
      supabase.from("trades").select("id,name"),
      supabase.from("skill_levels").select("id,name"),
    ]);
    if (employmentResult.error) {
      throwQueryError("worker_section_employment", employmentResult.error);
    }
    if (assignmentResult.error) {
      throwQueryError("worker_section_assignments", assignmentResult.error);
    }
    if (classificationResult.error) {
      throwQueryError(
        "worker_section_classifications",
        classificationResult.error,
      );
    }
    if (rateResult.error)
      throwQueryError("worker_section_rates", rateResult.error);
    if (deductionResult.error) {
      throwQueryError("worker_section_deductions", deductionResult.error);
    }
    if (projectResult.error) {
      throwQueryError("worker_section_projects", projectResult.error);
    }
    if (tradeResult.error)
      throwQueryError("worker_section_trades", tradeResult.error);
    if (skillResult.error)
      throwQueryError("worker_section_skills", skillResult.error);
    const projectNames = new Map(
      (projectResult.data ?? []).map((project) => [project.id, project.name]),
    );
    assignments = (assignmentResult.data ?? []).map((assignment) => ({
      ...assignment,
      projectName: projectNames.get(assignment.project_id) ?? "Unknown project",
    }));
    const tradeNames = new Map(
      tradeResult.data.map((item) => [item.id, item.name]),
    );
    const skillNames = new Map(
      skillResult.data.map((item) => [item.id, item.name]),
    );
    classifications = classificationResult.data.map((item) => ({
      ...item,
      skillName: skillNames.get(item.skill_level_id) ?? "Unavailable skill",
      tradeName: tradeNames.get(item.trade_id) ?? "Unavailable trade",
    }));
    employment = employmentResult.data;
    rates = rateResult.data;
    foodDeductions = deductionResult.data;
  }

  if (section === "overview") {
    const [rateResult, deductionResult, documentResult, typeResult] =
      await Promise.all([
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
        supabase
          .from("worker_documents")
          .select("*")
          .eq("worker_id", workerId)
          .eq("file_kind", "DOCUMENT")
          .eq("status", "ACTIVE")
          .order("created_at", { ascending: false }),
        supabase.from("document_types").select("id,name,system_code"),
      ]);
    if (rateResult.error)
      throwQueryError("worker_section_rates", rateResult.error);
    if (deductionResult.error) {
      throwQueryError("worker_section_deductions", deductionResult.error);
    }
    if (documentResult.error)
      throwQueryError("worker_overview_documents", documentResult.error);
    if (typeResult.error)
      throwQueryError("worker_overview_document_types", typeResult.error);
    rates = rateResult.data ?? [];
    foodDeductions = deductionResult.data ?? [];
    documents = (documentResult.data ?? []).map((document) => {
      const type = typeResult.data.find(
        (item) => item.id === document.document_type_id,
      );
      return {
        ...document,
        documentTypeName: type?.name ?? "Document",
        documentTypeSystemCode: type?.system_code ?? null,
        expiryState: documentExpiryState(document.expiry_date, today),
      };
    });
  }

  if (section === "documents") {
    const [documentResult, typeResult] = await Promise.all([
      supabase
        .from("worker_documents")
        .select("*")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("document_types")
        .select("id,name,system_code")
        .order("name"),
    ]);
    if (documentResult.error) {
      throwQueryError("worker_section_documents", documentResult.error);
    }
    if (typeResult.error) {
      throwQueryError("worker_section_document_types", typeResult.error);
    }
    const typeNames = new Map(
      (typeResult.data ?? []).map((type) => [type.id, type.name]),
    );
    documents = (documentResult.data ?? []).map((document) => ({
      ...document,
      documentTypeName: document.document_type_id
        ? (typeNames.get(document.document_type_id) ?? "Other")
        : null,
      documentTypeSystemCode: document.document_type_id
        ? (typeResult.data.find((type) => type.id === document.document_type_id)
            ?.system_code ?? null)
        : null,
      expiryState: documentExpiryState(document.expiry_date, today),
    }));
  }

  return {
    ...core,
    assignments,
    classifications,
    currentDeduction: effective(foodDeductions, today),
    currentRate: effective(rates, today),
    documents,
    employment,
    foodDeductions,
    rates,
  };
}

export const getWorkerForTab = getWorkerForSection;

export async function getWorkerOptions() {
  const supabase = await createServerSupabaseClient();
  const [projects, trades, skills, documentTypes] = await Promise.all([
    supabase.from("projects").select("id,name").order("name"),
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
      .from("document_types")
      .select("*")
      .eq("is_active", true)
      .order("name"),
  ]);
  if (projects.error)
    throwQueryError("worker_options_projects", projects.error);
  if (trades.error) throwQueryError("worker_options_trades", trades.error);
  if (skills.error) throwQueryError("worker_options_skills", skills.error);
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

export async function listActiveDocumentTypes() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("document_types")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throwQueryError("active_document_types", error);
  return data;
}

export async function listAssignableProjects() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name")
    .in("status", ["PLANNED", "ACTIVE"])
    .order("name");
  if (error) throwQueryError("assignable_worker_projects", error);
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

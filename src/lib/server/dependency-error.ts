import "server-only";

import { randomUUID } from "node:crypto";

import { logger } from "@/lib/server/logger";

export type Dependency =
  | "APP_AUTH"
  | "CLERK_BACKEND"
  | "CLERK_FRONTEND"
  | "CLIENT_STORAGE"
  | "NETWORK"
  | "SERVICE_WORKER"
  | "SUPABASE_DATA"
  | "SUPABASE_STORAGE"
  | "UNKNOWN";

export type DependencyCategory =
  | "AUTH_HEADER_MISSING"
  | "AUTH_PENDING_OR_SPLIT_STATE"
  | "AUTH_SIGNED_OUT"
  | "AUTH_TOKEN_INVALID"
  | "AUTHORIZATION_DENIED"
  | "CLIENT_STORAGE"
  | "CLERK_BACKEND_TRANSIENT"
  | "CLERK_FRONTEND_TRANSIENT"
  | "NETWORK_TRANSIENT"
  | "NETWORK_OFFLINE_HINT"
  | "SERVICE_WORKER_VERSION"
  | "STORAGE_AUTH"
  | "STORAGE_TRANSIENT"
  | "SUPABASE_QUERY_OR_DATA"
  | "SUPABASE_SCHEMA"
  | "SUPABASE_TRANSIENT"
  | "UNKNOWN_RENDER";

export type DependencySurface =
  | "client_storage"
  | "layout"
  | "request_context"
  | "route_handler"
  | "server_action"
  | "server_component"
  | "service_worker"
  | "storage";

export type DependencyOperationKind = "read" | "write";

type ProviderErrorShape = {
  code?: unknown;
  name?: unknown;
  status?: unknown;
  statusCode?: unknown;
};

export type DependencyFailureContext = {
  attempt?: 0 | 1;
  dependency: Dependency;
  idempotent?: boolean;
  operation: string;
  operationKind: DependencyOperationKind;
  routeFamily: string;
  surface: DependencySurface;
};

export type DependencyClassification = {
  category: DependencyCategory;
  dependency: Dependency;
  httpStatus?: number;
  providerCode?: string;
  retryable: boolean;
};

const authenticationCodes = new Map<string, DependencyCategory>([
  ["PGRST301", "AUTH_TOKEN_INVALID"],
  ["PGRST302", "AUTH_HEADER_MISSING"],
  ["PGRST303", "AUTH_TOKEN_INVALID"],
]);
const schemaCodes = new Set([
  "42P01",
  "42703",
  "42883",
  "PGRST200",
  "PGRST201",
  "PGRST202",
  "PGRST203",
  "PGRST204",
  "PGRST205",
]);
const networkCodes = new Set([
  "ECONNABORTED",
  "ECONNREFUSED",
  "ECONNRESET",
  "ENETUNREACH",
  "ENOTFOUND",
  "ETIMEDOUT",
]);

function providerDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return { name: undefined, providerCode: undefined, status: undefined };
  }
  const candidate = error as ProviderErrorShape;
  const providerCode =
    typeof candidate.code === "string"
      ? candidate.code.slice(0, 64)
      : undefined;
  const name =
    typeof candidate.name === "string"
      ? candidate.name.slice(0, 64)
      : undefined;
  const rawStatus = candidate.status ?? candidate.statusCode;
  const status =
    typeof rawStatus === "number" && Number.isInteger(rawStatus)
      ? rawStatus
      : typeof rawStatus === "string" && /^\d{3}$/.test(rawStatus)
        ? Number(rawStatus)
        : undefined;
  return { name, providerCode, status };
}

function isNetworkFailure(error: unknown, code?: string, name?: string) {
  if (error instanceof TypeError) return true;
  if (code && networkCodes.has(code.toUpperCase())) return true;
  return Boolean(name && /ClerkOffline|Network|Timeout|Abort/i.test(name));
}

function mayRetry(
  category: DependencyCategory,
  operationKind: DependencyOperationKind,
  idempotent: boolean,
) {
  if (operationKind === "write" && !idempotent) return false;
  return [
    "AUTH_HEADER_MISSING",
    "AUTH_PENDING_OR_SPLIT_STATE",
    "AUTH_TOKEN_INVALID",
    "CLERK_BACKEND_TRANSIENT",
    "CLERK_FRONTEND_TRANSIENT",
    "NETWORK_TRANSIENT",
    "STORAGE_TRANSIENT",
    "SUPABASE_TRANSIENT",
  ].includes(category);
}

export function classifyDependencyError(
  error: unknown,
  context: Pick<
    DependencyFailureContext,
    "dependency" | "idempotent" | "operationKind"
  >,
): DependencyClassification {
  const { name, providerCode, status } = providerDetails(error);
  const authCategory = providerCode
    ? authenticationCodes.get(providerCode)
    : undefined;
  let category: DependencyCategory;

  if (authCategory) {
    category = authCategory;
  } else if (providerCode === "SIGNED_OUT") {
    category = "AUTH_SIGNED_OUT";
  } else if (providerCode === "AUTH_PENDING") {
    category = "AUTH_PENDING_OR_SPLIT_STATE";
  } else if (providerCode === "OFFLINE_HINT") {
    category = "NETWORK_OFFLINE_HINT";
  } else if (providerCode === "SERVICE_WORKER_VERSION") {
    category = "SERVICE_WORKER_VERSION";
  } else if (context.dependency === "CLIENT_STORAGE") {
    category = "CLIENT_STORAGE";
  } else if (schemaCodes.has(providerCode ?? "")) {
    category = "SUPABASE_SCHEMA";
  } else if (providerCode === "42501" || status === 403) {
    category =
      context.dependency === "SUPABASE_STORAGE"
        ? "STORAGE_AUTH"
        : "AUTHORIZATION_DENIED";
  } else if (status === 401) {
    category =
      context.dependency === "SUPABASE_STORAGE"
        ? "STORAGE_AUTH"
        : "AUTH_TOKEN_INVALID";
  } else if (
    providerCode === "" &&
    (context.dependency === "SUPABASE_DATA" ||
      context.dependency === "SUPABASE_STORAGE")
  ) {
    category =
      context.dependency === "SUPABASE_STORAGE"
        ? "STORAGE_TRANSIENT"
        : "SUPABASE_TRANSIENT";
  } else if (isNetworkFailure(error, providerCode, name)) {
    category =
      context.dependency === "CLERK_FRONTEND"
        ? "CLERK_FRONTEND_TRANSIENT"
        : context.dependency === "CLERK_BACKEND"
          ? "CLERK_BACKEND_TRANSIENT"
          : context.dependency === "SUPABASE_STORAGE"
            ? "STORAGE_TRANSIENT"
            : context.dependency === "SUPABASE_DATA"
              ? "SUPABASE_TRANSIENT"
              : "NETWORK_TRANSIENT";
  } else if (
    status === 408 ||
    status === 429 ||
    (status !== undefined && status >= 500) ||
    providerCode === "PGRSTX00" ||
    providerCode?.startsWith("PGRST00") ||
    providerCode?.startsWith("08")
  ) {
    category =
      context.dependency === "CLERK_BACKEND"
        ? "CLERK_BACKEND_TRANSIENT"
        : context.dependency === "CLERK_FRONTEND"
          ? "CLERK_FRONTEND_TRANSIENT"
          : context.dependency === "SUPABASE_STORAGE"
            ? "STORAGE_TRANSIENT"
            : context.dependency === "SUPABASE_DATA"
              ? "SUPABASE_TRANSIENT"
              : "NETWORK_TRANSIENT";
  } else if (context.dependency === "SUPABASE_DATA") {
    category = "SUPABASE_QUERY_OR_DATA";
  } else if (
    context.dependency === "SUPABASE_STORAGE" &&
    status !== undefined &&
    status >= 400 &&
    status < 500
  ) {
    category = "UNKNOWN_RENDER";
  } else if (context.dependency === "SUPABASE_STORAGE") {
    category = "STORAGE_TRANSIENT";
  } else {
    category = "UNKNOWN_RENDER";
  }

  return {
    category,
    dependency: context.dependency,
    httpStatus:
      status ??
      (category === "AUTH_HEADER_MISSING" || category === "AUTH_TOKEN_INVALID"
        ? 401
        : undefined),
    providerCode,
    retryable: mayRetry(
      category,
      context.operationKind,
      context.idempotent ?? false,
    ),
  };
}

function publicMessage(category: DependencyCategory) {
  if (category === "AUTH_SIGNED_OUT") return "Sign in is required.";
  if (
    category === "AUTH_HEADER_MISSING" ||
    category === "AUTH_PENDING_OR_SPLIT_STATE" ||
    category === "AUTH_TOKEN_INVALID"
  ) {
    return "Your secure session needs to be refreshed.";
  }
  if (
    category === "CLERK_BACKEND_TRANSIENT" ||
    category === "CLERK_FRONTEND_TRANSIENT"
  ) {
    return "The account service is temporarily unavailable.";
  }
  if (category === "AUTHORIZATION_DENIED" || category === "STORAGE_AUTH") {
    return "This account is not authorized for that operation.";
  }
  if (
    category === "NETWORK_TRANSIENT" ||
    category === "STORAGE_TRANSIENT" ||
    category === "SUPABASE_TRANSIENT"
  ) {
    return "A required service is temporarily unavailable.";
  }
  return "The requested operation could not be completed.";
}

export class DependencyError extends Error {
  readonly category: DependencyCategory;
  readonly dependency: Dependency;
  readonly digest: string;
  readonly httpStatus?: number;
  readonly providerCode?: string;
  readonly retryable: boolean;

  constructor(
    classification: DependencyClassification,
    reference: string,
    cause?: unknown,
  ) {
    super(publicMessage(classification.category), { cause });
    this.name = "DependencyError";
    this.category = classification.category;
    this.dependency = classification.dependency;
    this.digest = reference;
    this.httpStatus = classification.httpStatus;
    this.providerCode = classification.providerCode;
    this.retryable = classification.retryable;
  }
}

export function recordDependencyFailure(
  error: unknown,
  context: DependencyFailureContext,
) {
  if (error instanceof DependencyError) return error;
  const classification = classifyDependencyError(error, context);
  const reference = randomUUID();
  const failure = new DependencyError(classification, reference, error);
  logger.error("external_dependency_failed", {
    attempt: context.attempt ?? 0,
    category: failure.category,
    correlationId: reference,
    dependency: failure.dependency,
    digest: reference,
    httpStatus: failure.httpStatus,
    operation: context.operation,
    providerCode: failure.providerCode,
    retryable: failure.retryable,
    routeFamily: context.routeFamily,
    surface: context.surface,
  });
  return failure;
}

export function throwDependencyError(
  error: unknown,
  context: DependencyFailureContext,
): never {
  throw recordDependencyFailure(error, context);
}

export function isDependencyError(error: unknown): error is DependencyError {
  return error instanceof DependencyError;
}

export function isRecoverableDependencyFailure(error: DependencyError) {
  return (
    error.category.startsWith("AUTH_") || error.category.endsWith("_TRANSIENT")
  );
}

export function dependencyActionMessage(error: DependencyError) {
  const reference = ` Reference: ${error.digest}.`;
  if (
    error.category === "AUTH_HEADER_MISSING" ||
    error.category === "AUTH_PENDING_OR_SPLIT_STATE" ||
    error.category === "AUTH_SIGNED_OUT" ||
    error.category === "AUTH_TOKEN_INVALID"
  ) {
    return `Your session needs attention. Your change was not replayed; refresh or sign in again, then deliberately submit it once more.${reference}`;
  }
  if (
    error.category === "CLERK_BACKEND_TRANSIENT" ||
    error.category === "CLERK_FRONTEND_TRANSIENT" ||
    error.category === "NETWORK_TRANSIENT" ||
    error.category === "STORAGE_TRANSIENT" ||
    error.category === "SUPABASE_TRANSIENT"
  ) {
    return `A required service is temporarily unavailable. Your change was not replayed; try submitting it again when the connection is stable.${reference}`;
  }
  return `${error.message}${reference}`;
}

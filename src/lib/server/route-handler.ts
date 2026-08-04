import "server-only";

import {
  type DependencyCategory,
  type DependencyFailureContext,
  isDependencyError,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";

export function dependencyHttpStatus(
  category: DependencyCategory,
  providerStatus?: number,
) {
  if (providerStatus === 408 || providerStatus === 429) return providerStatus;
  if (
    category === "AUTH_HEADER_MISSING" ||
    category === "AUTH_PENDING_OR_SPLIT_STATE" ||
    category === "AUTH_SIGNED_OUT" ||
    category === "AUTH_TOKEN_INVALID"
  ) {
    return 401;
  }
  if (category === "AUTHORIZATION_DENIED" || category === "STORAGE_AUTH") {
    return 403;
  }
  if (
    category === "CLERK_BACKEND_TRANSIENT" ||
    category === "CLERK_FRONTEND_TRANSIENT" ||
    category === "NETWORK_TRANSIENT" ||
    category === "STORAGE_TRANSIENT" ||
    category === "SUPABASE_TRANSIENT"
  ) {
    return 503;
  }
  return 500;
}

export function dependencyPublicCode(category: DependencyCategory) {
  if (category === "AUTH_SIGNED_OUT") return "SIGN_IN_REQUIRED";
  if (
    category === "AUTH_HEADER_MISSING" ||
    category === "AUTH_PENDING_OR_SPLIT_STATE" ||
    category === "AUTH_TOKEN_INVALID"
  ) {
    return "SESSION_REFRESH_REQUIRED";
  }
  if (category === "AUTHORIZATION_DENIED" || category === "STORAGE_AUTH") {
    return "ACCESS_DENIED";
  }
  if (
    category === "CLERK_BACKEND_TRANSIENT" ||
    category === "CLERK_FRONTEND_TRANSIENT" ||
    category === "NETWORK_TRANSIENT" ||
    category === "STORAGE_TRANSIENT" ||
    category === "SUPABASE_TRANSIENT"
  ) {
    return "DEPENDENCY_UNAVAILABLE";
  }
  if (category === "SUPABASE_SCHEMA") return "SERVICE_CONFIGURATION_ERROR";
  return "REQUEST_FAILED";
}

type HandlerContext = Omit<
  DependencyFailureContext,
  "attempt" | "dependency" | "idempotent" | "operationKind"
> & {
  operationKind?: DependencyFailureContext["operationKind"];
};

export function withDependencyRouteHandler<Arguments extends unknown[]>(
  handler: (...args: Arguments) => Promise<Response>,
  context: HandlerContext,
) {
  return async (...args: Arguments): Promise<Response> => {
    try {
      const response = await handler(...args);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    } catch (error) {
      const failure = isDependencyError(error)
        ? error
        : recordDependencyFailure(error, {
            ...context,
            dependency: "UNKNOWN",
            operationKind: context.operationKind ?? "read",
          });
      return Response.json(
        {
          error: {
            code: dependencyPublicCode(failure.category),
            reference: failure.digest,
            retryable: failure.retryable,
          },
        },
        {
          headers: { "Cache-Control": "private, no-store" },
          status: dependencyHttpStatus(failure.category, failure.httpStatus),
        },
      );
    }
  };
}

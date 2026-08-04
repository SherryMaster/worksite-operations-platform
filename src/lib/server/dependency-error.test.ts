import { describe, expect, it, vi } from "vitest";

import {
  classifyDependencyError,
  dependencyActionMessage,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";

const errorLog = vi.hoisted(() => vi.fn());

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: errorLog, info: vi.fn(), warn: vi.fn() },
}));

const readContext = {
  dependency: "SUPABASE_DATA" as const,
  operationKind: "read" as const,
};

describe("dependency error classification", () => {
  it.each([
    ["PGRST301", "AUTH_TOKEN_INVALID"],
    ["PGRST302", "AUTH_HEADER_MISSING"],
    ["PGRST303", "AUTH_TOKEN_INVALID"],
  ])("classifies %s as an authentication failure", (code, category) => {
    expect(classifyDependencyError({ code }, readContext)).toMatchObject({
      category,
      httpStatus: 401,
      providerCode: code,
      retryable: true,
    });
  });

  it.each(["PGRST204", "PGRST205", "42P01", "42703", "42883"])(
    "classifies %s as schema rather than authentication",
    (code) => {
      expect(classifyDependencyError({ code }, readContext)).toMatchObject({
        category: "SUPABASE_SCHEMA",
        retryable: false,
      });
    },
  );

  it("keeps policy denial separate from token refresh", () => {
    expect(
      classifyDependencyError({ code: "42501", status: 403 }, readContext),
    ).toMatchObject({ category: "AUTHORIZATION_DENIED", retryable: false });
  });

  it.each([
    [{ status: 408 }, "SUPABASE_TRANSIENT"],
    [{ status: 429 }, "SUPABASE_TRANSIENT"],
    [{ status: 503 }, "SUPABASE_TRANSIENT"],
    [{ code: "PGRSTX00" }, "SUPABASE_TRANSIENT"],
    [{ code: "", message: "TypeError: Failed to fetch" }, "SUPABASE_TRANSIENT"],
    [new TypeError("failed to fetch"), "SUPABASE_TRANSIENT"],
  ])("classifies provider outage %# as transient", (error, category) => {
    expect(classifyDependencyError(error, readContext)).toMatchObject({
      category,
      retryable: true,
    });
  });

  it("distinguishes Clerk and generic network failures", () => {
    expect(
      classifyDependencyError(
        { name: "ClerkOfflineError" },
        { dependency: "CLERK_BACKEND", operationKind: "read" },
      ),
    ).toMatchObject({ category: "CLERK_BACKEND_TRANSIENT" });
    expect(
      classifyDependencyError(new TypeError("DNS failed"), {
        dependency: "NETWORK",
        operationKind: "read",
      }),
    ).toMatchObject({ category: "NETWORK_TRANSIENT" });
  });

  it("separates Storage authorization, Storage outages, and client state", () => {
    expect(
      classifyDependencyError(
        { statusCode: "401" },
        { dependency: "SUPABASE_STORAGE", operationKind: "read" },
      ),
    ).toMatchObject({ category: "STORAGE_AUTH", retryable: false });
    expect(
      classifyDependencyError(
        { statusCode: "503" },
        { dependency: "SUPABASE_STORAGE", operationKind: "read" },
      ),
    ).toMatchObject({ category: "STORAGE_TRANSIENT", retryable: true });
    expect(
      classifyDependencyError(new Error("quota"), {
        dependency: "CLIENT_STORAGE",
        operationKind: "write",
      }),
    ).toMatchObject({ category: "CLIENT_STORAGE", retryable: false });
    expect(
      classifyDependencyError(
        { code: "SERVICE_WORKER_VERSION" },
        { dependency: "SERVICE_WORKER", operationKind: "read" },
      ),
    ).toMatchObject({ category: "SERVICE_WORKER_VERSION", retryable: false });
  });

  it("does not retry mutations even when their provider failure is transient", () => {
    const failure = recordDependencyFailure(
      { code: "PGRST303", message: "provider payload" },
      {
        dependency: "SUPABASE_DATA",
        operation: "worker_record_save",
        operationKind: "write",
        routeFamily: "/ceo/workers",
        surface: "server_action",
      },
    );

    expect(failure.retryable).toBe(false);
    expect(dependencyActionMessage(failure)).toMatch(/not replayed/i);
    expect(dependencyActionMessage(failure)).toContain(failure.digest);
  });

  it("keeps provider payloads out of public failures and structured logs", () => {
    const failure = recordDependencyFailure(
      {
        code: "PGRST303",
        message: "jwt=secret-provider-payload",
        token: "secret-token",
      },
      {
        dependency: "SUPABASE_DATA",
        operation: "worker_options_trades",
        operationKind: "read",
        routeFamily: "/ceo/workers",
        surface: "server_component",
      },
    );

    expect(failure.message).not.toContain("secret-provider-payload");
    expect(JSON.stringify(errorLog.mock.lastCall)).not.toContain(
      "secret-token",
    );
    expect(errorLog).toHaveBeenLastCalledWith(
      "external_dependency_failed",
      expect.objectContaining({
        category: "AUTH_TOKEN_INVALID",
        correlationId: failure.digest,
        digest: failure.digest,
        operation: "worker_options_trades",
        providerCode: "PGRST303",
      }),
    );
  });

  it("classifies an unknown render failure without inventing a retry", () => {
    expect(
      classifyDependencyError(new Error("unexpected"), {
        dependency: "UNKNOWN",
        operationKind: "read",
      }),
    ).toMatchObject({ category: "UNKNOWN_RENDER", retryable: false });
  });
});

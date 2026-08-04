import { describe, expect, it, vi } from "vitest";

import { recordDependencyFailure } from "@/lib/server/dependency-error";
import { withDependencyRouteHandler } from "@/lib/server/route-handler";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const context = {
  operation: "attendance_sync",
  operationKind: "write" as const,
  routeFamily: "/api/attendance/sync",
  surface: "route_handler" as const,
};

describe("authenticated route failure responses", () => {
  it("marks successful authenticated responses private and no-store", async () => {
    const handler = withDependencyRouteHandler(
      async () => Response.json({ ok: true }),
      context,
    );

    const response = await handler();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns a safe no-store authentication response", async () => {
    const handler = withDependencyRouteHandler(async () => {
      throw recordDependencyFailure(
        { code: "PGRST303", message: "raw JWT claims could not be parsed" },
        {
          ...context,
          dependency: "SUPABASE_DATA",
          idempotent: true,
        },
      );
    }, context);

    const response = await handler();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(body.error).toMatchObject({
      code: "SESSION_REFRESH_REQUIRED",
      retryable: true,
    });
    expect(JSON.stringify(body)).not.toContain("raw JWT");
  });

  it("preserves provider rate limiting without exposing provider details", async () => {
    const handler = withDependencyRouteHandler(async () => {
      throw recordDependencyFailure(
        { status: 429, message: "provider account detail" },
        {
          ...context,
          dependency: "CLERK_BACKEND",
          operationKind: "read",
        },
      );
    }, context);

    const response = await handler();
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({
      error: { code: "DEPENDENCY_UNAVAILABLE" },
    });
  });

  it("returns authorization denial as 403 without suggesting session retry", async () => {
    const handler = withDependencyRouteHandler(async () => {
      throw recordDependencyFailure(
        { code: "42501", status: 403 },
        {
          ...context,
          dependency: "SUPABASE_DATA",
          operationKind: "read",
        },
      );
    }, context);

    const response = await handler();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      error: { code: "ACCESS_DENIED", retryable: false },
    });
  });

  it("does not advertise an automatic retry for non-idempotent writes", async () => {
    const handler = withDependencyRouteHandler(async () => {
      throw recordDependencyFailure(new TypeError("network changed"), {
        ...context,
        dependency: "NETWORK",
      });
    }, context);

    expect(await handler().then((response) => response.json())).toMatchObject({
      error: { retryable: false },
    });
  });
});

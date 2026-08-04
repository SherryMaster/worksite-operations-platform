import { describe, expect, it, vi } from "vitest";

import { sanitizeLogContext } from "@/lib/server/logger";

vi.mock("server-only", () => ({}));

describe("structured log redaction", () => {
  it("preserves correlation fields while redacting sensitive context", () => {
    expect(
      sanitizeLogContext({
        authorization: "Bearer secret",
        correlationId: "safe-reference",
        emailAddress: "person@example.com",
        objectPath: "private/identity.pdf",
        operation: "worker_options_trades",
        providerCode: "PGRST303",
        publishableKey: "pk_live_secret",
        token: "jwt-secret",
      }),
    ).toEqual({
      authorization: "[REDACTED]",
      correlationId: "safe-reference",
      emailAddress: "[REDACTED]",
      objectPath: "[REDACTED]",
      operation: "worker_options_trades",
      providerCode: "PGRST303",
      publishableKey: "[REDACTED]",
      token: "[REDACTED]",
    });
  });
});

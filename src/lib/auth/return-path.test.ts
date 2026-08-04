import { describe, expect, it } from "vitest";

import {
  safeInternalReturnPath,
  signInHref,
  signedInDestination,
} from "@/lib/auth/return-path";

describe("session recovery return paths", () => {
  it.each([
    ["/ceo/workers?page=2#documents", "/ceo/workers?page=2#documents"],
    ["/foreman/today", "/foreman/today"],
    ["https://attacker.example/ceo", "/"],
    ["//attacker.example/foreman", "/"],
    ["javascript:alert(1)", "/"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(safeInternalReturnPath(input)).toBe(expected);
  });

  it("encodes the validated path in the stable sign-in URL", () => {
    expect(signInHref("/ceo/workers?status=ACTIVE")).toBe(
      "/sign-in?redirect_url=%2Fceo%2Fworkers%3Fstatus%3DACTIVE",
    );
  });

  it("returns a positively signed-in CEO to the requested CEO page", () => {
    expect(
      signedInDestination(
        { role: "CEO", status: "AUTHORIZED" },
        "/ceo/workers?page=2",
      ),
    ).toBe("/ceo/workers?page=2");
  });

  it("does not send a signed-in account into another role or external URL", () => {
    expect(
      signedInDestination(
        { role: "FOREMAN", status: "AUTHORIZED" },
        "/ceo/workers",
      ),
    ).toBe("/foreman");
    expect(
      signedInDestination(
        { role: "CEO", status: "AUTHORIZED" },
        "https://attacker.example/ceo",
      ),
    ).toBe("/ceo");
  });
});

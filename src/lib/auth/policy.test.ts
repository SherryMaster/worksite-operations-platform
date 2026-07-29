import { describe, expect, it } from "vitest";

import { destinationForAccess, evaluateAccess } from "@/lib/auth/policy";

describe("application access policy", () => {
  it("authorizes active CEO and Foreman accounts", () => {
    expect(
      evaluateAccess({
        role: "CEO",
        is_active: true,
      }),
    ).toEqual({ role: "CEO", status: "AUTHORIZED" });

    expect(
      evaluateAccess({
        role: "FOREMAN",
        is_active: true,
      }),
    ).toEqual({ role: "FOREMAN", status: "AUTHORIZED" });
  });

  it("denies inactive and unmapped identities", () => {
    expect(
      evaluateAccess({
        role: "FOREMAN",
        is_active: false,
      }),
    ).toEqual({ role: "FOREMAN", status: "INACTIVE" });

    expect(evaluateAccess(null)).toEqual({ role: null, status: "UNMAPPED" });
  });

  it("routes each result to its usable frontend state", () => {
    expect(destinationForAccess({ role: "CEO", status: "AUTHORIZED" })).toBe(
      "/ceo",
    );
    expect(
      destinationForAccess({ role: "FOREMAN", status: "AUTHORIZED" }),
    ).toBe("/foreman");
    expect(destinationForAccess({ role: null, status: "UNMAPPED" })).toBe(
      "/access/unmapped",
    );
  });
});

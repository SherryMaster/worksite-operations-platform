import { describe, expect, it } from "vitest";

import {
  destinationForAccess,
  evaluateAccess,
  hasCurrentSecondFactor,
} from "@/lib/auth/policy";

describe("application access policy", () => {
  it("authorizes an active CEO without making MFA mandatory", () => {
    expect(
      evaluateAccess({
        applicationUser: { role: "CEO", is_active: true },
        currentSessionFva: [0, -1],
        hasEnrolledSecondFactor: false,
      }),
    ).toEqual({ role: "CEO", status: "AUTHORIZED" });
  });

  it("requires both Foreman enrollment and a verified second factor", () => {
    expect(
      evaluateAccess({
        applicationUser: { role: "FOREMAN", is_active: true },
        currentSessionFva: [0, -1],
        hasEnrolledSecondFactor: true,
      }),
    ).toEqual({ role: "FOREMAN", status: "MFA_REQUIRED" });

    expect(
      evaluateAccess({
        applicationUser: { role: "FOREMAN", is_active: true },
        currentSessionFva: [0, 0],
        hasEnrolledSecondFactor: false,
      }),
    ).toEqual({ role: "FOREMAN", status: "MFA_REQUIRED" });

    expect(
      evaluateAccess({
        applicationUser: { role: "FOREMAN", is_active: true },
        currentSessionFva: [0, 0],
        hasEnrolledSecondFactor: true,
      }),
    ).toEqual({ role: "FOREMAN", status: "AUTHORIZED" });
  });

  it("denies inactive and unmapped identities", () => {
    expect(
      evaluateAccess({
        applicationUser: { role: "FOREMAN", is_active: false },
        currentSessionFva: [0, 0],
        hasEnrolledSecondFactor: true,
      }),
    ).toEqual({ role: "FOREMAN", status: "INACTIVE" });

    expect(
      evaluateAccess({
        applicationUser: null,
        currentSessionFva: [0, 0],
        hasEnrolledSecondFactor: true,
      }),
    ).toEqual({ role: null, status: "UNMAPPED" });
  });

  it("rejects malformed second-factor claims", () => {
    expect(hasCurrentSecondFactor(undefined)).toBe(false);
    expect(hasCurrentSecondFactor([0, "-1"])).toBe(false);
    expect(hasCurrentSecondFactor([0, -1])).toBe(false);
    expect(hasCurrentSecondFactor([0, 12])).toBe(true);
  });

  it("routes each result to its usable frontend state", () => {
    expect(destinationForAccess({ role: "CEO", status: "AUTHORIZED" })).toBe(
      "/ceo",
    );
    expect(
      destinationForAccess({ role: "FOREMAN", status: "MFA_REQUIRED" }),
    ).toBe("/access/mfa-required");
    expect(destinationForAccess({ role: null, status: "UNMAPPED" })).toBe(
      "/access/unmapped",
    );
  });
});

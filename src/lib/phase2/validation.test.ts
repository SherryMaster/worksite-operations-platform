import { describe, expect, it } from "vitest";

import {
  companySettingsSchema,
  foremanAccountSchema,
  projectSchema,
} from "@/lib/phase2/validation";

describe("Phase 2 validation", () => {
  it("normalizes optional project values", () => {
    expect(
      projectSchema.parse({
        name: "  Central Tower  ",
        clientName: "Client",
        contractorName: "",
        location: "Kuala Lumpur",
        startDate: "2026-07-24",
        endDate: "",
        notes: " ",
      }),
    ).toMatchObject({
      name: "Central Tower",
      contractorName: null,
      endDate: null,
      notes: null,
    });
  });

  it("rejects an end date before the project starts", () => {
    const result = projectSchema.safeParse({
      name: "Central Tower",
      clientName: "Client",
      contractorName: "",
      location: "Kuala Lumpur",
      startDate: "2026-07-24",
      endDate: "2026-07-23",
      notes: "",
    });

    expect(result.success).toBe(false);
  });

  it("keeps company currency and timezone outside editable input", () => {
    expect(
      companySettingsSchema.parse({
        legalName: "",
        displayName: "  Worksite Operations  ",
      }),
    ).toEqual({
      legalName: null,
      displayName: "Worksite Operations",
    });
  });

  it("accepts CEO-created Foreman credentials with optional email and MFA", () => {
    const result = foremanAccountSchema.safeParse({
      firstName: "Ali",
      lastName: "",
      username: "ali_foreman",
      emailAddress: "",
      initialPassword: "Example#4821",
      mfaRequired: undefined,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emailAddress).toBeNull();
      expect(result.data.mfaRequired).toBe(false);
    }
  });
});

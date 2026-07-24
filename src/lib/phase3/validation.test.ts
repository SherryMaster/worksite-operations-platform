import { describe, expect, it } from "vitest";

import {
  createWorkerSchema,
  documentMetadataSchema,
  moneyToSen,
} from "@/lib/phase3/validation";

const validWorker = {
  legalName: "Ali Worker",
  phoneNumber: "+60123456789",
  alternatePhone: "",
  address: "",
  nationality: "Pakistan",
  cnicNumber: "",
  passportNumber: "AB 1234567",
  workPermitNumber: "",
  workPermitIssueDate: "",
  workPermitExpiryDate: "",
  notes: "",
  tradeId: "32000000-0000-4000-8000-000000000001",
  skillLevelId: "33000000-0000-4000-8000-000000000001",
  foodDeduction: "120.00",
  employmentStatus: "ACTIVE",
  employmentStartsOn: "2026-07-01",
  hourlyRate: "15.75",
  rateStartsOn: "2026-07-01",
  projectId: "",
  assignmentStartsOn: "2026-07-01",
  confirmDuplicate: undefined,
};

describe("Phase 3 validation", () => {
  it("converts MYR input to integer sen", () => {
    expect(moneyToSen("15.75")).toBe(1575);
    expect(moneyToSen("120")).toBe(12000);
  });

  it("requires at least one practical identity number", () => {
    const result = createWorkerSchema.safeParse({
      ...validWorker,
      passportNumber: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts an awaiting-assignment worker", () => {
    const result = createWorkerSchema.safeParse(validWorker);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projectId).toBeNull();
      expect(result.data.confirmDuplicate).toBe(false);
    }
  });

  it("rejects document expiry before issue", () => {
    expect(
      documentMetadataSchema.safeParse({
        fileKind: "DOCUMENT",
        documentTypeId: "34000000-0000-4000-8000-000000000001",
        documentNumber: "",
        issueDate: "2026-07-20",
        expiryDate: "2026-07-19",
        replaceDocumentId: "",
      }).success,
    ).toBe(false);
  });
});

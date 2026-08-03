import { describe, expect, it } from "vitest";

import {
  createWorkerSchema,
  documentMetadataSchema,
  moneyToSen,
} from "@/lib/phase3/validation";

const passport = {
  clientKey: "34000000-0000-4000-8000-000000000099",
  documentNumber: "AB 1234567",
  documentTypeId: "34000000-0000-4000-8000-000000000001",
  expiryDate: null,
  fileAction: "keep",
  hasFile: false,
  id: null,
  issueDate: null,
  metadata: { issuingCountry: "Pakistan" },
  originalFilename: null,
  systemCode: "PASSPORT",
};
const validWorker = {
  address: "",
  confirmDuplicate: undefined,
  documents: [passport],
  foodDeduction: "0.00",
  hourlyRate: "15.75",
  legalName: "Ali Worker",
  nationality: "Pakistan",
  phoneNumber: "+60123456789",
  rateEffectiveOn: "",
  skillLevelId: "33000000-0000-4000-8000-000000000001",
  tradeId: "32000000-0000-4000-8000-000000000001",
};

describe("worker record validation", () => {
  it("requires Personal and Work & pay fields while keeping address optional", () => {
    expect(createWorkerSchema.safeParse(validWorker).success).toBe(true);
    expect(
      createWorkerSchema.safeParse({
        ...validWorker,
        legalName: "",
        phoneNumber: "",
        nationality: "",
        hourlyRate: "0",
        tradeId: "",
        skillLevelId: "",
        foodDeduction: "-1",
      }).success,
    ).toBe(false);
  });

  it("requires at least one CNIC or Passport", () => {
    expect(
      createWorkerSchema.safeParse({
        ...validWorker,
        documents: [{ ...passport, systemCode: "WORK_PERMIT" }],
      }).success,
    ).toBe(false);
  });

  it("accepts metadata-only documents", () => {
    const parsed = createWorkerSchema.safeParse(validWorker);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.documents[0].hasFile).toBe(false);
  });

  it("rejects issue and expiry dates in the wrong order", () => {
    expect(
      documentMetadataSchema.safeParse({
        fileKind: "DOCUMENT",
        documentTypeId: passport.documentTypeId,
        documentNumber: "X",
        metadata: "{}",
        issueDate: "2026-08-02",
        expiryDate: "2026-08-01",
        replaceDocumentId: "",
      }).success,
    ).toBe(false);
  });

  it("converts MYR input to integer sen", () => {
    expect(moneyToSen("15.75")).toBe(1575);
    expect(moneyToSen("120")).toBe(12000);
  });
});

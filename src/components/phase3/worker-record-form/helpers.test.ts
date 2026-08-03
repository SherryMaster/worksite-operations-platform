import { describe, expect, it } from "vitest";

import {
  changeStage,
  documentsForSave,
  maskDraftIdentifier,
  validateWorkerStage,
} from "./helpers";
import type { WorkerDocumentType, WorkerFormValues } from "./types";

const passportType = {
  id: "34000000-0000-4000-8000-000000000001",
  name: "Passport",
  system_code: "PASSPORT",
  expects_document_number: true,
  expects_issue_date: false,
  expects_expiry_date: false,
  is_repeatable: false,
  is_active: true,
  metadata_fields: [],
  created_at: "",
  updated_at: "",
  created_by: "",
  updated_by: "",
} as WorkerDocumentType;
const values: WorkerFormValues = {
  address: "",
  documents: [
    {
      clientKey: "34000000-0000-4000-8000-000000000099",
      documentNumber: "PASS-1234",
      documentTypeId: passportType.id,
      expiryDate: "",
      file: null,
      fileAction: "keep",
      hasFile: false,
      id: null,
      issueDate: "",
      metadata: {},
      originalFilename: "",
      systemCode: "PASSPORT",
    },
  ],
  foodDeduction: "0.00",
  hourlyRate: "12.00",
  legalName: "Ali Worker",
  nationality: "Pakistan",
  phoneNumber: "+60123456789",
  photoAction: "keep",
  photoFile: null,
  photoId: null,
  rateEffectiveOn: "",
  skillLevelId: "33000000-0000-4000-8000-000000000001",
  tradeId: "32000000-0000-4000-8000-000000000001",
  workerId: null,
};

describe("worker draft transitions", () => {
  it("changes stages without altering entered values or submitting", () => {
    const snapshot = JSON.stringify(values);
    expect(changeStage(0, 4)).toBe(4);
    expect(JSON.stringify(values)).toBe(snapshot);
  });

  it("omits blank optional sections and masks review identifiers", () => {
    expect(
      documentsForSave([
        ...values.documents,
        {
          ...values.documents[0],
          clientKey: "34000000-0000-4000-8000-000000000098",
          documentNumber: "",
          systemCode: "OTHER",
        },
      ]),
    ).toHaveLength(1);
    expect(maskDraftIdentifier("PASS-1234")).not.toContain("PASS-1234");
  });

  it("requires an effective date only when an edit changes rate", () => {
    expect(
      validateWorkerStage(
        { ...values, hourlyRate: "13.00" },
        4,
        [passportType],
        values,
      ).rateEffectiveOn,
    ).toBeTruthy();
    expect(
      validateWorkerStage(values, 4, [passportType], values).rateEffectiveOn,
    ).toBeUndefined();
  });
});

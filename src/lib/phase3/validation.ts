import { z } from "zod";

import {
  actionError,
  actionSuccess,
  uuidSchema,
  type ActionState,
} from "@/lib/phase2/validation";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const requiredDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value === "" ? null : value),
  requiredDate.nullable(),
);
const money = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/, "Enter an amount with up to two decimals.");

const identityFields = {
  legalName: z.string().trim().min(2).max(160),
  phoneNumber: z.string().trim().min(5).max(40),
  address: optionalText(500),
  nationality: z.string().trim().min(2).max(80),
  tradeId: uuidSchema,
  skillLevelId: uuidSchema,
  foodDeduction: money,
};

const documentMetadataValue = z.string().trim().max(300);

export const workerDocumentDraftSchema = z
  .object({
    clientKey: uuidSchema,
    documentNumber: optionalText(100),
    documentTypeId: uuidSchema,
    expiryDate: optionalDate,
    fileAction: z.enum(["keep", "remove", "replace"]),
    hasFile: z.boolean(),
    id: uuidSchema.nullable(),
    issueDate: optionalDate,
    metadata: z.record(z.string(), documentMetadataValue),
    originalFilename: optionalText(255),
    systemCode: z.string().trim().max(40).nullable(),
  })
  .refine(
    ({ issueDate, expiryDate }) =>
      !issueDate || !expiryDate || expiryDate >= issueDate,
    {
      path: ["expiryDate"],
      message: "Expiry cannot be earlier than the issue date.",
    },
  );

const workerRecordSchema = z
  .object({
    ...identityFields,
    confirmDuplicate: z.preprocess((value) => value === "yes", z.boolean()),
    documents: z.array(workerDocumentDraftSchema).min(1),
    hourlyRate: money.refine((value) => moneyToSen(value) > 0, {
      message: "Hourly rate must be greater than zero.",
    }),
    rateEffectiveOn: optionalDate,
  })
  .superRefine((data, context) => {
    if (
      !data.documents.some(
        (document) =>
          ["CNIC", "PASSPORT"].includes(document.systemCode ?? "") &&
          Boolean(document.documentNumber),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Add a complete CNIC or Passport section.",
        path: ["documents"],
      });
    }
  });

export const createWorkerSchema = workerRecordSchema;
export const updateWorkerSchema = workerRecordSchema;

export const employmentChangeSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "LEFT_COMPANY", "ARCHIVED"]),
  startsOn: requiredDate,
  reason: optionalText(500),
});

export const workerTransferSchema = z.object({
  projectId: z.preprocess(
    (value) => (value === "" ? null : value),
    uuidSchema.nullable(),
  ),
  startsOn: requiredDate,
});

export const rateChangeSchema = z.object({
  hourlyRate: money.refine((value) => moneyToSen(value) > 0, {
    message: "Hourly rate must be greater than zero.",
  }),
  startsOn: requiredDate,
});

export const documentTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  expectsDocumentNumber: z.preprocess((value) => value === "on", z.boolean()),
  expectsIssueDate: z.preprocess((value) => value === "on", z.boolean()),
  expectsExpiryDate: z.preprocess((value) => value === "on", z.boolean()),
  isRepeatable: z.preprocess((value) => value === "on", z.boolean()),
});

export const documentMetadataSchema = z
  .object({
    fileKind: z.enum(["PHOTO", "DOCUMENT"]),
    documentTypeId: z.preprocess(
      (value) => (value === "" ? null : value),
      uuidSchema.nullable(),
    ),
    documentNumber: optionalText(100),
    metadata: z.preprocess(
      (value) => {
        if (typeof value !== "string" || value.trim() === "") return {};
        try {
          return JSON.parse(value) as unknown;
        } catch {
          return value;
        }
      },
      z.record(z.string(), documentMetadataValue),
    ),
    issueDate: optionalDate,
    expiryDate: optionalDate,
    replaceDocumentId: z.preprocess(
      (value) => (value === "" ? null : value),
      uuidSchema.nullable(),
    ),
  })
  .refine(
    ({ documentTypeId, fileKind }) =>
      fileKind === "PHOTO" || Boolean(documentTypeId),
    {
      path: ["documentTypeId"],
      message: "Select a document type.",
    },
  )
  .refine(
    ({ issueDate, expiryDate }) =>
      !issueDate || !expiryDate || expiryDate >= issueDate,
    {
      path: ["expiryDate"],
      message: "Expiry cannot be earlier than the issue date.",
    },
  );

export type Phase3ActionState = ActionState & {
  duplicateWorkerId?: string;
  duplicateWorkerName?: string;
  partialUploadFailures?: Array<{ clientKey: string; message: string }>;
  workerId?: string;
};

export function moneyToSen(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export { actionError, actionSuccess };

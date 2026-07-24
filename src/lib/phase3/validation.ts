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
  alternatePhone: optionalText(40),
  address: optionalText(500),
  nationality: optionalText(80),
  cnicNumber: optionalText(40),
  passportNumber: optionalText(40),
  workPermitNumber: optionalText(60),
  workPermitIssueDate: optionalDate,
  workPermitExpiryDate: optionalDate,
  notes: optionalText(2000),
  tradeId: uuidSchema,
  skillLevelId: uuidSchema,
  foodDeduction: money,
};

function validateWorkerIdentity(
  data: {
    cnicNumber: string | null;
    passportNumber: string | null;
    workPermitExpiryDate: string | null;
    workPermitIssueDate: string | null;
  },
  context: z.RefinementCtx,
) {
  if (!data.cnicNumber && !data.passportNumber) {
    context.addIssue({
      code: "custom",
      message: "Enter a CNIC or passport number.",
      path: ["cnicNumber"],
    });
  }
  if (
    data.workPermitIssueDate &&
    data.workPermitExpiryDate &&
    data.workPermitExpiryDate < data.workPermitIssueDate
  ) {
    context.addIssue({
      code: "custom",
      message: "Expiry cannot be earlier than the issue date.",
      path: ["workPermitExpiryDate"],
    });
  }
}

export const createWorkerSchema = z
  .object({
    ...identityFields,
    employmentStatus: z.enum(["ACTIVE", "SUSPENDED", "LEFT_COMPANY"]),
    employmentStartsOn: requiredDate,
    hourlyRate: money.refine((value) => moneyToSen(value) > 0, {
      message: "Hourly rate must be greater than zero.",
    }),
    rateStartsOn: requiredDate,
    projectId: z.preprocess(
      (value) => (value === "" ? null : value),
      uuidSchema.nullable(),
    ),
    assignmentStartsOn: requiredDate,
    confirmDuplicate: z.preprocess((value) => value === "yes", z.boolean()),
  })
  .superRefine(validateWorkerIdentity);

export const updateWorkerSchema = z
  .object({
    ...identityFields,
    confirmDuplicate: z.preprocess((value) => value === "yes", z.boolean()),
  })
  .superRefine(validateWorkerIdentity);

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
  expectsIssueDate: z.preprocess((value) => value === "on", z.boolean()),
  expectsExpiryDate: z.preprocess((value) => value === "on", z.boolean()),
});

export const documentMetadataSchema = z
  .object({
    fileKind: z.enum(["PHOTO", "DOCUMENT"]),
    documentTypeId: z.preprocess(
      (value) => (value === "" ? null : value),
      uuidSchema.nullable(),
    ),
    documentNumber: optionalText(100),
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
};

export function moneyToSen(value: string): number {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export { actionError, actionSuccess };

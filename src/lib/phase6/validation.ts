import { z } from "zod";

import {
  actionError,
  actionSuccess,
  uuidSchema,
} from "@/lib/phase2/validation";
import { moneyToSen } from "@/lib/phase3/validation";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d{1,2})?$/)
  .refine((value) => moneyToSen(value) > 0, {
    message: "Amount must be greater than zero.",
  });
const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

export const payrollMonthSchema = z.object({
  payrollMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .transform((value) => `${value}-01`),
});

export const payrollAdjustmentSchema = z.object({
  amount: money,
  kind: z.enum(["ADDITION", "DEDUCTION"]),
  payrollRunId: uuidSchema,
  reason: z.string().trim().min(2).max(500),
  workerId: uuidSchema,
});

export const payrollApprovalSchema = z.object({
  payrollRunId: uuidSchema,
});

export const payrollAdjustmentRemovalSchema = z.object({
  adjustmentId: uuidSchema,
  payrollRunId: uuidSchema,
});

export const payrollPaymentSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER"]),
  notes: optionalText(1000),
  paymentDate: isoDate,
  payrollRunId: uuidSchema,
  payrollWorkerId: uuidSchema,
  reference: optionalText(120),
});

export { actionError, actionSuccess };

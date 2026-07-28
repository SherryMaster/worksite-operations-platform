import { z } from "zod";

import {
  actionError,
  actionSuccess,
  uuidSchema,
} from "@/lib/phase2/validation";

const requiredDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

const optionalText = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().min(minimum).max(maximum).nullable(),
  );

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const leaveSubmissionSchema = z
  .object({
    workerId: uuidSchema,
    projectId: uuidSchema,
    leaveTypeId: uuidSchema,
    startsOn: requiredDate,
    endsOn: requiredDate,
    reason: optionalText(2, 500),
    notes: optionalText(0, 2000),
  })
  .refine(({ endsOn, startsOn }) => endsOn >= startsOn, {
    message: "End date cannot be before the start date.",
    path: ["endsOn"],
  });

export const leaveDecisionSchema = z.object({
  leaveRequestId: uuidSchema,
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionNote: optionalText(2, 500),
});

export function leavePayableMinutes(
  status: "PENDING" | "APPROVED" | "REJECTED",
) {
  return status === "APPROVED" ? 0 : null;
}

export { actionError, actionSuccess };

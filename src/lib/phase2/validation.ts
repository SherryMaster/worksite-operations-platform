import { z } from "zod";

const optionalTrimmedText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");

export const projectSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    clientName: z.string().trim().min(2).max(120),
    contractorName: optionalTrimmedText(120),
    location: z.string().trim().min(2).max(180),
    startDate: isoDate,
    endDate: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? null : value,
      isoDate.nullable(),
    ),
    notes: optionalTrimmedText(2000),
  })
  .refine(({ startDate, endDate }) => !endDate || endDate >= startDate, {
    path: ["endDate"],
    message: "End date cannot be earlier than the start date.",
  });

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export const companySettingsSchema = z.object({
  legalName: optionalTrimmedText(160),
  displayName: optionalTrimmedText(120),
});

export const foremanAccountSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: optionalTrimmedText(80),
  username: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(
      /^[A-Za-z0-9_-]+$/,
      "Use only letters, numbers, underscores, or hyphens.",
    ),
  emailAddress: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.email().trim().toLowerCase().nullable(),
  ),
  initialPassword: z.string().min(8).max(128),
});

export const foremanPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export const clerkUserIdSchema = z
  .string()
  .regex(/^user_[A-Za-z0-9]+$/, "Invalid Clerk user.");

export const uuidSchema = z.uuid();

export const assignmentSchema = z.object({
  foremanUserId: uuidSchema,
  startsOn: isoDate,
});

export const projectStatusSchema = z.enum([
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);

export type ProjectInput = z.infer<typeof projectSchema>;

export type ActionState = {
  status: "idle" | "error" | "success";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialActionState: ActionState = {
  status: "idle",
  message: "",
};

export function actionError(
  message: string,
  errors?: Record<string, string[] | undefined>,
): ActionState {
  return { status: "error", message, errors };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}

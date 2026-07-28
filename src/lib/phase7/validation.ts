import { z } from "zod";

import {
  reportForRole,
  type ReportFilters,
  type ReportId,
  type ReportRole,
} from "@/lib/phase7/report-definitions";

const optionalText = z
  .string()
  .trim()
  .max(160)
  .optional()
  .transform((value) => value || undefined);

const optionalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const optionalMonth = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const optionalUuid = z
  .string()
  .uuid()
  .optional()
  .or(z.literal(""))
  .transform((value) => value || undefined);

const reportFiltersSchema = z
  .object({
    actor: optionalText,
    date: optionalDate,
    dateFrom: optionalDate,
    dateTo: optionalDate,
    month: optionalMonth,
    projectId: optionalUuid,
    query: optionalText,
    status: optionalText,
    workerId: optionalUuid,
  })
  .refine(
    (value) =>
      !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo,
    { message: "The start date must be on or before the end date." },
  );

export function parseReportRequest(
  reportId: string | undefined,
  role: ReportRole,
  values: Record<string, string | string[] | undefined>,
): { filters: ReportFilters; reportId: ReportId } {
  const permitted =
    reportForRole(reportId ?? "", role) ??
    reportForRole("current-workforce", role);
  if (!permitted) {
    throw new Error("No reports are available for this account.");
  }

  const singleValues = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  );
  const filters = reportFiltersSchema.parse(singleValues);

  return { filters, reportId: permitted.id };
}

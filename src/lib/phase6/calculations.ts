export const PAYROLL_MULTIPLIERS = {
  NORMAL: 100,
  OVERTIME: 150,
  SUNDAY: 200,
  PUBLIC_HOLIDAY: 300,
} as const;

export type PayrollCategory = keyof typeof PAYROLL_MULTIPLIERS;

export function calculateBucketAmount(
  minutes: number,
  hourlyRateSen: number,
  multiplierBasisPoints: number,
) {
  if (
    !Number.isInteger(minutes) ||
    !Number.isInteger(hourlyRateSen) ||
    !Number.isInteger(multiplierBasisPoints) ||
    minutes < 0 ||
    hourlyRateSen < 0 ||
    multiplierBasisPoints < 0
  ) {
    throw new Error("Payroll bucket inputs must be non-negative integers.");
  }

  const numerator =
    BigInt(minutes) * BigInt(hourlyRateSen) * BigInt(multiplierBasisPoints);
  return Number((numerator + BigInt(3_000)) / BigInt(6_000));
}

export function calculateNetPay(input: {
  additionsSen: number;
  deductionsSen: number;
  foodDeductionSen: number;
  grossEarningsSen: number;
}) {
  return (
    input.grossEarningsSen +
    input.additionsSen -
    input.deductionsSen -
    input.foodDeductionSen
  );
}

export function formatPayrollMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours}h ${String(remainder).padStart(2, "0")}m`;
}

export function formatSen(value: number) {
  return new Intl.NumberFormat("en-MY", {
    currency: "MYR",
    style: "currency",
  }).format(value / 100);
}

export function payrollMonthLabel(value: string) {
  return new Intl.DateTimeFormat("en-MY", {
    month: "long",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00+08:00`));
}

export function firstDayOfMalaysiaMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    month: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-01`;
}

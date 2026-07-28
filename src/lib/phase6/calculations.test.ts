import { describe, expect, it } from "vitest";

import {
  calculateBucketAmount,
  calculateNetPay,
  formatPayrollMinutes,
} from "@/lib/phase6/calculations";

describe("Phase 6 payroll calculations", () => {
  it("rounds once per minute/rate/multiplier bucket using half-up sen", () => {
    expect(calculateBucketAmount(61, 1_000, 100)).toBe(1_017);
    expect(calculateBucketAmount(1, 30, 100)).toBe(1);
  });

  it("applies the fixed category multipliers without stacking", () => {
    expect(calculateBucketAmount(60, 1_000, 100)).toBe(1_000);
    expect(calculateBucketAmount(60, 1_000, 150)).toBe(1_500);
    expect(calculateBucketAmount(60, 1_000, 200)).toBe(2_000);
    expect(calculateBucketAmount(60, 1_000, 300)).toBe(3_000);
  });

  it("calculates net pay from earnings, adjustments, and food deduction", () => {
    expect(
      calculateNetPay({
        additionsSen: 2_000,
        deductionsSen: 500,
        foodDeductionSen: 3_000,
        grossEarningsSen: 20_000,
      }),
    ).toBe(18_500);
  });

  it("formats authoritative minute totals without fractional-hour drift", () => {
    expect(formatPayrollMinutes(135)).toBe("2h 15m");
  });
});

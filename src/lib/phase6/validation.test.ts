import { describe, expect, it } from "vitest";

import {
  payrollAdjustmentSchema,
  payrollMonthSchema,
  payrollPaymentSchema,
} from "@/lib/phase6/validation";

const id = "84d1cf0e-f90a-4ad8-9b95-52e763ad5244";

describe("Phase 6 validation", () => {
  it("accepts only the first day of a calendar month", () => {
    expect(
      payrollMonthSchema.safeParse({ payrollMonth: "2026-07" }).success,
    ).toBe(true);
    expect(
      payrollMonthSchema.safeParse({ payrollMonth: "2026-07-15" }).success,
    ).toBe(false);
  });

  it("requires a positive manual adjustment with a reason", () => {
    expect(
      payrollAdjustmentSchema.safeParse({
        amount: "12.50",
        kind: "ADDITION",
        payrollRunId: id,
        reason: "Tool allowance",
        workerId: id,
      }).success,
    ).toBe(true);
    expect(
      payrollAdjustmentSchema.safeParse({
        amount: "0",
        kind: "DEDUCTION",
        payrollRunId: id,
        reason: "",
        workerId: id,
      }).success,
    ).toBe(false);
  });

  it("accepts one complete cash or bank-transfer payment record", () => {
    expect(
      payrollPaymentSchema.safeParse({
        method: "BANK_TRANSFER",
        notes: "",
        paymentDate: "2026-08-01",
        payrollRunId: id,
        payrollWorkerId: id,
        reference: "BANK-100",
      }).success,
    ).toBe(true);
  });
});

"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedActor } from "@/lib/auth/access";
import type { ActionState } from "@/lib/phase2/validation";
import { moneyToSen } from "@/lib/phase3/validation";
import {
  dependencyActionMessage,
  isDependencyError,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";
import {
  actionError,
  actionSuccess,
  payrollAdjustmentRemovalSchema,
  payrollAdjustmentSchema,
  payrollApprovalSchema,
  payrollMonthSchema,
  payrollPaymentSchema,
} from "@/lib/phase6/validation";

type CeoPayrollClientContext =
  | {
      ok: true;
      supabase: Awaited<ReturnType<typeof getAuthorizedActor>>["supabase"];
    }
  | { ok: false; failure: ActionState };

async function getCeoPayrollClient(): Promise<CeoPayrollClientContext> {
  try {
    const context = await getAuthorizedActor("CEO");
    return { ok: true, supabase: context.supabase };
  } catch (error) {
    if (isDependencyError(error)) {
      return {
        ok: false,
        failure: actionError(dependencyActionMessage(error)),
      };
    }
    throw error;
  }
}

function payrollError(
  operation: string,
  error: { code?: string; message: string },
) {
  const failure = recordDependencyFailure(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "write",
    routeFamily: "/ceo/payroll",
    surface: "server_action",
  });
  if (failure.category.startsWith("AUTH_") || failure.retryable) {
    return actionError(dependencyActionMessage(failure));
  }
  return error.code === "P0001"
    ? actionError(error.message)
    : actionError("The payroll change could not be saved. Please try again.");
}

function revalidatePayroll(payrollRunId?: string) {
  revalidatePath("/ceo");
  revalidatePath("/ceo/payroll");
  revalidatePath("/ceo/workers");
  revalidatePath("/ceo/audit");
  if (payrollRunId) {
    revalidatePath(`/ceo/payroll/${payrollRunId}`);
  }
}

export async function generatePayrollAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = payrollMonthSchema.safeParse({
    payrollMonth: formData.get("payrollMonth"),
  });
  if (!parsed.success) {
    return actionError("Select a valid calendar month.");
  }

  const context = await getCeoPayrollClient();
  if (!context.ok) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("generate_payroll", {
    p_payroll_month: parsed.data.payrollMonth,
  });
  if (result.error) return payrollError("generate", result.error);
  revalidatePayroll(result.data);
  return actionSuccess(
    "Payroll generated. Review every exception before approval.",
  );
}

export async function addPayrollAdjustmentAction(
  payrollRunId: string,
  workerId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = payrollAdjustmentSchema.safeParse({
    amount: formData.get("amount"),
    kind: formData.get("kind"),
    payrollRunId,
    reason: formData.get("reason"),
    workerId,
  });
  if (!parsed.success) {
    return actionError(
      "Select an addition or deduction, enter a positive amount, and explain why.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const context = await getCeoPayrollClient();
  if (!context.ok) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("add_payroll_adjustment", {
    p_amount_sen: moneyToSen(parsed.data.amount),
    p_kind: parsed.data.kind,
    p_payroll_run_id: parsed.data.payrollRunId,
    p_reason: parsed.data.reason,
    p_worker_id: parsed.data.workerId,
  });
  if (result.error) return payrollError("add_adjustment", result.error);
  revalidatePayroll(parsed.data.payrollRunId);
  return actionSuccess("Adjustment added and draft payroll recalculated.");
}

export async function removePayrollAdjustmentAction(
  payrollRunId: string,
  adjustmentId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsed = payrollAdjustmentRemovalSchema.safeParse({
    adjustmentId,
    payrollRunId,
  });
  if (!parsed.success) return actionError("Invalid payroll adjustment.");

  const context = await getCeoPayrollClient();
  if (!context.ok) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("remove_payroll_adjustment", {
    p_adjustment_id: parsed.data.adjustmentId,
  });
  if (result.error) return payrollError("remove_adjustment", result.error);
  revalidatePayroll(parsed.data.payrollRunId);
  return actionSuccess("Adjustment removed and draft payroll recalculated.");
}

export async function approvePayrollAction(
  payrollRunId: string,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsed = payrollApprovalSchema.safeParse({ payrollRunId });
  if (!parsed.success) return actionError("Invalid payroll run.");

  const context = await getCeoPayrollClient();
  if (!context.ok) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("approve_payroll", {
    p_payroll_run_id: parsed.data.payrollRunId,
  });
  if (result.error) return payrollError("approve", result.error);
  revalidatePayroll(parsed.data.payrollRunId);
  return actionSuccess(
    "Payroll approved. Worker statements and payment actions are now available.",
  );
}

export async function recordPayrollPaymentAction(
  payrollRunId: string,
  payrollWorkerId: string,
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = payrollPaymentSchema.safeParse({
    method: formData.get("method"),
    notes: formData.get("notes"),
    paymentDate: formData.get("paymentDate"),
    payrollRunId,
    payrollWorkerId,
    reference: formData.get("reference"),
  });
  if (!parsed.success) {
    return actionError("Check the payment date, method, reference, and notes.");
  }

  const context = await getCeoPayrollClient();
  if (!context.ok) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("record_payroll_payment", {
    p_method: parsed.data.method,
    p_notes: parsed.data.notes ?? "",
    p_payment_date: parsed.data.paymentDate,
    p_payroll_worker_id: parsed.data.payrollWorkerId,
    p_reference: parsed.data.reference ?? "",
  });
  if (result.error) return payrollError("record_payment", result.error);
  revalidatePayroll(parsed.data.payrollRunId);
  return actionSuccess("Full payroll payment recorded.");
}

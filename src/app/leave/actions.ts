"use server";

import { revalidatePath } from "next/cache";

import { getAuthorizedActor } from "@/lib/auth/access";
import {
  dependencyActionMessage,
  isDependencyError,
  recordDependencyFailure,
} from "@/lib/server/dependency-error";
import type { ActionState } from "@/lib/phase2/validation";
import {
  actionError,
  actionSuccess,
  leaveDecisionSchema,
  leaveTypeSchema,
} from "@/lib/phase5/validation";

async function getCeoContext() {
  try {
    return await getAuthorizedActor("CEO");
  } catch (error) {
    if (isDependencyError(error)) {
      return { failure: actionError(dependencyActionMessage(error)) } as const;
    }
    throw error;
  }
}

function errorMessage(
  error: { code?: string; message: string },
  operation: string,
) {
  const failure = recordDependencyFailure(error, {
    dependency: "SUPABASE_DATA",
    operation,
    operationKind: "write",
    routeFamily: "/ceo/leave|settings",
    surface: "server_action",
  });
  if (failure.category.startsWith("AUTH_") || failure.retryable) {
    return dependencyActionMessage(failure);
  }
  if (error.code === "23505") return "That leave type already exists.";
  if (error.code === "P0001") return error.message;
  return "The leave change could not be saved. Please try again.";
}

export async function createLeaveTypeAction(
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveTypeSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return actionError("Enter a leave type name between 2 and 80 characters.");
  }
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const result = await supabase.from("leave_types").insert({
    created_by: actorId,
    name: parsed.data.name,
    updated_by: actorId,
  });
  if (result.error) {
    return actionError(errorMessage(result.error, "leave_type_create"));
  }
  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/leave");
  revalidatePath("/foreman/leave");
  return actionSuccess("Leave type added.");
}

export async function setLeaveTypeActiveAction(
  leaveTypeId: string,
  isActive: boolean,
  _previousState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  void _previousState;
  void _formData;
  const parsed =
    leaveDecisionSchema.shape.leaveRequestId.safeParse(leaveTypeId);
  if (!parsed.success) return actionError("Invalid leave type.");
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { actorId, supabase } = context;
  const result = await supabase
    .from("leave_types")
    .update({ is_active: isActive, updated_by: actorId })
    .eq("id", parsed.data);
  if (result.error) {
    return actionError(errorMessage(result.error, "leave_type_status"));
  }
  revalidatePath("/ceo/settings");
  revalidatePath("/ceo/leave");
  revalidatePath("/foreman/leave");
  return actionSuccess(
    isActive ? "Leave type restored." : "Leave type deactivated.",
  );
}

export async function decideLeaveRequestAction(
  leaveRequestId: string,
  decision: "APPROVED" | "REJECTED",
  _previousState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = leaveDecisionSchema.safeParse({
    decision,
    decisionNote: formData.get("decisionNote"),
    leaveRequestId,
  });
  if (!parsed.success) {
    return actionError("Check the decision and optional note.");
  }
  const context = await getCeoContext();
  if ("failure" in context) return context.failure;
  const { supabase } = context;
  const result = await supabase.rpc("decide_leave_request", {
    p_decision: parsed.data.decision,
    p_decision_note: parsed.data.decisionNote ?? "",
    p_leave_request_id: parsed.data.leaveRequestId,
  });
  if (result.error) {
    return actionError(errorMessage(result.error, "leave_decision"));
  }
  revalidatePath("/ceo");
  revalidatePath("/ceo/leave");
  revalidatePath("/ceo/attendance");
  revalidatePath("/ceo/projects");
  revalidatePath("/ceo/workers");
  revalidatePath("/foreman");
  revalidatePath("/foreman/attendance");
  revalidatePath("/foreman/leave");
  return actionSuccess(
    decision === "APPROVED"
      ? "Leave approved. The selected full days have zero payable time."
      : "Leave rejected.",
  );
}

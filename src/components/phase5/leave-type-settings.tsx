import { ClipboardList } from "lucide-react";

import {
  createLeaveTypeAction,
  setLeaveTypeActiveAction,
} from "@/app/leave/actions";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/types/database";

export function LeaveTypeSettings({
  leaveTypes,
}: {
  leaveTypes: Tables<"leave_types">[];
}) {
  return (
    <section id="leave-types" className="mt-6">
      <div className="mb-4 flex items-center gap-3">
        <ClipboardList className="size-5 text-violet-700" aria-hidden="true" />
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Full-day unpaid leave
          </p>
          <h2 className="font-heading text-xl font-semibold">Leave types</h2>
        </div>
      </div>
      <article className="border border-violet-100 bg-white">
        <div className="border-b border-slate-200 p-5">
          <p className="text-sm leading-6 text-slate-600">
            Add only the company categories staff should select. Deactivating a
            type keeps it visible in historical requests.
          </p>
          <ManagedForm
            action={createLeaveTypeAction}
            submitLabel="Add leave type"
            className="mt-4 max-w-xl border border-slate-200 bg-slate-50 p-4"
          >
            <Label htmlFor="leave-type-name">New leave type</Label>
            <Input
              id="leave-type-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              className="mt-2 h-11 rounded-xl bg-white"
            />
          </ManagedForm>
        </div>
        {leaveTypes.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            No leave types configured. Add one before staff submit leave.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {leaveTypes.map((leaveType) => (
              <div
                key={leaveType.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{leaveType.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {leaveType.is_active
                      ? "Available for new requests"
                      : "Inactive · history retained"}
                  </p>
                </div>
                <ActionButton
                  action={setLeaveTypeActiveAction.bind(
                    null,
                    leaveType.id,
                    !leaveType.is_active,
                  )}
                  label={leaveType.is_active ? "Deactivate" : "Restore"}
                  confirmMessage={
                    leaveType.is_active
                      ? `Deactivate ${leaveType.name}? Existing requests will retain it.`
                      : undefined
                  }
                  variant={leaveType.is_active ? "outline" : "secondary"}
                />
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

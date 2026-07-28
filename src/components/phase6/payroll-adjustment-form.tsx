import { addPayrollAdjustmentAction } from "@/app/ceo/payroll/actions";
import { ManagedForm } from "@/components/phase2/managed-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PayrollAdjustmentForm({
  payrollRunId,
  workerId,
}: {
  payrollRunId: string;
  workerId: string;
}) {
  return (
    <ManagedForm
      action={addPayrollAdjustmentAction.bind(null, payrollRunId, workerId)}
      submitLabel="Add adjustment"
      className="grid gap-3 border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2"
    >
      <label className="text-xs font-semibold uppercase tracking-wider text-stone-600">
        Type
        <select
          name="kind"
          className="mt-2 h-11 w-full border border-stone-300 bg-white px-3 text-sm normal-case"
          required
          defaultValue="ADDITION"
        >
          <option value="ADDITION">Addition</option>
          <option value="DEDUCTION">Deduction</option>
        </select>
      </label>
      <div>
        <Label htmlFor={`adjustment-amount-${workerId}`}>Amount (MYR)</Label>
        <Input
          id={`adjustment-amount-${workerId}`}
          name="amount"
          inputMode="decimal"
          placeholder="0.00"
          pattern="[0-9]+(?:\.[0-9]{1,2})?"
          required
          className="mt-2 h-11 rounded-none bg-white"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`adjustment-reason-${workerId}`}>Reason</Label>
        <Input
          id={`adjustment-reason-${workerId}`}
          name="reason"
          minLength={2}
          maxLength={500}
          required
          placeholder="Plain-English reason for this payroll change"
          className="mt-2 h-11 rounded-none bg-white"
        />
      </div>
    </ManagedForm>
  );
}

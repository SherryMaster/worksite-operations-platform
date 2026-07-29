import { recordPayrollPaymentAction } from "@/app/ceo/payroll/actions";
import { ManagedForm } from "@/components/phase2/managed-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { formatSen } from "@/lib/phase6/calculations";

export function PayrollPaymentForm({
  amountSen,
  payrollRunId,
  payrollWorkerId,
}: {
  amountSen: number;
  payrollRunId: string;
  payrollWorkerId: string;
}) {
  return (
    <ManagedForm
      action={recordPayrollPaymentAction.bind(
        null,
        payrollRunId,
        payrollWorkerId,
      )}
      submitLabel={`Record full payment · ${formatSen(amountSen)}`}
      className="grid gap-3 border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-2"
    >
      <div>
        <Label htmlFor={`payment-date-${payrollWorkerId}`}>Payment date</Label>
        <Input
          id={`payment-date-${payrollWorkerId}`}
          name="paymentDate"
          type="date"
          defaultValue={malaysiaDateInputValue()}
          required
          className="mt-2 h-11 rounded-xl bg-white"
        />
      </div>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        Method
        <select
          name="method"
          className="mt-2 h-11 w-full border border-violet-100 bg-white px-3 text-sm normal-case"
          defaultValue="CASH"
          required
        >
          <option value="CASH">Cash</option>
          <option value="BANK_TRANSFER">Bank transfer</option>
        </select>
      </label>
      <div className="sm:col-span-2">
        <Label htmlFor={`payment-reference-${payrollWorkerId}`}>
          Reference (optional)
        </Label>
        <Input
          id={`payment-reference-${payrollWorkerId}`}
          name="reference"
          maxLength={120}
          className="mt-2 h-11 rounded-xl bg-white"
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`payment-notes-${payrollWorkerId}`}>
          Notes (optional)
        </Label>
        <Textarea
          id={`payment-notes-${payrollWorkerId}`}
          name="notes"
          maxLength={1000}
          className="mt-2 rounded-xl bg-white"
        />
      </div>
      <p className="sm:col-span-2 text-xs leading-5 text-emerald-900">
        Version 1 records one complete payment. The amount is fixed to the
        approved net pay; partial and split payments are not available.
      </p>
    </ManagedForm>
  );
}

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { generatePayrollAction } from "@/app/ceo/payroll/actions";
import { ManagedForm } from "@/components/phase2/managed-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  firstDayOfMalaysiaMonth,
  formatSen,
  payrollMonthLabel,
} from "@/lib/phase6/calculations";
import { listPayrollRuns } from "@/lib/phase6/data";

function runStatus(status: "APPROVED" | "DRAFT" | "NEEDS_REVIEW") {
  if (status === "APPROVED") return "Approved";
  if (status === "NEEDS_REVIEW") return "Needs review";
  return "Draft";
}

export default async function PayrollPage() {
  const runs = await listPayrollRuns();

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-6 border-b border-violet-100 pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
            Monthly payroll control
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
            Payroll
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
            Generate a fixed calendar month, resolve calculation exceptions,
            approve the complete company run, issue worker statements, and
            record full payments.
          </p>
        </div>
        <ManagedForm
          action={generatePayrollAction}
          submitLabel="Generate or recalculate"
          className="w-full border border-violet-100 bg-white p-4 xl:max-w-md"
        >
          <Label htmlFor="payroll-month">Calendar month</Label>
          <Input
            id="payroll-month"
            name="payrollMonth"
            type="month"
            required
            defaultValue={firstDayOfMalaysiaMonth().slice(0, 7)}
            className="mt-2 h-11 rounded-xl"
          />
        </ManagedForm>
      </div>

      <section className="mt-8" aria-label="Monthly payroll runs">
        {runs.length === 0 ? (
          <div className="border border-dashed border-violet-100 bg-white p-10 text-center">
            <ReceiptText
              className="mx-auto size-8 text-slate-300"
              aria-hidden="true"
            />
            <h2 className="mt-4 font-heading text-2xl font-semibold uppercase">
              No payroll generated
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Select a calendar month above to create the first draft.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/ceo/payroll/${run.id}`}
                className="group grid gap-4 border border-violet-100 bg-white p-5 transition-colors hover:bg-violet-50 lg:grid-cols-[1.4fr_repeat(5,1fr)_auto] lg:items-center"
              >
                <div>
                  <p className="font-heading text-2xl font-semibold uppercase">
                    {payrollMonthLabel(run.payroll_month)}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${
                      run.status === "APPROVED"
                        ? "text-emerald-700"
                        : run.status === "NEEDS_REVIEW"
                          ? "text-violet-700"
                          : "text-slate-600"
                    }`}
                  >
                    {run.status === "APPROVED" ? (
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="size-3.5" aria-hidden="true" />
                    )}
                    {runStatus(run.status)}
                  </span>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Workers
                  </p>
                  <p className="mt-1 font-semibold">{run.worker_count}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Gross
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatSen(run.gross_earnings_sen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Net
                  </p>
                  <p className="mt-1 font-semibold">
                    {formatSen(run.net_payroll_sen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Exceptions
                  </p>
                  <p className="mt-1 font-semibold">
                    {run.blocking_exception_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Payments
                  </p>
                  <p className="mt-1 flex items-center gap-1 font-semibold">
                    <WalletCards className="size-4" aria-hidden="true" />
                    {run.paidWorkerCount} paid · {run.unpaidWorkerCount} unpaid
                  </p>
                </div>
                <ArrowRight
                  className="size-5 text-slate-300 group-hover:text-slate-900"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

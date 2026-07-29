import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { generatePayrollAction } from "@/app/ceo/payroll/actions";
import { PageHeader } from "@/components/operations/page-header";
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
    <main>
      <PageHeader
        eyebrow="Monthly payroll control"
        title="Payroll"
        description="Resolve blocking calculation exceptions before reviewing workers, then approve the company run and record payments."
      />
      <ManagedForm
        action={generatePayrollAction}
        submitLabel="Generate or recalculate"
        className="mt-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:max-w-xl sm:grid-cols-[1fr_auto] sm:items-end"
      >
        <div>
          <Label htmlFor="payroll-month">Calendar month</Label>
          <Input
            id="payroll-month"
            name="payrollMonth"
            type="month"
            required
            defaultValue={firstDayOfMalaysiaMonth().slice(0, 7)}
            className="mt-1 h-10"
          />
        </div>
      </ManagedForm>

      <section className="mt-5" aria-label="Monthly payroll runs">
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
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {runs.map((run) => (
              <Link
                key={run.id}
                href={`/ceo/payroll/${run.id}`}
                className="group grid gap-3 border-b border-slate-200 p-3 transition-colors last:border-0 hover:bg-violet-50/40 md:grid-cols-[1.4fr_repeat(5,1fr)_auto] md:items-center"
              >
                <div>
                  <p className="text-base font-semibold">
                    {payrollMonthLabel(run.payroll_month)}
                  </p>
                  <span
                    className={`mt-1 inline-flex items-center gap-1.5 text-xs font-semibold ${
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
                  <p className="text-xs text-slate-500">Workers</p>
                  <p className="mt-1 font-semibold">{run.worker_count}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Gross</p>
                  <p className="mt-1 font-semibold">
                    {formatSen(run.gross_earnings_sen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Net</p>
                  <p className="mt-1 font-semibold">
                    {formatSen(run.net_payroll_sen)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Exceptions</p>
                  <p className="mt-1 font-semibold">
                    {run.blocking_exception_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Payments</p>
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

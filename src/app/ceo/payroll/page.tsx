import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
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
        title="Payroll"
        description="Review monthly runs, blockers, approvals, and payments."
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
            <h2 className="mt-4 font-heading text-xl font-semibold">
              No payroll generated
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Select a calendar month above to create the first draft.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            {runs.map((run) => (
              <div
                key={run.id}
                className="border-b border-slate-200 last:border-0"
              >
                <Link
                  href={`/ceo/payroll/${run.id}`}
                  className="flex min-h-20 items-center gap-3 p-3 hover:bg-violet-50/40 md:hidden"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">
                        {payrollMonthLabel(run.payroll_month)}
                      </p>
                      <span
                        className={`text-xs font-semibold ${
                          run.status === "APPROVED"
                            ? "text-emerald-700"
                            : run.status === "NEEDS_REVIEW"
                              ? "text-red-700"
                              : "text-slate-600"
                        }`}
                      >
                        {runStatus(run.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatSen(run.net_payroll_sen)} net · {run.worker_count}{" "}
                      workers
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {run.blocking_exception_count} blockers ·{" "}
                      {run.unpaidWorkerCount} unpaid
                    </p>
                  </div>
                  <ChevronRight
                    className="size-4 shrink-0 text-slate-400"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  href={`/ceo/payroll/${run.id}`}
                  className="group hidden gap-3 p-3 transition-colors hover:bg-violet-50/40 md:grid md:grid-cols-[1.4fr_repeat(5,1fr)_auto] md:items-center"
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
                        <AlertTriangle
                          className="size-3.5"
                          aria-hidden="true"
                        />
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
                      {run.paidWorkerCount} paid · {run.unpaidWorkerCount}{" "}
                      unpaid
                    </p>
                  </div>
                  <ArrowRight
                    className="size-5 text-slate-300 group-hover:text-slate-900"
                    aria-hidden="true"
                  />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

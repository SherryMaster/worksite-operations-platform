import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { removePayrollAdjustmentAction } from "@/app/ceo/payroll/actions";
import { PayrollWorkerSkeleton } from "@/components/operations/loading-skeletons";
import { ActionButton } from "@/components/phase2/action-button";
import { PayrollAdjustmentForm } from "@/components/phase6/payroll-adjustment-form";
import { PayrollPaymentForm } from "@/components/phase6/payroll-payment-form";
import { formatDate, formatDateTime } from "@/lib/phase2/format";
import {
  formatPayrollMinutes,
  formatSen,
  payrollMonthLabel,
} from "@/lib/phase6/calculations";
import { getPayrollWorker, getPayrollWorkerIdentity } from "@/lib/phase6/data";

const categoryLabels = {
  NORMAL: "Normal time · 1×",
  OVERTIME: "After 5 PM overtime · 1.5×",
  SUNDAY: "Sunday · 2×",
  PUBLIC_HOLIDAY: "Public holiday · 3×",
} as const;

export default async function PayrollWorkerPage({
  params,
}: {
  params: Promise<{ payrollWorkerId: string; runId: string }>;
}) {
  const { payrollWorkerId, runId } = await params;
  const identity = await getPayrollWorkerIdentity(payrollWorkerId, runId);
  if (!identity) notFound();
  const workerPromise = getPayrollWorker(payrollWorkerId, identity);

  return (
    <main>
      <Link
        href={`/ceo/payroll/${runId}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to payroll run
      </Link>

      <Suspense fallback={<PayrollWorkerSkeleton />}>
        <PayrollWorkerContent runId={runId} workerPromise={workerPromise} />
      </Suspense>
    </main>
  );
}

async function PayrollWorkerContent({
  runId,
  workerPromise,
}: {
  runId: string;
  workerPromise: ReturnType<typeof getPayrollWorker>;
}) {
  const data = await workerPromise;
  if (!data || data.run.id !== runId) return null;
  const { run, worker } = data;

  return (
    <>
      <div className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
            {worker.worker_name}
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            {worker.primaryProjectName ?? "No primary project"} ·{" "}
            {payrollMonthLabel(run.payroll_month)}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Net pay
          </p>
          <p className="mt-1 font-heading text-2xl font-semibold">
            {formatSen(worker.net_pay_sen)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {worker.payment_status === "PAID"
              ? "Paid"
              : run.status === "APPROVED"
                ? "Approved · unpaid"
                : "Draft amount"}
          </p>
        </div>
      </div>

      {worker.exceptions.length > 0 ? (
        <section className="mt-6 divide-y divide-amber-200 border border-amber-200 bg-amber-50">
          {worker.exceptions.map((exception) => (
            <article key={exception.id} className="p-4">
              <p className="font-semibold text-amber-950">
                {exception.message}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-violet-700">
                {exception.work_date ?? "Worker total"} · blocking
              </p>
              {exception.project_id && exception.work_date ? (
                <Link
                  href={`/ceo/attendance?view=day&project=${exception.project_id}&date=${exception.work_date}`}
                  className="mt-3 inline-flex text-sm font-semibold text-amber-900 underline"
                >
                  Correct attendance
                </Link>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      <section className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 xl:grid-cols-4">
        {[
          {
            label: "Gross earnings",
            value: formatSen(worker.gross_earnings_sen),
          },
          {
            label: "Additions",
            value: formatSen(worker.additions_sen),
          },
          {
            label: "Other deductions",
            value: formatSen(worker.deductions_sen),
          },
          {
            label: "Monthly food deduction",
            value: formatSen(worker.food_deduction_sen),
          },
        ].map((item) => (
          <article key={item.label} className="bg-white p-3">
            <p className="font-heading text-xl font-semibold">{item.value}</p>
            <h2 className="mt-1 text-xs font-semibold text-slate-500">
              {item.label}
            </h2>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <Clock3 className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold">
            Earnings by rate
          </h2>
        </div>
        {worker.buckets.length === 0 ? (
          <p className="border border-violet-100 bg-white p-5 text-sm text-slate-500">
            No payable attendance was calculated.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {worker.buckets.map((bucket) => (
              <article
                key={bucket.id}
                className="border border-violet-100 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold">
                      {categoryLabels[bucket.category]}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {bucket.projectName}
                    </p>
                  </div>
                  <p className="font-heading text-2xl font-semibold">
                    {formatSen(bucket.amount_sen)}
                  </p>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  {formatPayrollMinutes(bucket.minutes)} at{" "}
                  {formatSen(bucket.hourly_rate_sen)} per hour
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <CalendarDays className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold">
            Attendance and leave sources
          </h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {worker.sourceDays.map((day) => {
            const minutes =
              day.normal_minutes +
              day.overtime_minutes +
              day.sunday_minutes +
              day.public_holiday_minutes;
            return (
              <Link
                key={day.id}
                href={`/ceo/attendance?view=day&project=${day.project_id}&date=${day.work_date}`}
                className="border border-violet-100 bg-white p-4 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{formatDate(day.work_date)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {day.projectName} ·{" "}
                      {day.day_type.toLowerCase().replaceAll("_", " ")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatPayrollMinutes(minutes)}
                  </p>
                </div>
                {day.approved_leave ? (
                  <p className="mt-3 text-sm text-emerald-700">
                    Approved leave · {day.leave_type_name} · zero payable time
                  </p>
                ) : null}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <ReceiptText className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold">Adjustments</h2>
        </div>
        {worker.adjustments.length > 0 ? (
          <div className="mb-4 divide-y divide-slate-200 border border-violet-100 bg-white">
            {worker.adjustments.map((adjustment) => (
              <article
                key={adjustment.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {adjustment.kind === "ADDITION" ? "Addition" : "Deduction"}{" "}
                    · {formatSen(adjustment.amount_sen)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {adjustment.reason}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-400">
                    {adjustment.source === "CORRECTION"
                      ? "Generated from a paid-payroll correction"
                      : "CEO adjustment"}
                  </p>
                </div>
                {run.status !== "APPROVED" && adjustment.source === "MANUAL" ? (
                  <ActionButton
                    action={removePayrollAdjustmentAction.bind(
                      null,
                      run.id,
                      adjustment.id,
                    )}
                    label="Remove"
                    pendingLabel="Removing…"
                    variant="outline"
                    confirmMessage="Remove this adjustment and recalculate payroll?"
                  />
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <p className="mb-4 border border-violet-100 bg-white p-5 text-sm text-slate-500">
            No additions or deductions are applied.
          </p>
        )}
        {run.status !== "APPROVED" ? (
          <PayrollAdjustmentForm
            payrollRunId={run.id}
            workerId={worker.worker_id}
          />
        ) : null}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-xl font-semibold">
            Statement and payment
          </h2>
        </div>
        {worker.statement ? (
          <Link
            href={`/ceo/payroll/statements/${worker.statement.id}`}
            className="mb-4 flex items-center justify-between gap-4 border border-violet-100 bg-white p-5 hover:bg-slate-50"
          >
            <div>
              <p className="font-semibold">Worker payroll statement</p>
              <p className="mt-1 text-sm text-slate-500">
                {worker.statement.statement_number} · generated{" "}
                {formatDateTime(worker.statement.generated_at)}
              </p>
            </div>
            <FileText className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <p className="mb-4 border border-violet-100 bg-white p-5 text-sm text-slate-500">
            A statement is generated when the complete payroll run is approved.
          </p>
        )}

        {worker.payment ? (
          <div className="flex items-start gap-4 border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2
              className="mt-0.5 size-5 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-emerald-950">
                Full payment recorded · {formatSen(worker.payment.amount_sen)}
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                {formatDate(worker.payment.payment_date)} ·{" "}
                {worker.payment.method === "CASH" ? "Cash" : "Bank transfer"}
                {worker.payment.reference
                  ? ` · ${worker.payment.reference}`
                  : ""}
              </p>
            </div>
          </div>
        ) : run.status === "APPROVED" ? (
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <WalletCards className="size-4" aria-hidden="true" />
              Record one complete worker payment
            </div>
            <PayrollPaymentForm
              amountSen={worker.net_pay_sen}
              payrollRunId={run.id}
              payrollWorkerId={worker.id}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}

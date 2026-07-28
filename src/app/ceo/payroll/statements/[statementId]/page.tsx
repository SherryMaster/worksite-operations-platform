import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintStatementButton } from "@/components/phase6/print-statement-button";
import { formatDate, formatDateTime } from "@/lib/phase2/format";
import {
  formatPayrollMinutes,
  formatSen,
  payrollMonthLabel,
} from "@/lib/phase6/calculations";
import { getPayrollStatement } from "@/lib/phase6/data";
import type { Json } from "@/types/database";

type SnapshotRecord = Record<string, Json | undefined>;

function record(value: Json | undefined): SnapshotRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function number(value: Json | undefined) {
  return typeof value === "number" ? value : 0;
}

export default async function PayrollStatementPage({
  params,
}: {
  params: Promise<{ statementId: string }>;
}) {
  const { statementId } = await params;
  const data = await getPayrollStatement(statementId);
  if (!data) notFound();
  const snapshot = record(data.snapshot);
  const buckets = Array.isArray(snapshot.earning_buckets)
    ? snapshot.earning_buckets.map((item) => record(item))
    : [];
  const sourceDays = Array.isArray(snapshot.source_days)
    ? snapshot.source_days.map((item) => record(item))
    : [];
  const adjustments = Array.isArray(snapshot.adjustments)
    ? snapshot.adjustments.map((item) => record(item))
    : [];
  const companyName =
    data.company.display_name ??
    data.company.legal_name ??
    "Worksite Operations";

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <Link
          href={`/ceo/payroll/${data.run.id}/workers/${data.statement.payroll_worker_id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-stone-600"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Worker payroll
        </Link>
        <PrintStatementButton />
      </div>

      <article className="border border-stone-300 bg-white p-6 sm:p-10 print:border-0">
        <header className="flex flex-col gap-5 border-b-2 border-stone-950 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              {companyName}
            </p>
            <h1 className="mt-3 font-heading text-4xl font-semibold uppercase">
              Monthly payroll statement
            </h1>
            <p className="mt-2 text-sm text-stone-500">
              {data.statement.statement_number}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="font-heading text-2xl font-semibold uppercase">
              {payrollMonthLabel(data.run.payroll_month)}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Approved statement generated{" "}
              {formatDateTime(data.statement.generated_at)}
            </p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Worker
            </p>
            <p className="mt-1 text-xl font-semibold">
              {String(snapshot.worker_name ?? "Worker")}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Approved net pay
            </p>
            <p className="mt-1 font-heading text-3xl font-semibold">
              {formatSen(number(snapshot.net_pay_sen))}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-heading text-2xl font-semibold uppercase">
            Earnings
          </h2>
          <div className="mt-3 overflow-hidden border border-stone-300">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Minutes</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {buckets.map((bucket, index) => (
                  <tr key={`${String(bucket.id)}-${index}`}>
                    <td className="px-4 py-3">
                      {String(bucket.category)
                        .toLowerCase()
                        .replaceAll("_", " ")}{" "}
                      · {number(bucket.multiplier_basis_points) / 100}×
                    </td>
                    <td className="px-4 py-3">
                      {formatPayrollMinutes(number(bucket.minutes))}
                    </td>
                    <td className="px-4 py-3">
                      {formatSen(number(bucket.hourly_rate_sen))}/hour
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatSen(number(bucket.amount_sen))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-stone-300 bg-stone-50">
                <tr>
                  <th colSpan={3} className="px-4 py-3 text-left">
                    Gross earnings
                  </th>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatSen(number(snapshot.gross_earnings_sen))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="font-heading text-2xl font-semibold uppercase">
              Additions and deductions
            </h2>
            <dl className="mt-3 divide-y divide-stone-200 border border-stone-300 text-sm">
              {adjustments.map((adjustment, index) => (
                <div
                  key={`${String(adjustment.id)}-${index}`}
                  className="flex justify-between gap-4 p-3"
                >
                  <dt>{String(adjustment.reason ?? "Adjustment")}</dt>
                  <dd className="font-semibold">
                    {adjustment.kind === "DEDUCTION" ? "−" : "+"}
                    {formatSen(number(adjustment.amount_sen))}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 p-3">
                <dt>Fixed monthly food deduction</dt>
                <dd className="font-semibold">
                  −{formatSen(number(snapshot.food_deduction_sen))}
                </dd>
              </div>
              <div className="flex justify-between gap-4 bg-stone-50 p-3">
                <dt className="font-semibold">Net pay</dt>
                <dd className="font-semibold">
                  {formatSen(number(snapshot.net_pay_sen))}
                </dd>
              </div>
            </dl>
          </div>
          <div>
            <h2 className="font-heading text-2xl font-semibold uppercase">
              Attendance and unpaid leave
            </h2>
            <div className="mt-3 max-h-80 divide-y divide-stone-200 overflow-auto border border-stone-300 text-sm print:max-h-none print:overflow-visible">
              {sourceDays.map((day, index) => {
                const minutes =
                  number(day.normal_minutes) +
                  number(day.overtime_minutes) +
                  number(day.sunday_minutes) +
                  number(day.public_holiday_minutes);
                return (
                  <div
                    key={`${String(day.id)}-${index}`}
                    className="flex justify-between gap-4 p-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {formatDate(String(day.work_date))}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        {String(day.day_type)
                          .toLowerCase()
                          .replaceAll("_", " ")}
                        {day.approved_leave
                          ? ` · approved ${String(day.leave_type_name)}`
                          : ""}
                      </p>
                    </div>
                    <p className="font-semibold">
                      {formatPayrollMinutes(minutes)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-stone-300 pt-5 text-xs leading-5 text-stone-500">
          <p>
            Amounts are generated from the immutable approved payroll snapshot.
            Worked time is calculated by minute; approved full-day unpaid leave
            contributes zero payable time.
          </p>
          {data.payment ? (
            <p className="mt-2 font-semibold text-stone-700">
              Paid in full on {formatDate(data.payment.payment_date)} by{" "}
              {data.payment.method === "CASH" ? "cash" : "bank transfer"}
              {data.payment.reference ? ` · ${data.payment.reference}` : ""}.
            </p>
          ) : (
            <p className="mt-2 font-semibold text-stone-700">
              Payment status: unpaid.
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}

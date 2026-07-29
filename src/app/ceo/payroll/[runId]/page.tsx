import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Coins,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approvePayrollAction,
  generatePayrollAction,
} from "@/app/ceo/payroll/actions";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import {
  formatPayrollMinutes,
  formatSen,
  payrollMonthLabel,
} from "@/lib/phase6/calculations";
import { getPayrollRun } from "@/lib/phase6/data";

export default async function PayrollRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const data = await getPayrollRun(runId);
  if (!data) notFound();

  const paidWorkers = data.workers.filter(
    (worker) => worker.payment_status === "PAID",
  ).length;
  const unpaidWorkers = data.workers.length - paidWorkers;
  const totalMinutes = data.workers.reduce(
    (total, worker) =>
      total +
      worker.normal_minutes +
      worker.overtime_minutes +
      worker.sunday_minutes +
      worker.public_holiday_minutes,
    0,
  );
  const exceptions = data.workers.flatMap((worker) =>
    worker.exceptions.map((exception) => ({ exception, worker })),
  );
  const canApprove =
    data.run.status !== "APPROVED" &&
    data.run.blocking_exception_count === 0 &&
    data.run.worker_count > 0;

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/ceo/payroll"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Payroll months
      </Link>

      <div className="mt-5 flex flex-col gap-6 border-b border-violet-100 pb-8 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
            Company payroll run
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
            {payrollMonthLabel(data.run.payroll_month)}
          </h1>
          <p className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <span
              className={`inline-flex items-center gap-2 font-semibold uppercase tracking-wider ${
                data.run.status === "APPROVED"
                  ? "text-emerald-700"
                  : data.run.status === "NEEDS_REVIEW"
                    ? "text-violet-700"
                    : "text-slate-600"
              }`}
            >
              {data.run.status === "APPROVED" ? (
                <CheckCircle2 className="size-4" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-4" aria-hidden="true" />
              )}
              {data.run.status === "NEEDS_REVIEW"
                ? "Needs review after a correction"
                : data.run.status.toLowerCase()}
            </span>
            <span className="text-slate-400">
              Calculation revision {data.run.calculation_revision}
            </span>
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
          {data.run.status !== "APPROVED" ? (
            <ManagedForm
              action={generatePayrollAction}
              submitLabel="Recalculate draft"
              className="border border-violet-100 bg-white p-3"
            >
              <input
                type="hidden"
                name="payrollMonth"
                value={data.run.payroll_month.slice(0, 7)}
              />
            </ManagedForm>
          ) : null}
          {canApprove ? (
            <ActionButton
              action={approvePayrollAction.bind(null, data.run.id)}
              label="Approve complete payroll"
              pendingLabel="Approving payroll…"
              variant="default"
              confirmMessage="Approve the complete company payroll? This creates immutable worker statements."
            />
          ) : null}
        </div>
      </div>

      {!canApprove && data.run.status !== "APPROVED" ? (
        <p
          role="status"
          className="mt-5 border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"
        >
          Approval is unavailable until the run contains at least one worker and
          every blocking exception is resolved. Recalculate after correcting
          source attendance or rates.
        </p>
      ) : null}

      <section
        aria-label="Payroll summary"
        className="mt-8 grid gap-px border border-violet-100 bg-violet-100 sm:grid-cols-2 xl:grid-cols-5"
      >
        {[
          {
            icon: Users,
            label: "Workers",
            value: String(data.run.worker_count),
          },
          {
            icon: Clock3,
            label: "Payable time",
            value: formatPayrollMinutes(totalMinutes),
          },
          {
            icon: Coins,
            label: "Gross earnings",
            value: formatSen(data.run.gross_earnings_sen),
          },
          {
            icon: WalletCards,
            label: "Net payroll",
            value: formatSen(data.run.net_payroll_sen),
          },
          {
            icon: AlertTriangle,
            label: "Blocking exceptions",
            value: String(data.run.blocking_exception_count),
          },
        ].map(({ icon: Icon, label, value }) => (
          <article key={label} className="bg-white p-5">
            <Icon className="size-5 text-violet-700" aria-hidden="true" />
            <p className="mt-5 font-heading text-3xl font-semibold">{value}</p>
            <h2 className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {label}
            </h2>
          </article>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <Building2 className="size-5 text-violet-700" aria-hidden="true" />
          <h2 className="font-heading text-3xl font-semibold uppercase">
            Projects
          </h2>
        </div>
        {data.projectSummaries.length === 0 ? (
          <p className="border border-violet-100 bg-white p-5 text-sm text-slate-500">
            No project earnings are present in this run.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.projectSummaries.map((project) => (
              <article
                key={project.projectId}
                className="border border-violet-100 bg-white p-5"
              >
                <h3 className="font-heading text-xl font-semibold uppercase">
                  {project.name}
                </h3>
                <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Workers</dt>
                    <dd className="mt-1 font-semibold">
                      {project.workerCount}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Gross</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSen(project.grossEarningsSen)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Worker net</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSen(project.netPaySen)}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">
              Traceable calculations
            </p>
            <h2 className="font-heading text-3xl font-semibold uppercase">
              Workers
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            {paidWorkers} paid · {unpaidWorkers} unpaid
          </p>
        </div>
        <div className="grid gap-3 md:hidden">
          {data.workers.map((worker) => {
            const minutes =
              worker.normal_minutes +
              worker.overtime_minutes +
              worker.sunday_minutes +
              worker.public_holiday_minutes;
            const state =
              worker.exceptions.length > 0
                ? `${worker.exceptions.length} exception${worker.exceptions.length === 1 ? "" : "s"}`
                : worker.payment_status === "PAID"
                  ? "Paid"
                  : data.run.status === "APPROVED"
                    ? "Approved · unpaid"
                    : "Ready for review";

            return (
              <Link
                key={`${worker.id}:mobile`}
                href={`/ceo/payroll/${data.run.id}/workers/${worker.id}`}
                className="block rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">
                      {worker.worker_name}
                    </h3>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {worker.primaryProjectName ?? "No project"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      worker.exceptions.length > 0
                        ? "bg-red-50 text-red-800"
                        : worker.payment_status === "PAID"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-violet-50 text-violet-800"
                    }`}
                  >
                    {state}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Payable time</dt>
                    <dd className="mt-1 font-semibold">
                      {formatPayrollMinutes(minutes)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Gross</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSen(worker.gross_earnings_sen)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Deductions</dt>
                    <dd className="mt-1 font-semibold">
                      {formatSen(
                        worker.deductions_sen + worker.food_deduction_sen,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Net pay</dt>
                    <dd className="mt-1 font-semibold text-violet-800">
                      {formatSen(worker.net_pay_sen)}
                    </dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-violet-700">
                  Review worker
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto border border-violet-100 bg-white md:block">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Payable time</th>
                <th className="px-4 py-3">Gross</th>
                <th className="px-4 py-3">Deductions</th>
                <th className="px-4 py-3">Net</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3" aria-label="Open" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.workers.map((worker) => {
                const minutes =
                  worker.normal_minutes +
                  worker.overtime_minutes +
                  worker.sunday_minutes +
                  worker.public_holiday_minutes;
                return (
                  <tr key={worker.id}>
                    <td className="px-4 py-4 font-semibold">
                      {worker.worker_name}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {worker.primaryProjectName ?? "No project"}
                    </td>
                    <td className="px-4 py-4">
                      {formatPayrollMinutes(minutes)}
                    </td>
                    <td className="px-4 py-4">
                      {formatSen(worker.gross_earnings_sen)}
                    </td>
                    <td className="px-4 py-4">
                      {formatSen(
                        worker.deductions_sen + worker.food_deduction_sen,
                      )}
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      {formatSen(worker.net_pay_sen)}
                    </td>
                    <td className="px-4 py-4">
                      {worker.exceptions.length > 0
                        ? `${worker.exceptions.length} exception${worker.exceptions.length === 1 ? "" : "s"}`
                        : worker.payment_status === "PAID"
                          ? "Paid"
                          : data.run.status === "APPROVED"
                            ? "Approved · unpaid"
                            : "Ready for review"}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/ceo/payroll/${data.run.id}/workers/${worker.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-amber-800"
                      >
                        Review
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8" id="exceptions">
        <div className="mb-4 flex items-center gap-3">
          <AlertTriangle
            className="size-5 text-violet-700"
            aria-hidden="true"
          />
          <h2 className="font-heading text-3xl font-semibold uppercase">
            Exceptions
          </h2>
        </div>
        {exceptions.length === 0 ? (
          <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-5">
            <CheckCircle2
              className="mt-0.5 size-5 text-emerald-700"
              aria-hidden="true"
            />
            <div>
              <p className="font-semibold text-emerald-950">
                No blocking payroll exceptions
              </p>
              <p className="mt-1 text-sm text-emerald-900">
                Review worker amounts before approving the complete run.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-amber-200 border border-amber-200 bg-amber-50">
            {exceptions.map(({ exception, worker }) => (
              <article
                key={exception.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-amber-950">
                    {worker.worker_name}
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    {exception.message}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-violet-700">
                    {exception.work_date ?? "Worker total"} ·{" "}
                    {exception.exception_type
                      .toLowerCase()
                      .replaceAll("_", " ")}
                  </p>
                </div>
                {exception.project_id && exception.work_date ? (
                  <Link
                    href={`/ceo/attendance?view=day&project=${exception.project_id}&date=${exception.work_date}`}
                    className="inline-flex min-h-11 items-center justify-center bg-amber-900 px-4 text-sm font-semibold text-white"
                  >
                    Review attendance
                  </Link>
                ) : (
                  <Link
                    href={`/ceo/payroll/${data.run.id}/workers/${worker.id}`}
                    className="inline-flex min-h-11 items-center justify-center border border-amber-800 px-4 text-sm font-semibold text-amber-950"
                  >
                    Review worker payroll
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

import { notFound } from "next/navigation";

import { updateWorkerAction } from "@/app/ceo/workers/actions";
import {
  WorkerForm,
  type WorkerFormValues,
} from "@/components/phase3/worker-form";
import { getWorker, getWorkerOptions } from "@/lib/phase3/data";

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  const [worker, options] = await Promise.all([
    getWorker(workerId),
    getWorkerOptions(),
  ]);
  if (!worker) notFound();

  const values: WorkerFormValues = {
    address: worker.address ?? "",
    alternatePhone: worker.alternate_phone ?? "",
    assignmentStartsOn: worker.currentAssignment?.starts_on ?? "",
    cnicNumber: worker.cnic_number ?? "",
    employmentStartsOn: worker.currentEmployment?.starts_on ?? "",
    employmentStatus:
      worker.currentEmployment?.status === "ARCHIVED"
        ? "LEFT_COMPANY"
        : (worker.currentEmployment?.status ?? "ACTIVE"),
    foodDeduction: (
      (worker.currentDeduction?.monthly_amount_sen ?? 0) / 100
    ).toFixed(2),
    hourlyRate: ((worker.currentRate?.hourly_rate_sen ?? 0) / 100).toFixed(2),
    legalName: worker.legal_name,
    nationality: worker.nationality ?? "",
    notes: worker.notes ?? "",
    passportNumber: worker.passport_number ?? "",
    phoneNumber: worker.phone_number,
    projectId: worker.currentAssignment?.project_id ?? "",
    rateStartsOn: worker.currentRate?.starts_on ?? "",
    skillLevelId: worker.currentClassification?.skill_level_id ?? "",
    tradeId: worker.currentClassification?.trade_id ?? "",
    workPermitExpiryDate: worker.work_permit_expiry_date ?? "",
    workPermitIssueDate: worker.work_permit_issue_date ?? "",
    workPermitNumber: worker.work_permit_number ?? "",
  };

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="border-b border-stone-300 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Worker profile
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none">
          Edit {worker.legal_name}
        </h1>
        <p className="mt-4 text-sm text-stone-600">
          Profile, trade, skill, and deduction changes preserve their audit and
          effective history.
        </p>
      </div>
      <div className="mt-8">
        <WorkerForm
          action={updateWorkerAction.bind(null, worker.id)}
          mode="edit"
          projects={options.projects}
          skills={options.skills}
          trades={options.trades}
          values={values}
        />
      </div>
    </main>
  );
}

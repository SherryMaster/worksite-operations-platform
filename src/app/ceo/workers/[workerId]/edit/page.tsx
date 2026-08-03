import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";

import { updateWorkerAction } from "@/app/ceo/workers/actions";
import { FormContentSkeleton } from "@/components/operations/loading-skeletons";
import {
  WorkerForm,
  type WorkerFormValues,
} from "@/components/phase3/worker-form";
import {
  getWorkerEditDefaults,
  getWorkerIdentity,
  getWorkerOptions,
} from "@/lib/phase3/data";

export default async function EditWorkerPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  if (!(await getWorkerIdentity(workerId))) notFound();
  const workerPromise = getWorkerEditDefaults(workerId);
  const optionsPromise = getWorkerOptions();

  return (
    <main>
      <Link
        href={`/ceo/workers/${workerId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to worker
      </Link>
      <div className="mt-4 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Edit worker
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Profile, trade, skill, and deduction changes preserve their audit and
          effective history.
        </p>
      </div>
      <Suspense fallback={<FormContentSkeleton fields={10} />}>
        <EditWorkerForm
          workerPromise={workerPromise}
          optionsPromise={optionsPromise}
        />
      </Suspense>
    </main>
  );
}

async function EditWorkerForm({
  workerPromise,
  optionsPromise,
}: {
  workerPromise: ReturnType<typeof getWorkerEditDefaults>;
  optionsPromise: ReturnType<typeof getWorkerOptions>;
}) {
  const [worker, options] = await Promise.all([workerPromise, optionsPromise]);
  if (!worker) return null;

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
    <div className="mt-5 max-w-3xl">
      <WorkerForm
        action={updateWorkerAction.bind(null, worker.id)}
        mode="edit"
        projects={options.projects}
        skills={options.skills}
        trades={options.trades}
        values={values}
      />
    </div>
  );
}

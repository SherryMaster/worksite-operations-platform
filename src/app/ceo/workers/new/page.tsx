import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { createWorkerAction } from "@/app/ceo/workers/actions";
import {
  WorkerForm,
  type WorkerFormValues,
} from "@/components/phase3/worker-form";
import { malaysiaDateInputValue } from "@/lib/phase2/format";
import { getWorkerOptions } from "@/lib/phase3/data";

export default async function NewWorkerPage() {
  const options = await getWorkerOptions();
  const today = malaysiaDateInputValue();
  const values: WorkerFormValues = {
    address: "",
    alternatePhone: "",
    assignmentStartsOn: today,
    cnicNumber: "",
    employmentStartsOn: today,
    employmentStatus: "ACTIVE",
    foodDeduction: "0.00",
    hourlyRate: "",
    legalName: "",
    nationality: "",
    notes: "",
    passportNumber: "",
    phoneNumber: "",
    projectId: "",
    rateStartsOn: today,
    skillLevelId: "",
    tradeId: "",
    workPermitExpiryDate: "",
    workPermitIssueDate: "",
    workPermitNumber: "",
  };

  return (
    <main>
      <Link
        href="/ceo/workers"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>
      <div className="mt-4 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Create worker
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Complete the permanent worker record in four guided steps.
        </p>
      </div>

      {options.trades.length === 0 || options.skills.length === 0 ? (
        <div className="mt-8 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          Add at least one active trade and skill level in{" "}
          <Link
            href="/ceo/settings?section=trades"
            className="font-semibold underline"
          >
            Settings
          </Link>{" "}
          before creating workers.
        </div>
      ) : (
        <div className="mt-5 max-w-3xl">
          <WorkerForm
            action={createWorkerAction}
            mode="create"
            projects={options.projects}
            skills={options.skills}
            trades={options.trades}
            values={values}
          />
        </div>
      )}
    </main>
  );
}

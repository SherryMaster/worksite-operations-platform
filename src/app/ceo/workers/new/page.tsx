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
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/ceo/workers"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>
      <div className="mt-6 border-b border-violet-100 pb-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-violet-700">
          Workforce
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Create Worker
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
          This creates one permanent identity with initial employment,
          classification, rate, deduction, and optional project history.
        </p>
      </div>

      {options.trades.length === 0 || options.skills.length === 0 ? (
        <div className="mt-8 border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
          Add at least one active trade and skill level in{" "}
          <Link href="/ceo/settings#trades" className="font-semibold underline">
            Settings
          </Link>{" "}
          before creating workers.
        </div>
      ) : (
        <div className="mt-8">
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

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { createWorkerAction } from "@/app/ceo/workers/actions";
import { WorkerRecordFormSkeleton } from "@/components/operations/loading-skeletons";
import {
  WorkerForm,
  type WorkerFormValues,
} from "@/components/phase3/worker-form";
import { getWorkerOptions } from "@/lib/phase3/data";

export default function NewWorkerPage() {
  return (
    <main>
      <Link
        href="/ceo/workers"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>
      <div className="mt-4 max-w-5xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Create worker
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a permanent worker record. Nothing is saved until the final
          review.
        </p>
      </div>

      <Suspense fallback={<WorkerRecordFormSkeleton />}>
        <NewWorkerForm />
      </Suspense>
    </main>
  );
}

async function NewWorkerForm() {
  const options = await getWorkerOptions();
  const pinnedTypes = ["CNIC", "PASSPORT", "WORK_PERMIT"]
    .map((code) =>
      options.documentTypes.find((type) => type.system_code === code),
    )
    .filter((type): type is (typeof options.documentTypes)[number] =>
      Boolean(type),
    );
  const values: WorkerFormValues = {
    address: "",
    documents: pinnedTypes.map((type) => ({
      clientKey: crypto.randomUUID(),
      documentNumber: "",
      documentTypeId: type.id,
      expiryDate: "",
      file: null,
      fileAction: "keep",
      hasFile: false,
      id: null,
      issueDate: "",
      metadata: {},
      originalFilename: "",
      systemCode: type.system_code,
    })),
    foodDeduction: "0.00",
    hourlyRate: "",
    legalName: "",
    nationality: "",
    phoneNumber: "",
    photoAction: "keep",
    photoFile: null,
    photoId: null,
    rateEffectiveOn: "",
    skillLevelId: "",
    tradeId: "",
    workerId: null,
  };

  return (
    <>
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
        <div className="mt-5 max-w-[80rem]">
          <WorkerForm
            action={createWorkerAction}
            documentTypes={options.documentTypes}
            mode="create"
            skills={options.skills}
            trades={options.trades}
            values={values}
          />
        </div>
      )}
    </>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Suspense } from "react";

import { updateWorkerAction } from "@/app/ceo/workers/actions";
import { WorkerRecordFormSkeleton } from "@/components/operations/loading-skeletons";
import {
  WorkerForm,
  type WorkerFormValues,
} from "@/components/phase3/worker-form";
import {
  getWorkerEditDefaults,
  getWorkerIdentity,
  getWorkerOptions,
} from "@/lib/phase3/data";
import { malaysiaDateInputValue } from "@/lib/phase2/format";

export default async function EditWorkerPage({
  params,
  searchParams,
}: {
  params: Promise<{ workerId: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { workerId } = await params;
  const query = await searchParams;
  const initialStage = Math.max(
    0,
    ["personal", "work-pay", "documents", "photo", "review"].indexOf(
      query.stage ?? "personal",
    ),
  );
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
      <Suspense fallback={<WorkerRecordFormSkeleton />}>
        <EditWorkerForm
          initialStage={initialStage}
          workerPromise={workerPromise}
          optionsPromise={optionsPromise}
        />
      </Suspense>
    </main>
  );
}

async function EditWorkerForm({
  initialStage,
  workerPromise,
  optionsPromise,
}: {
  initialStage: number;
  workerPromise: ReturnType<typeof getWorkerEditDefaults>;
  optionsPromise: ReturnType<typeof getWorkerOptions>;
}) {
  const [worker, options] = await Promise.all([workerPromise, optionsPromise]);
  if (!worker) return null;
  if (worker.currentEmployment?.status === "ARCHIVED") {
    return (
      <p className="mt-5 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
        Archived workers are read-only.
      </p>
    );
  }

  const typeById = new Map(
    options.documentTypes.map((type) => [type.id, type]),
  );
  const pinnedCodes = ["CNIC", "PASSPORT", "WORK_PERMIT"];
  const activeDocuments = worker.documents.filter(
    (document) => document.file_kind === "DOCUMENT",
  );
  const documentDrafts = activeDocuments.map((document) => {
    const type = document.document_type_id
      ? typeById.get(document.document_type_id)
      : undefined;
    const metadata =
      document.metadata &&
      typeof document.metadata === "object" &&
      !Array.isArray(document.metadata)
        ? Object.fromEntries(
            Object.entries(document.metadata).map(([key, value]) => [
              key,
              typeof value === "string" ? value : "",
            ]),
          )
        : {};
    return {
      clientKey: crypto.randomUUID(),
      documentNumber: document.document_number ?? "",
      documentTypeId: document.document_type_id ?? "",
      expiryDate: document.expiry_date ?? "",
      file: null,
      fileAction: "keep" as const,
      hasFile: Boolean(document.object_path),
      id: document.id,
      issueDate: document.issue_date ?? "",
      metadata,
      originalFilename: document.original_filename ?? "",
      systemCode: type?.system_code ?? null,
    };
  });
  for (const code of pinnedCodes) {
    const type = options.documentTypes.find(
      (option) => option.system_code === code,
    );
    if (
      !type ||
      documentDrafts.some((document) => document.documentTypeId === type.id)
    )
      continue;
    documentDrafts.push({
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
    });
  }

  const values: WorkerFormValues = {
    address: worker.address ?? "",
    documents: documentDrafts,
    foodDeduction: (
      (worker.currentDeduction?.monthly_amount_sen ?? 0) / 100
    ).toFixed(2),
    hourlyRate: ((worker.currentRate?.hourly_rate_sen ?? 0) / 100).toFixed(2),
    legalName: worker.legal_name,
    nationality: worker.nationality ?? "",
    phoneNumber: worker.phone_number,
    photoAction: "keep",
    photoFile: null,
    photoId: worker.photoId,
    rateEffectiveOn: malaysiaDateInputValue(),
    skillLevelId: worker.currentClassification?.skill_level_id ?? "",
    tradeId: worker.currentClassification?.trade_id ?? "",
    workerId: worker.id,
  };

  return (
    <div className="mt-5 max-w-[80rem]">
      <WorkerForm
        action={updateWorkerAction.bind(null, worker.id)}
        documentTypes={options.documentTypes}
        initialStage={initialStage}
        mode="edit"
        skills={options.skills}
        trades={options.trades}
        values={values}
      />
    </div>
  );
}

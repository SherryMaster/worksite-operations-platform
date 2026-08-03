import { ArrowRight, CheckCircle2 } from "lucide-react";

import {
  documentsForSave,
  maskDraftIdentifier,
} from "@/components/phase3/worker-record-form/helpers";
import type {
  WorkerDocumentType,
  WorkerFormValues,
  WorkerOption,
  WorkerRecordMode,
} from "@/components/phase3/worker-record-form/types";
import { Button } from "@/components/ui/button";

function ReviewCard({
  changed,
  children,
  edit,
  title,
}: {
  changed: boolean;
  children: React.ReactNode;
  edit: () => void;
  title: string;
}) {
  return (
    <section
      className={`rounded-xl border bg-white ${changed ? "border-violet-200 shadow-sm" : "border-slate-200 opacity-80"}`}
    >
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {changed ? (
            <p className="text-xs font-medium text-violet-700">Changed</p>
          ) : (
            <p className="text-xs text-slate-500">No changes</p>
          )}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={edit}>
          Edit
        </Button>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ValueRow({
  after,
  before,
  label,
  mode,
}: {
  after: string;
  before?: string;
  label: string;
  mode: WorkerRecordMode;
}) {
  const changed = before !== undefined && before !== after;
  return (
    <div className="grid gap-1 border-b border-slate-100 py-2 last:border-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium">
        {mode === "edit" && changed ? (
          <span className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
            <span className="break-words text-slate-500 line-through">
              {before || "Not recorded"}
            </span>
            <ArrowRight className="size-4 text-slate-400" aria-hidden="true" />
            <span className="break-words text-slate-950">
              {after || "Not recorded"}
            </span>
          </span>
        ) : (
          after || "Not recorded"
        )}
      </dd>
    </div>
  );
}

export function ReviewSummary({
  documentTypes,
  initialValues,
  mode,
  setStage,
  skills,
  trades,
  values,
}: {
  documentTypes: WorkerDocumentType[];
  initialValues: WorkerFormValues;
  mode: WorkerRecordMode;
  setStage: (stage: number) => void;
  skills: WorkerOption[];
  trades: WorkerOption[];
  values: WorkerFormValues;
}) {
  const personalFields = [
    "legalName",
    "phoneNumber",
    "nationality",
    "address",
  ] as const;
  const workFields = [
    "hourlyRate",
    "tradeId",
    "skillLevelId",
    "foodDeduction",
    "rateEffectiveOn",
  ] as const;
  const personalChanged =
    mode === "create" ||
    personalFields.some((field) => values[field] !== initialValues[field]);
  const workChanged =
    mode === "create" ||
    workFields.some((field) => values[field] !== initialValues[field]);
  const currentDocuments = documentsForSave(values.documents);
  const initialDocuments = documentsForSave(initialValues.documents);
  const documentsChanged =
    mode === "create" ||
    JSON.stringify(currentDocuments) !== JSON.stringify(initialDocuments);
  const photoChanged =
    mode === "create" ||
    values.photoAction !== "keep" ||
    Boolean(values.photoFile);
  const typeName = (id: string) =>
    documentTypes.find((type) => type.id === id)?.name ?? "Document";
  const optionName = (options: WorkerOption[], id: string) =>
    options.find((option) => option.id === id)?.name ?? "Not selected";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ReviewCard
        title="Personal"
        changed={personalChanged}
        edit={() => setStage(0)}
      >
        <dl>
          <ValueRow
            label="Full name"
            after={values.legalName}
            before={mode === "edit" ? initialValues.legalName : undefined}
            mode={mode}
          />
          <ValueRow
            label="Phone"
            after={values.phoneNumber}
            before={mode === "edit" ? initialValues.phoneNumber : undefined}
            mode={mode}
          />
          <ValueRow
            label="Nationality"
            after={values.nationality}
            before={mode === "edit" ? initialValues.nationality : undefined}
            mode={mode}
          />
          <ValueRow
            label="Address"
            after={values.address}
            before={mode === "edit" ? initialValues.address : undefined}
            mode={mode}
          />
        </dl>
      </ReviewCard>
      <ReviewCard
        title="Work & pay"
        changed={workChanged}
        edit={() => setStage(1)}
      >
        <dl>
          <ValueRow
            label="Hourly rate"
            after={`RM ${values.hourlyRate || "0.00"}`}
            before={
              mode === "edit" ? `RM ${initialValues.hourlyRate}` : undefined
            }
            mode={mode}
          />
          <ValueRow
            label="Trade"
            after={optionName(trades, values.tradeId)}
            before={
              mode === "edit"
                ? optionName(trades, initialValues.tradeId)
                : undefined
            }
            mode={mode}
          />
          <ValueRow
            label="Skill level"
            after={optionName(skills, values.skillLevelId)}
            before={
              mode === "edit"
                ? optionName(skills, initialValues.skillLevelId)
                : undefined
            }
            mode={mode}
          />
          <ValueRow
            label="Food deduction"
            after={`RM ${values.foodDeduction || "0.00"} / month`}
            before={
              mode === "edit"
                ? `RM ${initialValues.foodDeduction} / month`
                : undefined
            }
            mode={mode}
          />
          {values.hourlyRate !== initialValues.hourlyRate ? (
            <ValueRow
              label="Rate effective from"
              after={values.rateEffectiveOn}
              mode={mode}
            />
          ) : null}
        </dl>
      </ReviewCard>
      <ReviewCard
        title="Documents"
        changed={documentsChanged}
        edit={() => setStage(2)}
      >
        {currentDocuments.length === 0 ? (
          <p className="text-sm text-slate-500">No document sections.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {currentDocuments.map((document) => {
              const draft = values.documents.find(
                (item) => item.clientKey === document.clientKey,
              );
              const before = document.id
                ? initialDocuments.find((item) => item.id === document.id)
                : undefined;
              const afterSummary = `${maskDraftIdentifier(document.documentNumber ?? "")} · ${
                draft?.file
                  ? draft.file.name
                  : document.hasFile && document.fileAction !== "remove"
                    ? "Attached"
                    : "No file attached"
              }`;
              const beforeSummary = before
                ? `${maskDraftIdentifier(before.documentNumber ?? "")} · ${before.hasFile ? "Attached" : "No file attached"}`
                : null;
              return (
                <li
                  key={document.clientKey}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                >
                  <span className="font-medium">
                    {typeName(document.documentTypeId)}
                  </span>
                  <span className="flex flex-wrap items-center gap-1 text-slate-600">
                    {mode === "edit" && beforeSummary !== afterSummary ? (
                      <>
                        <span className="line-through">
                          {beforeSummary ?? "Not present"}
                        </span>
                        <ArrowRight className="size-3" aria-hidden="true" />
                      </>
                    ) : null}
                    <span>{afterSummary}</span>
                  </span>
                </li>
              );
            })}
            {mode === "edit"
              ? initialDocuments
                  .filter(
                    (before) =>
                      before.id &&
                      !currentDocuments.some((after) => after.id === before.id),
                  )
                  .map((before) => (
                    <li
                      key={before.id}
                      className="flex flex-wrap justify-between gap-2 py-2 text-sm"
                    >
                      <span className="font-medium">
                        {typeName(before.documentTypeId)}
                      </span>
                      <span className="text-slate-600">
                        <span className="line-through">
                          {maskDraftIdentifier(before.documentNumber ?? "")}
                        </span>{" "}
                        <ArrowRight
                          className="inline size-3"
                          aria-hidden="true"
                        />{" "}
                        Removed
                      </span>
                    </li>
                  ))
              : null}
          </ul>
        )}
      </ReviewCard>
      <ReviewCard title="Photo" changed={photoChanged} edit={() => setStage(3)}>
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
          {mode === "edit" && photoChanged ? (
            <>
              <span className="text-slate-500 line-through">
                {initialValues.photoId ? "Existing private photo" : "No photo"}
              </span>
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          ) : null}
          <span>
            {values.photoFile
              ? `${values.photoFile.name} selected`
              : values.photoAction === "remove"
                ? "Existing photo will be removed"
                : values.photoId
                  ? "Existing private photo retained"
                  : "No photo selected"}
          </span>
        </p>
      </ReviewCard>
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 lg:col-span-2">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          {mode === "create"
            ? "Ready to create. Employment, classification, rate, and deduction begin on the current Malaysia business date; project remains Awaiting assignment."
            : "Ready to save reviewed changes. Employment status and project assignment remain managed in Work history."}
        </p>
      </div>
    </div>
  );
}

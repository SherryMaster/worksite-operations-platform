"use client";

import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useFormStatus } from "react-dom";

import { DocumentEditor } from "@/components/phase3/worker-record-form/document-editor";
import {
  changeStage,
  documentsForSave,
  hasDraftChanges,
  validateWorkerStage,
  workerFormStages,
} from "@/components/phase3/worker-record-form/helpers";
import { ReviewSummary } from "@/components/phase3/worker-record-form/review-summary";
import {
  PersonalStage,
  PhotoStage,
  WorkPayStage,
} from "@/components/phase3/worker-record-form/stages";
import { WorkerRecordStepper } from "@/components/phase3/worker-record-form/stepper";
import type {
  DraftErrors,
  WorkerRecordFormProps,
} from "@/components/phase3/worker-record-form/types";
import { Button } from "@/components/ui/button";
import { initialActionState } from "@/lib/phase2/validation";

function FinalSubmitButton({
  disabled,
  mode,
}: {
  disabled: boolean;
  mode: "create" | "edit";
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={disabled || pending}
      className="min-w-36 bg-violet-700 text-white hover:bg-violet-800"
    >
      {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {pending
        ? "Saving…"
        : mode === "create"
          ? "Create worker"
          : "Save changes"}
    </Button>
  );
}

export function WorkerRecordForm({
  action,
  documentTypes,
  initialStage = 0,
  mode,
  skills,
  trades,
  values: suppliedValues,
}: WorkerRecordFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(suppliedValues);
  const [stage, setStage] = useState(changeStage(0, initialStage));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const submitAction = useCallback(
    (
      previousState: import("@/lib/phase3/validation").Phase3ActionState,
      formData: FormData,
    ) => {
      for (const document of values.documents) {
        if (document.file) {
          formData.set(`documentFile-${document.clientKey}`, document.file);
        }
      }
      if (values.photoFile) formData.set("photoFile", values.photoFile);
      return action(previousState, formData);
    },
    [action, values.documents, values.photoFile],
  );
  const [state, formAction] = useActionState(submitAction, initialActionState);
  const dirty = useMemo(
    () => hasDraftChanges(values, suppliedValues),
    [suppliedValues, values],
  );
  const noChanges = mode === "edit" && !dirty;
  const documentsJson = JSON.stringify(documentsForSave(values.documents));
  const removedDocumentIds = JSON.stringify(
    suppliedValues.documents
      .filter(
        (document) =>
          document.id &&
          !values.documents.some((current) => current.id === document.id),
      )
      .map((document) => document.id),
  );

  useEffect(() => {
    if (!dirty || state.status === "success") return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      const target =
        event.target instanceof Element ? event.target.closest("a") : null;
      if (!target || target.target === "_blank") return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (
        !window.confirm(
          "Leave this worker draft? Unsaved values and selected files will be lost.",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty, state.status]);

  useEffect(() => {
    if (
      state.status !== "success" ||
      !state.workerId ||
      state.partialUploadFailures?.length
    )
      return;
    startTransition(() => router.push(`/ceo/workers/${state.workerId}`));
  }, [router, state]);

  function focusFirstError(nextErrors: DraftErrors) {
    const first = Object.keys(nextErrors)[0];
    requestAnimationFrame(() => document.getElementById(first)?.focus());
  }

  function continueToNextStage() {
    const validationStage = stage === 3 ? 4 : stage;
    const nextErrors = validateWorkerStage(
      values,
      validationStage,
      documentTypes,
      suppliedValues,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (validationStage === 4) {
        const first = Object.keys(nextErrors)[0];
        setStage(
          first.startsWith("document")
            ? 2
            : [
                  "hourlyRate",
                  "tradeId",
                  "skillLevelId",
                  "foodDeduction",
                  "rateEffectiveOn",
                ].includes(first)
              ? 1
              : 0,
        );
      }
      focusFirstError(nextErrors);
      return;
    }
    setStage(changeStage(stage, stage + 1));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors = validateWorkerStage(
      values,
      4,
      documentTypes,
      suppliedValues,
    );
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || noChanges) {
      event.preventDefault();
      focusFirstError(nextErrors);
    }
  }

  const [stageHeading, stageDescription] = [
    [
      "Personal details",
      "Start with only the worker’s essential contact information.",
    ],
    [
      "Work & pay",
      "Record the worker’s trade, skill, hourly rate, and monthly food deduction.",
    ],
    ["Documents", "Record useful metadata even when no file is available."],
    ["Worker photo", "Add an optional private profile photo now or later."],
    [
      mode === "create" ? "Review worker details" : "Review changes",
      "Reaching Review does not save anything. Use Edit to return to a section.",
    ],
  ][stage] ?? ["Worker record", "Review the worker information."];

  return (
    <form
      action={formAction}
      onSubmit={submit}
      className="relative mt-5 pb-28 sm:pb-20"
    >
      <WorkerRecordStepper stage={stage} />
      <div className="mt-4">
        <p className="text-xs font-semibold text-violet-700">
          Step {stage + 1} of 5
        </p>
        <h2 className="mt-1 font-heading text-2xl font-semibold">
          {stageHeading}
        </h2>
        <p className="mt-1 text-sm text-slate-600">{stageDescription}</p>
      </div>

      {Object.keys(errors).length > 0 ? (
        <div
          role="alert"
          aria-live="assertive"
          className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              Check {Object.keys(errors).length} highlighted field
              {Object.keys(errors).length === 1 ? "" : "s"}.
            </p>
            <p className="mt-1">{Object.values(errors)[0]}</p>
          </div>
        </div>
      ) : null}

      {state.message ? (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-lg border p-4 text-sm ${state.status === "error" ? "border-amber-200 bg-amber-50 text-amber-950" : state.partialUploadFailures?.length ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}
        >
          <p>{state.message}</p>
          {state.duplicateWorkerId ? (
            <div className="mt-3">
              <Link
                href={`/ceo/workers/${state.duplicateWorkerId}`}
                target="_blank"
                className="font-semibold text-violet-700 underline"
              >
                Open possible match: {state.duplicateWorkerName}
              </Link>
              <label className="mt-3 flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={confirmDuplicate}
                  onChange={(event) =>
                    setConfirmDuplicate(event.target.checked)
                  }
                  className="size-5"
                />
                <span>
                  I reviewed the possible match and deliberately want to
                  continue.
                </span>
              </label>
            </div>
          ) : null}
          {state.partialUploadFailures?.length && state.workerId ? (
            <Link
              href={`/ceo/workers/${state.workerId}?section=documents`}
              className="mt-3 inline-flex min-h-11 items-center font-semibold text-violet-700 underline"
            >
              Retry files in Documents
            </Link>
          ) : null}
        </div>
      ) : null}

      <input type="hidden" name="documentsJson" value={documentsJson} />
      <input
        type="hidden"
        name="removedDocumentIds"
        value={removedDocumentIds}
      />
      <input type="hidden" name="photoAction" value={values.photoAction} />
      <input type="hidden" name="currentPhotoId" value={values.photoId ?? ""} />
      {confirmDuplicate ? (
        <input type="hidden" name="confirmDuplicate" value="yes" />
      ) : null}

      <section hidden={stage !== 0} className="mt-5">
        <PersonalStage errors={errors} setValues={setValues} values={values} />
      </section>
      <section hidden={stage !== 1} className="mt-5">
        <WorkPayStage
          errors={errors}
          initialValues={suppliedValues}
          mode={mode}
          setValues={setValues}
          skills={skills}
          trades={trades}
          values={values}
        />
      </section>
      <section
        hidden={stage !== 2}
        className="mt-5"
        id="documents"
        tabIndex={-1}
      >
        <DocumentEditor
          documentTypes={documentTypes}
          documents={values.documents}
          errors={errors}
          setDocuments={(documents) =>
            setValues((current) => ({ ...current, documents }))
          }
        />
      </section>
      <section hidden={stage !== 3} className="mt-5">
        <PhotoStage
          setValues={setValues}
          values={values}
          workerId={values.workerId ?? undefined}
        />
      </section>
      <section hidden={stage !== 4} className="mt-5">
        <ReviewSummary
          documentTypes={documentTypes}
          initialValues={suppliedValues}
          mode={mode}
          setStage={setStage}
          skills={skills}
          trades={trades}
          values={values}
        />
      </section>

      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:sticky md:bottom-4 md:mt-6 md:bg-white/95 md:px-3">
        <div className="mx-auto flex max-w-[80rem] items-center justify-between gap-3">
          {stage === 0 ? (
            <Link
              href="/ceo/workers"
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold"
            >
              Cancel
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStage(changeStage(stage, stage - 1))}
            >
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
          )}
          {stage < workerFormStages.length - 1 ? (
            <Button
              type="button"
              onClick={continueToNextStage}
              className="bg-violet-700 text-white hover:bg-violet-800"
            >
              Continue
              <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <FinalSubmitButton
              disabled={
                noChanges ||
                state.status === "success" ||
                (Boolean(state.duplicateWorkerId) && !confirmDuplicate)
              }
              mode={mode}
            />
          )}
        </div>
      </div>
    </form>
  );
}

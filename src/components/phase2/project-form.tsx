"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { initialActionState, type ActionState } from "@/lib/phase2/validation";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type ProjectDefaults = {
  clientName?: string;
  contractorName?: string | null;
  endDate?: string | null;
  location?: string;
  name?: string;
  notes?: string | null;
  startDate?: string;
};

function FieldError({
  errors,
  name,
}: {
  errors: ActionState["errors"];
  name: string;
}) {
  const message = errors?.[name]?.[0];
  return message ? (
    <p className="text-xs text-red-700" id={`${name}-error`}>
      {message}
    </p>
  ) : null;
}

export function ProjectForm({
  action,
  defaults = {},
  submitLabel,
}: {
  action: ServerAction;
  defaults?: ProjectDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );
  const [step, setStep] = useState(0);

  const fieldClass =
    "h-11 rounded-xl border-violet-100 bg-white focus-visible:border-amber-600 focus-visible:ring-amber-600/20";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <nav aria-label="Project form progress">
        <ol className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {["Project details", "Schedule and notes"].map((label, index) => (
            <li
              key={label}
              className={
                index === step
                  ? "border-b-2 border-violet-700 bg-violet-50 px-3 py-2 text-center text-xs font-semibold text-violet-800"
                  : "border-b-2 border-transparent px-3 py-2 text-center text-xs text-slate-500"
              }
              aria-current={index === step ? "step" : undefined}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
      </nav>

      <section
        hidden={step !== 0}
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-heading text-xl font-semibold">
            Project details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Add the worksite identity and location.
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="name">Project name</Label>
          <Input
            id="name"
            name="name"
            defaultValue={defaults.name}
            required
            maxLength={120}
            className={fieldClass}
            aria-describedby="name-error"
          />
          <FieldError errors={state.errors} name="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientName">Client</Label>
          <Input
            id="clientName"
            name="clientName"
            defaultValue={defaults.clientName}
            required
            maxLength={120}
            className={fieldClass}
            aria-describedby="clientName-error"
          />
          <FieldError errors={state.errors} name="clientName" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contractorName">Contractor</Label>
          <Input
            id="contractorName"
            name="contractorName"
            defaultValue={defaults.contractorName ?? ""}
            maxLength={120}
            className={fieldClass}
            aria-describedby="contractorName-error"
          />
          <FieldError errors={state.errors} name="contractorName" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            defaultValue={defaults.location}
            required
            maxLength={180}
            className={fieldClass}
            aria-describedby="location-error"
          />
          <FieldError errors={state.errors} name="location" />
        </div>
      </section>

      <section
        hidden={step !== 1}
        className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <div className="md:col-span-2">
          <h2 className="font-heading text-xl font-semibold">
            Schedule and notes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the operating dates and optional site context.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaults.startDate}
            required
            className={fieldClass}
            aria-describedby="startDate-error"
          />
          <FieldError errors={state.errors} name="startDate" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date</Label>
          <Input
            id="endDate"
            name="endDate"
            type="date"
            defaultValue={defaults.endDate ?? ""}
            className={fieldClass}
            aria-describedby="endDate-error"
          />
          <FieldError errors={state.errors} name="endDate" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Operational notes</Label>
          <Textarea
            id="notes"
            name="notes"
            defaultValue={defaults.notes ?? ""}
            maxLength={2000}
            rows={6}
            className="rounded-xl border-violet-100 bg-white"
            aria-describedby="notes-error"
          />
          <FieldError errors={state.errors} name="notes" />
        </div>
      </section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
        {step === 1 ? (
          <Button type="button" variant="outline" onClick={() => setStep(0)}>
            Back
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => setStep(1)}
            className="bg-violet-700 text-white"
          >
            Continue
          </Button>
        )}
        {step === 1 ? (
          <Button
            type="submit"
            size="lg"
            disabled={pending}
            aria-busy={pending}
            className="rounded-xl bg-violet-700 px-6 text-white"
          >
            {pending ? <Spinner aria-hidden="true" /> : null}
            {pending ? "Saving project…" : submitLabel}
          </Button>
        ) : null}
        {state.message ? (
          <p
            aria-live="polite"
            className={
              state.status === "error"
                ? "text-sm text-red-700"
                : "text-sm text-emerald-700"
            }
          >
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

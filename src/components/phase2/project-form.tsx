"use client";

import { useActionState } from "react";

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

  const fieldClass =
    "h-11 rounded-none border-stone-300 bg-white focus-visible:border-amber-600 focus-visible:ring-amber-600/20";

  return (
    <form action={formAction} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
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
            className="rounded-none border-stone-300 bg-white"
            aria-describedby="notes-error"
          />
          <FieldError errors={state.errors} name="notes" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t border-stone-200 pt-6">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          aria-busy={pending}
          className="rounded-none bg-stone-950 px-6 text-stone-100"
        >
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? "Saving project…" : submitLabel}
        </Button>
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

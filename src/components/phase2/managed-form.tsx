"use client";

import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/phase2/validation";
import { cn } from "@/lib/utils";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ManagedForm({
  action,
  children,
  className,
  submitLabel,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  return (
    <form action={formAction} className={cn("space-y-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          className="rounded-none bg-stone-950 px-5 text-stone-100"
        >
          {pending ? "Saving…" : submitLabel}
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

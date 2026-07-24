"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { initialActionState, type ActionState } from "@/lib/phase2/validation";

type ServerAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ActionButton({
  action,
  confirmMessage,
  label,
  pendingLabel = "Saving…",
  variant = "outline",
}: {
  action: ServerAction;
  confirmMessage?: string;
  label: string;
  pendingLabel?: string;
  variant?: "default" | "outline" | "destructive" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialActionState,
  );

  return (
    <form
      action={formAction}
      className="space-y-2"
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <Button
        type="submit"
        variant={variant}
        disabled={pending}
        className="rounded-none"
      >
        {pending ? pendingLabel : label}
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={
            state.status === "error"
              ? "max-w-xs text-xs leading-5 text-red-700"
              : "max-w-xs text-xs leading-5 text-emerald-700"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

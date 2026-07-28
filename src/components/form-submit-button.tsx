"use client";

import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function FormSubmitButton({
  children,
  className,
  pendingLabel = "Working…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-70",
        className,
      )}
    >
      {pending ? <Spinner aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}

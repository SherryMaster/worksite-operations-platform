"use client";

import { useFormStatus } from "react-dom";

import { Spinner } from "@/components/ui/spinner";

export function ConfirmSubmitButton({
  children,
  className,
  message,
}: {
  children: React.ReactNode;
  className?: string;
  message: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        {pending ? <Spinner aria-hidden="true" /> : null}
        {pending ? "Working…" : children}
      </span>
    </button>
  );
}

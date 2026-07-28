"use client";

import { LoaderCircle } from "lucide-react";
import { useLinkStatus } from "next/link";

import { cn } from "@/lib/utils";

export function NavigationPendingIndicator({
  className,
}: {
  className?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span
        className={cn(
          "ml-auto grid size-4 shrink-0 place-items-center",
          className,
        )}
        aria-hidden="true"
      >
        {pending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
      </span>
      <span className="sr-only" aria-live="polite">
        {pending ? "Opening page" : ""}
      </span>
    </>
  );
}

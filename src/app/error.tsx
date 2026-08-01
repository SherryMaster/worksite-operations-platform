"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Record a safe reference for follow-up. The user-facing message
    // stays generic; the digest is the only technical reference we
    // surface. Do not log the message, stack, or custom fields, which
    // may include sensitive data.
    const reference: { digest?: string; name?: string } = {};
    if (error.digest) reference.digest = error.digest;
    if (error.name) reference.name = error.name;
    console.error("Workspace render error", reference);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-5 text-slate-950">
      <section className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold text-violet-700">
          Something went wrong
        </p>
        <h1 className="mt-2 font-heading text-3xl font-semibold">
          We couldn&apos;t open your workspace
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Your work has not been changed. Try again, or contact your company
          administrator if the problem continues.
        </p>
        {error.digest ? (
          <p className="mt-4 text-[0.6875rem] font-mono text-slate-500">
            Reference: {error.digest}
          </p>
        ) : null}
        <Button
          onClick={reset}
          size="lg"
          className="mt-6 rounded-lg bg-violet-700 text-white hover:bg-violet-800"
        >
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}

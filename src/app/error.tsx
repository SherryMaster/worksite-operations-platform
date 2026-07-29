"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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

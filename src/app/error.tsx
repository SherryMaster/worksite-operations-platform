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
    <main className="grid min-h-screen place-items-center bg-violet-700 px-5 text-white">
      <section className="w-full max-w-lg rounded-2xl border border-violet-500/40 bg-violet-900 p-8 shadow-2xl">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-orange-300">
          Something went wrong
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold uppercase">
          We couldn&apos;t open your workspace
        </h1>
        <p className="mt-4 leading-7 text-violet-100">
          Your work has not been changed. Try again, or contact your company
          administrator if the problem continues.
        </p>
        <Button
          onClick={reset}
          size="lg"
          className="mt-8 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300"
        >
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}

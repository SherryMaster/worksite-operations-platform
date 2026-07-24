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
    <main className="grid min-h-screen place-items-center bg-stone-950 px-5 text-stone-100">
      <section className="w-full max-w-lg border border-stone-800 bg-stone-900 p-8">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.24em] text-amber-400">
          Secure check interrupted
        </p>
        <h1 className="mt-4 font-heading text-4xl font-semibold uppercase">
          We could not open the workspace.
        </h1>
        <p className="mt-4 leading-7 text-stone-400">
          No access was granted. Try the verification again, or contact the
          administrator if the problem continues.
        </p>
        <Button
          onClick={reset}
          size="lg"
          className="mt-8 rounded-none bg-amber-400 text-stone-950 hover:bg-amber-300"
        >
          <RotateCcw aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}

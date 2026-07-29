"use client";

import { Printer } from "lucide-react";

export function PrintStatementButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center justify-center gap-2 bg-violet-700 px-5 text-sm font-semibold text-white print:hidden"
    >
      <Printer className="size-4" aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}

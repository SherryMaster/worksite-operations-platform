import { CheckCircle2, Download, FileWarning, History } from "lucide-react";
import Link from "next/link";

import { ImportWorkspace } from "@/components/phase7/import-workspace";
import { formatDateTime } from "@/lib/phase2/format";
import { listMigrationBatches } from "@/lib/phase7/imports";

function summaryValue(summary: unknown, key: string) {
  return summary &&
    typeof summary === "object" &&
    !Array.isArray(summary) &&
    typeof (summary as Record<string, unknown>)[key] === "number"
    ? ((summary as Record<string, number>)[key] ?? 0)
    : 0;
}

function issueCount(issues: unknown) {
  return Array.isArray(issues) ? issues.length : 0;
}

export default async function ImportCenterPage() {
  const batches = await listMigrationBatches();

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-stone-300 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
            Controlled Excel migration
          </p>
          <h1 className="mt-3 font-heading text-4xl font-semibold uppercase leading-none sm:text-6xl">
            Import Center
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
            Move copied legacy data through a fixed template, row-level
            validation, a no-change preview, duplicate protection, and a
            reconciled commit history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/templates/worksite-import-template.xlsx"
            download
            className="inline-flex min-h-11 items-center gap-2 bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800"
          >
            <Download className="size-4" aria-hidden="true" />
            Download Fixed Template
          </a>
          <Link
            href="/ceo/reports"
            className="inline-flex min-h-11 items-center border border-stone-300 bg-white px-4 text-sm font-semibold"
          >
            Back to Reports
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {[
          [
            "1. Copy into the template",
            "Keep the five sheet names and headers unchanged. The legacy workbook itself is never modified.",
          ],
          [
            "2. Preview and correct",
            "Every rejected row names its sheet, row, field, and correction. No company records change during preview.",
          ],
          [
            "3. Commit and reconcile",
            "Valid projects, workers, assignments, rates, and private documents commit together and appear across the app.",
          ],
        ].map(([title, description]) => (
          <div key={title} className="border border-stone-300 bg-white p-4">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-3 border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <FileWarning className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>
          The two supplied SAFAR workbooks are representative legacy
          attendance/payroll samples, not the complete company structure. They
          must be copied into the fixed template and completed with missing
          project, identity, employment, trade, skill, rate, and document
          information. The app will not invent those values.
        </p>
      </div>

      <ImportWorkspace />

      <section className="mt-8" aria-labelledby="import-history-title">
        <div className="flex items-center gap-3 border-b border-stone-300 pb-3">
          <History className="size-5 text-amber-700" aria-hidden="true" />
          <div>
            <h2
              id="import-history-title"
              className="font-heading text-2xl font-semibold uppercase"
            >
              Reconciliation History
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Recent previews and committed row totals.
            </p>
          </div>
        </div>

        {batches.length === 0 ? (
          <p className="mt-4 border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            No workbook has been previewed yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-3">
            {batches.map((batch) => {
              const errors = issueCount(batch.issues);
              return (
                <li
                  key={batch.id}
                  className="grid gap-4 border border-stone-300 bg-white p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(4rem,0.6fr))_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{batch.file_name}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Previewed {formatDateTime(batch.created_at)}
                    </p>
                    <p className="mt-1 font-mono text-[0.65rem] text-stone-400">
                      {batch.file_checksum.slice(0, 12)}…
                    </p>
                  </div>
                  {[
                    ["Projects", "projects"],
                    ["Workers", "workers"],
                    ["Assignments", "assignments"],
                    ["Rates", "rates"],
                    ["Documents", "documents"],
                  ].map(([label, key]) => (
                    <div key={key}>
                      <p className="text-xl font-semibold tabular-nums">
                        {summaryValue(batch.summary, key)}
                      </p>
                      <p className="text-[0.6rem] uppercase tracking-wider text-stone-500">
                        {label}
                      </p>
                    </div>
                  ))}
                  <div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold ${
                        batch.status === "COMMITTED"
                          ? "bg-emerald-100 text-emerald-800"
                          : errors > 0
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {batch.status === "COMMITTED" ? (
                        <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      ) : (
                        <FileWarning className="size-3.5" aria-hidden="true" />
                      )}
                      {batch.status === "COMMITTED"
                        ? "Committed"
                        : errors > 0
                          ? `${errors} issue${errors === 1 ? "" : "s"}`
                          : "Ready preview"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}

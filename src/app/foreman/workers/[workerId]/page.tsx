import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  FileText,
  Phone,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/phase2/format";
import { getWorker } from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";

export default async function ForemanWorkerPage({
  params,
}: {
  params: Promise<{ workerId: string }>;
}) {
  const { workerId } = await params;
  const worker = await getWorker(workerId);
  if (!worker) notFound();

  const documents = worker.documents.filter(
    (document) =>
      document.status === "ACTIVE" && document.file_kind === "DOCUMENT",
  );

  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-6">
      <Link
        href="/foreman/workers"
        className="inline-flex items-center gap-2 text-sm text-stone-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to workers
      </Link>

      <div className="mt-6 border-b border-stone-300 pb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
          {worker.tradeName ?? "No trade"} ·{" "}
          {worker.skillName ?? "No skill level"}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-semibold uppercase leading-none">
          {worker.legal_name}
        </h1>
        <p className="mt-3 text-sm text-stone-500">
          {maskIdentifier(worker.cnic_number ?? worker.passport_number)}
        </p>
      </div>

      <section className="mt-5 border border-stone-300 bg-white">
        <dl className="divide-y divide-stone-200">
          <div className="p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Phone
            </dt>
            <dd className="mt-2">
              <a
                href={`tel:${worker.phone_number}`}
                className="inline-flex min-h-11 items-center gap-2 font-semibold text-amber-800"
              >
                <Phone className="size-4" aria-hidden="true" />
                {worker.phone_number}
              </a>
            </dd>
          </div>
          <div className="p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Employment status
            </dt>
            <dd className="mt-2 text-sm font-semibold">
              {worker.currentEmployment?.status
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/^\w/, (letter) => letter.toUpperCase()) ??
                "Not recorded"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-5 border border-stone-300 bg-white">
        <div className="border-b border-stone-200 p-4">
          <h2 className="flex items-center gap-2 font-heading text-xl font-semibold uppercase">
            <FileText className="size-5 text-amber-700" aria-hidden="true" />
            Documents
          </h2>
        </div>
        {documents.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">
            No current worker documents are recorded.
          </p>
        ) : (
          <ol className="divide-y divide-stone-200">
            {documents.map((document) => (
              <li key={document.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {document.documentTypeName}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {document.expiry_date
                        ? `Expires ${formatDate(document.expiry_date)}`
                        : "No expiry date recorded"}
                    </p>
                    {["EXPIRED", "EXPIRING"].includes(document.expiryState) ? (
                      <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-800">
                        <AlertTriangle
                          className="size-3.5"
                          aria-hidden="true"
                        />
                        {document.expiryState === "EXPIRED"
                          ? "Expired"
                          : "Expires within 30 days"}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/api/workers/${worker.id}/documents/${document.id}`}
                    aria-label={`Open ${document.documentTypeName}`}
                    className="grid size-11 shrink-0 place-items-center border border-stone-300"
                  >
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-5 flex gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <ShieldCheck className="size-5 shrink-0" aria-hidden="true" />
        <p className="text-xs leading-5">
          This read-only record is available because the worker is currently
          assigned to your project. Rates, deductions, and private notes are
          restricted to the CEO.
        </p>
      </div>
    </main>
  );
}

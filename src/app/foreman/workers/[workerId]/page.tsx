import {
  AlertTriangle,
  ArrowUpRight,
  ChevronLeft,
  FileText,
  Phone,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusChip } from "@/components/operations/status-chip";
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
  const initials = worker.legal_name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const status = worker.currentEmployment?.status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^\w/, (letter) => letter.toUpperCase());
  const warningDocument = documents.find((document) =>
    ["EXPIRED", "EXPIRING"].includes(document.expiryState),
  );

  return (
    <main>
      <Link
        href="/foreman/workers"
        className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-slate-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Workers
      </Link>

      <div className="mt-2 flex items-start gap-3">
        <div
          aria-hidden="true"
          className="grid size-14 shrink-0 place-items-center rounded-full bg-violet-50 text-base font-semibold text-violet-800"
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-heading text-xl font-semibold">
              {worker.legal_name}
            </h1>
            <StatusChip tone={status === "Active" ? "success" : "neutral"}>
              {status ?? "Not recorded"}
            </StatusChip>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {worker.tradeName ?? "No trade"} ·{" "}
            {worker.skillName ?? "No skill level"}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Project: {worker.projectName ?? "No current project"}
          </p>
        </div>
      </div>

      {warningDocument ? (
        <a
          href="#documents"
          className="mt-4 flex min-h-12 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 text-sm text-amber-950"
        >
          <AlertTriangle
            className="size-4 shrink-0 text-amber-700"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">
            {warningDocument.documentTypeName ?? "Document"}{" "}
            {warningDocument.expiryState === "EXPIRED"
              ? "has expired"
              : `expires ${formatDate(warningDocument.expiry_date!)}`}
          </span>
          <span className="text-xs font-semibold text-violet-700">View</span>
        </a>
      ) : null}

      <nav
        aria-label="Worker sections"
        className="mt-4 flex border-b border-slate-200 text-sm font-semibold"
      >
        <a
          href="#overview"
          className="min-h-11 border-b-2 border-violet-700 px-3 py-3 text-violet-700"
        >
          Overview
        </a>
        <a
          href="#documents"
          className="min-h-11 px-3 py-3 text-slate-500 hover:text-slate-900"
        >
          Documents
        </a>
      </nav>

      <section
        id="overview"
        aria-labelledby="overview-title"
        className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        <h2 id="overview-title" className="sr-only">
          Worker overview
        </h2>
        <dl className="divide-y divide-slate-200">
          {[
            ["Nationality", worker.nationality ?? "Not recorded"],
            [
              "Identifier",
              maskIdentifier(worker.cnic_number ?? worker.passport_number),
            ],
            ["Address", worker.address ?? "Not recorded"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 px-3 py-3 text-sm"
            >
              <dt className="text-xs font-medium text-slate-500">{label}</dt>
              <dd className="break-words text-right font-medium text-slate-800">
                {value}
              </dd>
            </div>
          ))}
          <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 px-3 py-2 text-sm">
            <dt className="text-xs font-medium text-slate-500">Phone</dt>
            <dd className="text-right">
              <a
                href={`tel:${worker.phone_number}`}
                className="inline-flex min-h-10 items-center justify-end gap-2 font-semibold text-violet-700"
              >
                <Phone className="size-4" aria-hidden="true" />
                {worker.phone_number}
              </a>
            </dd>
          </div>
        </dl>
      </section>

      <section
        id="documents"
        className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white"
      >
        <div className="border-b border-slate-200 px-3 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-violet-700" aria-hidden="true" />
            Documents
          </h2>
        </div>
        {documents.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">
            No current worker documents are recorded.
          </p>
        ) : (
          <ol className="divide-y divide-slate-200">
            {documents.map((document) => (
              <li key={document.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {document.documentTypeName}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
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
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-violet-700 hover:bg-violet-50"
                  >
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        This is a read-only operational profile. Pay, deductions, transfers, and
        administrative controls are available only to the CEO.
      </p>
    </main>
  );
}

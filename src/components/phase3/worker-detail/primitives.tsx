import { Pencil } from "lucide-react";
import Link from "next/link";

import { StatusChip } from "@/components/operations/status-chip";
import { WorkerAvatar } from "@/components/worker-avatar";
import type { WorkerSummary } from "@/lib/phase3/data";
import { maskIdentifier } from "@/lib/phase3/format";

export function WorkerProfileHeader({
  canEdit,
  worker,
}: {
  canEdit: boolean;
  worker: WorkerSummary;
}) {
  const status = worker.currentEmployment?.status ?? "Not recorded";
  return (
    <header className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
      <WorkerAvatar
        name={worker.legal_name}
        photoId={worker.photoId}
        workerId={worker.id}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="break-words font-heading text-2xl font-semibold sm:text-3xl">
            {worker.legal_name}
          </h1>
          <StatusChip tone={status === "ACTIVE" ? "success" : "neutral"}>
            {status.replaceAll("_", " ")}
          </StatusChip>
        </div>
        <p className="mt-1 break-words text-sm text-slate-600">
          {worker.projectName ?? "Awaiting assignment"} ·{" "}
          {worker.tradeName ?? "No trade"} · {worker.skillName ?? "No skill"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Primary ID {maskIdentifier(worker.primaryIdentifier?.number)}
        </p>
      </div>
      {canEdit && status !== "ARCHIVED" ? (
        <Link
          href={`/ceo/workers/${worker.id}/edit`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold hover:border-violet-400"
        >
          <Pencil className="size-4" aria-hidden="true" /> Edit worker
        </Link>
      ) : null}
    </header>
  );
}

export function InfoRows({ rows }: { rows: React.ReactNode[][] }) {
  return (
    <dl className="divide-y divide-slate-100">
      {rows.map(([label, value]) => (
        <div
          key={String(label)}
          className="grid grid-cols-[minmax(7rem,35%)_1fr] gap-4 px-4 py-3 text-sm"
        >
          <dt className="text-slate-500">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-slate-900">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CompactCard({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
        <h2 className="font-heading font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

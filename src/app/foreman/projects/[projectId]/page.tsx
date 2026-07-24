import { CalendarDays, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/phase2/status-badge";
import { getProject } from "@/lib/phase2/data";
import { formatDate } from "@/lib/phase2/format";

export default async function ForemanProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();

  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-6">
      <Link
        href="/foreman"
        className="inline-flex items-center gap-2 text-sm text-stone-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to Today
      </Link>
      <div className="mt-6 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Assigned project
          </p>
          <h1 className="mt-2 font-heading text-4xl font-semibold uppercase leading-none">
            {project.name}
          </h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <section className="mt-6 border border-stone-300 bg-white">
        <dl className="divide-y divide-stone-200">
          {[
            ["Client", project.client_name],
            ["Contractor", project.contractor_name ?? "Not recorded"],
            ["Location", project.location],
            ["Start date", formatDate(project.start_date)],
            ["End date", formatDate(project.end_date)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="grid grid-cols-[7rem_1fr] gap-3 px-4 py-4"
            >
              <dt className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                {label}
              </dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-4 border border-stone-300 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Operational notes
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-stone-700">
          {project.notes || "No operational notes recorded."}
        </p>
      </section>

      <div className="mt-4 flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold">Project scope verified</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">
            The server and database confirmed this is your current assignment.
          </p>
        </div>
      </div>

      <div className="mt-4 border border-stone-300 bg-stone-100 p-4">
        <CalendarDays className="size-5 text-stone-400" aria-hidden="true" />
        <p className="mt-3 text-sm font-semibold">Operational records</p>
        <p className="mt-1 text-xs leading-5 text-stone-500">
          Workers arrive in Phase 3. Offline attendance arrives in Phase 4.
        </p>
      </div>
    </main>
  );
}

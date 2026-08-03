import { ArrowUpRight, CalendarDays, ChevronLeft, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProjectSummarySkeleton } from "@/components/operations/loading-skeletons";
import { StatusBadge } from "@/components/phase2/status-badge";
import { getProject } from "@/lib/phase2/data";
import { formatDate } from "@/lib/phase2/format";
import { listWorkers } from "@/lib/phase3/data";

export default async function ForemanProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <main>
      <Link
        href="/foreman"
        className="inline-flex items-center gap-2 text-sm text-slate-600"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to Today
      </Link>

      <Suspense fallback={<ProjectSummarySkeleton />}>
        <ForemanProjectSummary projectId={projectId} />
      </Suspense>
    </main>
  );
}

async function ForemanProjectSummary({ projectId }: { projectId: string }) {
  const [project, workers] = await Promise.all([
    getProject(projectId),
    listWorkers({ project: projectId }),
  ]);
  if (!project) notFound();

  return (
    <>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">
            Assigned project
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">
            {project.name}
          </h1>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <dl className="divide-y divide-slate-200">
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
              <dt className="text-xs font-semibold text-slate-500">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold text-slate-500">
          Operational notes
        </p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {project.notes || "No operational notes recorded."}
        </p>
      </section>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          href="/foreman/workers"
          className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <Users className="size-5 text-violet-700" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {workers.length} current{" "}
              {workers.length === 1 ? "worker" : "workers"}
            </p>
            <p className="mt-1 text-xs text-slate-500">Open worker list</p>
          </div>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/foreman/attendance"
          className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
        >
          <CalendarDays className="size-5 text-violet-700" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Attendance history</p>
            <p className="mt-1 text-xs text-slate-500">
              Review records and corrections
            </p>
          </div>
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </>
  );
}

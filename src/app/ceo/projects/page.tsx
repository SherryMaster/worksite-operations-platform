import { ArrowUpRight, FolderPlus, MapPin } from "lucide-react";
import Link from "next/link";

import { FormSubmitButton } from "@/components/form-submit-button";
import { DataViewToolbar } from "@/components/operations/data-view-toolbar";
import { PageHeader } from "@/components/operations/page-header";
import { StatusBadge } from "@/components/phase2/status-badge";
import { formatDate } from "@/lib/phase2/format";
import { listProjects } from "@/lib/phase2/data";
import { projectStatusLabel, type ProjectStatus } from "@/lib/phase2/status";
import { listWorkers } from "@/lib/phase3/data";

const statuses: ProjectStatus[] = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string }>;
}) {
  const params = await searchParams;
  const query = params.query?.trim().toLowerCase() ?? "";
  const status = statuses.includes(params.status as ProjectStatus)
    ? (params.status as ProjectStatus)
    : null;
  const [allProjects, workers] = await Promise.all([
    listProjects(),
    listWorkers(),
  ]);
  const workerCounts = workers.reduce(
    (counts, worker) => {
      const projectId = worker.currentAssignment?.project_id;
      if (projectId) counts[projectId] = (counts[projectId] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );
  const projects = allProjects.filter((project) => {
    const matchesQuery =
      !query ||
      [project.name, project.client_name, project.location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesQuery && (!status || project.status === status);
  });

  return (
    <main>
      <PageHeader
        eyebrow="Project register"
        title="Projects"
        description="Search current worksites and retain completed project history."
        action={
          <Link
            href="/ceo/projects/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            <FolderPlus className="size-4" aria-hidden="true" />
            Create project
          </Link>
        }
      />

      <form action="/ceo/projects" className="mt-4">
        <DataViewToolbar
          action="/ceo/projects"
          searchName="query"
          searchDefaultValue={params.query}
          searchPlaceholder="Search name, client, or location"
          activeFilterCount={status ? 1 : 0}
          filterTitle="Filter projects"
        >
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 w-full min-w-36 border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {projectStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <FormSubmitButton
            pendingLabel="Applying…"
            className="h-10 bg-violet-700 px-4 text-sm font-semibold text-white"
          >
            Apply
          </FormSubmitButton>
        </DataViewToolbar>
      </form>

      {projects.length === 0 ? (
        <section className="mt-6 border border-dashed border-violet-100 bg-white px-6 py-16 text-center">
          <FolderPlus
            className="mx-auto size-8 text-violet-700"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
            {query || status ? "No matching projects" : "No projects yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            {query || status
              ? "Clear or change the filters to inspect the full project register."
              : "Create the first project to begin assigning Foremen and preserving operating history."}
          </p>
        </section>
      ) : (
        <>
          <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Foreman</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Workers</th>
                  <th className="px-5 py-3 text-right font-semibold">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-violet-50/70">
                    <td className="px-5 py-2.5">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        className="font-semibold hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">
                        {project.client_name} · {project.location}
                      </p>
                    </td>
                    <td className="px-5 py-2.5">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">
                      {project.currentForeman?.displayName ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-2.5 text-xs text-slate-500">
                      {formatDate(project.start_date)}
                      <br />
                      to {formatDate(project.end_date)}
                    </td>
                    <td className="px-5 py-2.5">
                      {workerCounts[project.id] ?? 0}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        aria-label={`Open ${project.name}`}
                        className="inline-grid size-9 place-items-center border border-violet-100 hover:border-violet-950"
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white md:hidden">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/ceo/projects/${project.id}`}
                className="block border-b border-slate-200 p-3 last:border-0"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">{project.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="size-4" aria-hidden="true" />
                  {project.location}
                </p>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {project.currentForeman?.displayName ?? "No Foreman"}
                  </span>
                  <span>{workerCounts[project.id] ?? 0} workers</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

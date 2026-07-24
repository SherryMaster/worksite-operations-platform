import { ArrowUpRight, FolderPlus, MapPin, Search } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/phase2/status-badge";
import { formatDate } from "@/lib/phase2/format";
import { listProjects } from "@/lib/phase2/data";
import { projectStatusLabel, type ProjectStatus } from "@/lib/phase2/status";

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
  const projects = (await listProjects()).filter((project) => {
    const matchesQuery =
      !query ||
      [project.name, project.client_name, project.location]
        .join(" ")
        .toLowerCase()
        .includes(query);
    return matchesQuery && (!status || project.status === status);
  });

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-stone-300 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
            Project register
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
            Projects
          </h1>
          <p className="mt-4 text-sm text-stone-600">
            Search current work and retain completed project history.
          </p>
        </div>
        <Link
          href="/ceo/projects/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          <FolderPlus className="size-4" aria-hidden="true" />
          Create project
        </Link>
      </div>

      <form
        action="/ceo/projects"
        className="mt-6 grid gap-3 border border-stone-300 bg-white p-4 sm:grid-cols-[minmax(0,1fr)_13rem_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search projects</span>
          <Search
            className="absolute left-3 top-3.5 size-4 text-stone-400"
            aria-hidden="true"
          />
          <input
            name="query"
            defaultValue={params.query}
            placeholder="Search name, client, or location"
            className="h-11 w-full border border-stone-300 bg-stone-50 pl-10 pr-3 text-sm outline-none focus:border-amber-600"
          />
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 w-full border border-stone-300 bg-stone-50 px-3 text-sm outline-none focus:border-amber-600"
          >
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {projectStatusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 bg-stone-950 px-5 text-sm font-semibold text-white"
        >
          Apply filters
        </button>
      </form>

      {projects.length === 0 ? (
        <section className="mt-6 border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <FolderPlus
            className="mx-auto size-8 text-amber-700"
            aria-hidden="true"
          />
          <h2 className="mt-5 font-heading text-2xl font-semibold uppercase">
            {query || status ? "No matching projects" : "No projects yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            {query || status
              ? "Clear or change the filters to inspect the full project register."
              : "Create the first project to begin assigning Foremen and preserving operating history."}
          </p>
        </section>
      ) : (
        <>
          <div className="mt-6 hidden overflow-hidden border border-stone-300 bg-white lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-300 bg-stone-100 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Foreman</th>
                  <th className="px-5 py-3 font-semibold">Dates</th>
                  <th className="px-5 py-3 font-semibold">Workers</th>
                  <th className="px-5 py-3 text-right font-semibold">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-amber-50/50">
                    <td className="px-5 py-4">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        className="font-semibold hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="mt-1 text-xs text-stone-500">
                        {project.client_name} · {project.location}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={project.status} />
                    </td>
                    <td className="px-5 py-4 text-stone-600">
                      {project.currentForeman?.displayName ?? "Unassigned"}
                    </td>
                    <td className="px-5 py-4 text-xs text-stone-500">
                      {formatDate(project.start_date)}
                      <br />
                      to {formatDate(project.end_date)}
                    </td>
                    <td className="px-5 py-4">0</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/ceo/projects/${project.id}`}
                        aria-label={`Open ${project.name}`}
                        className="inline-grid size-9 place-items-center border border-stone-300 hover:border-stone-950"
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 lg:hidden">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/ceo/projects/${project.id}`}
                className="border border-stone-300 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-heading text-xl font-semibold uppercase">
                      {project.name}
                    </h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {project.client_name}
                    </p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <p className="mt-5 flex items-center gap-2 text-sm text-stone-600">
                  <MapPin className="size-4" aria-hidden="true" />
                  {project.location}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-stone-200 pt-4 text-xs text-stone-500">
                  <span>
                    {project.currentForeman?.displayName ?? "No Foreman"}
                  </span>
                  <span>0 workers</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

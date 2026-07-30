import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ClipboardClock,
  HardHat,
  MapPin,
  Pencil,
  Users,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  assignForemanAction,
  changeProjectStatusAction,
} from "@/app/ceo/actions";
import { ActionButton } from "@/components/phase2/action-button";
import { ManagedForm } from "@/components/phase2/managed-form";
import { StatusBadge } from "@/components/phase2/status-badge";
import { LeaveRequestList } from "@/components/phase5/leave-request-list";
import { getProject, listForemen } from "@/lib/phase2/data";
import {
  formatDate,
  formatDateTime,
  malaysiaDateInputValue,
} from "@/lib/phase2/format";
import {
  nextProjectStatuses,
  projectStatusLabel,
  type ProjectStatus,
} from "@/lib/phase2/status";
import { listWorkers } from "@/lib/phase3/data";
import { listLeaveRequests } from "@/lib/phase5/data";

const confirmation: Partial<Record<ProjectStatus, string>> = {
  ACTIVE:
    "Confirm this status change. Reopening a project is recorded in its permanent history.",
  CANCELLED:
    "Cancel this project? Its current Foreman assignment will end immediately.",
  COMPLETED:
    "Complete this project? Its current Foreman assignment will end immediately.",
  ARCHIVED: "Archive this project? Archived project details become read-only.",
  PLANNED:
    "Restore this archived project to planned? The restoration will be audited.",
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { projectId } = await params;
  const requestedTab = (await searchParams).tab;
  const tab = ["overview", "workforce", "leave", "history"].includes(
    requestedTab ?? "",
  )
    ? requestedTab!
    : "overview";
  const [project, foremen, workers, leaveRequests] = await Promise.all([
    getProject(projectId),
    tab === "overview" ? listForemen() : Promise.resolve([]),
    tab === "overview" || tab === "workforce"
      ? listWorkers({ project: projectId })
      : Promise.resolve([]),
    tab === "leave" ? listLeaveRequests({ projectId }) : Promise.resolve([]),
  ]);
  if (!project) notFound();

  const availableForemen = foremen.filter(
    (foreman) =>
      foreman.isActive &&
      foreman.applicationUserId !== project.currentForeman?.applicationUserId &&
      !foreman.projectId,
  );

  return (
    <main>
      <Link
        href="/ceo/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to projects
      </Link>

      <div className="mt-4 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
          </div>
          <h1 className="mt-2 font-heading text-2xl font-semibold sm:text-3xl">
            {project.name}
          </h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="size-4 text-violet-700" aria-hidden="true" />
            {project.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {project.status !== "ARCHIVED" ? (
            <Link
              href={`/ceo/projects/${project.id}/edit`}
              className="inline-flex min-h-11 items-center gap-2 border border-violet-100 bg-white px-4 text-sm font-semibold hover:border-violet-950"
            >
              <Pencil className="size-4" aria-hidden="true" />
              Edit project
            </Link>
          ) : null}
          {nextProjectStatuses(project.status).map((status) => (
            <ActionButton
              key={status}
              action={changeProjectStatusAction.bind(null, project.id, status)}
              label={
                status === "ACTIVE" && project.status !== "PLANNED"
                  ? "Reopen project"
                  : status === "PLANNED"
                    ? "Restore project"
                    : `Mark ${projectStatusLabel(status)}`
              }
              confirmMessage={confirmation[status]}
              variant={
                status === "CANCELLED" || status === "ARCHIVED"
                  ? "destructive"
                  : "outline"
              }
            />
          ))}
        </div>
      </div>

      <nav
        aria-label="Project sections"
        className="mt-3 flex gap-1 overflow-x-auto border-b border-slate-200"
      >
        {[
          ["Overview", "overview"],
          ["Workforce", "workforce"],
          ["Attendance", "attendance"],
          ["Leave", "leave"],
          ["History", "history"],
        ].map(([label, value]) => (
          <Link
            key={value}
            href={
              value === "attendance"
                ? `/ceo/attendance?project=${project.id}`
                : `/ceo/projects/${project.id}?tab=${value}`
            }
            className={
              value === tab
                ? "border-b-2 border-amber-600 px-4 py-3 text-sm font-semibold"
                : "border-b-2 border-transparent px-4 py-3 text-sm text-slate-500 hover:text-slate-950"
            }
          >
            {label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <>
          <section className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.4fr]">
            <article className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-heading text-lg font-semibold">
                  Project details
                </h2>
              </div>
              <dl className="grid sm:grid-cols-2">
                {[
                  ["Client", project.client_name],
                  ["Contractor", project.contractor_name ?? "Not recorded"],
                  ["Start date", formatDate(project.start_date)],
                  ["End date", formatDate(project.end_date)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-b border-slate-200 px-5 py-5 sm:odd:border-r"
                  >
                    <dt className="text-xs font-semibold text-slate-500">
                      {label}
                    </dt>
                    <dd className="mt-2 text-sm font-medium">{value}</dd>
                  </div>
                ))}
                <div className="px-5 py-5 sm:col-span-2">
                  <dt className="text-xs font-semibold text-slate-500">
                    Operational notes
                  </dt>
                  <dd className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {project.notes || "No operational notes recorded."}
                  </dd>
                </div>
              </dl>
            </article>

            <aside className="rounded-lg border border-slate-200 bg-white p-5">
              <CalendarDays
                className="size-5 text-violet-700"
                aria-hidden="true"
              />
              <p className="mt-4 text-xs font-semibold text-slate-500">
                Workforce
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums">
                {workers.length}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                {workers.length === 1
                  ? "Worker currently assigned."
                  : "Workers currently assigned."}
              </p>
            </aside>
          </section>

          <section className="mt-4 rounded-lg border border-slate-200 bg-white">
            <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
              <div>
                <HardHat
                  className="size-5 text-violet-700"
                  aria-hidden="true"
                />
                <p className="mt-3 text-xs font-semibold text-slate-500">
                  Current Foreman
                </p>
                <h2 className="mt-1 font-heading text-xl font-semibold">
                  {project.currentForeman?.displayName ?? "Unassigned"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {project.currentForeman
                    ? project.currentForeman.username
                      ? `@${project.currentForeman.username}`
                      : project.currentForeman.emailAddress
                    : "Assign an active Foreman to open the field workspace."}
                </p>
              </div>

              {project.status === "PLANNED" || project.status === "ACTIVE" ? (
                availableForemen.length > 0 ? (
                  <ManagedForm
                    action={assignForemanAction.bind(null, project.id)}
                    submitLabel={
                      project.currentForeman
                        ? "Replace Foreman"
                        : "Assign Foreman"
                    }
                    className="border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2 text-sm font-medium">
                        <span>Available Foreman</span>
                        <select
                          name="foremanUserId"
                          required
                          className="h-11 w-full border border-violet-100 bg-white px-3 text-sm"
                        >
                          <option value="">Select Foreman</option>
                          {availableForemen.map((foreman) => (
                            <option
                              key={foreman.applicationUserId}
                              value={foreman.applicationUserId}
                            >
                              {foreman.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2 text-sm font-medium">
                        <span>Effective date</span>
                        <input
                          type="date"
                          name="startsOn"
                          required
                          defaultValue={malaysiaDateInputValue()}
                          max={malaysiaDateInputValue()}
                          className="h-11 w-full border border-violet-100 bg-white px-3 text-sm"
                        />
                      </label>
                    </div>
                  </ManagedForm>
                ) : (
                  <div className="border border-dashed border-violet-100 bg-slate-50 p-5">
                    <p className="text-sm font-semibold">
                      No unassigned active Foreman is available.
                    </p>
                    <Link
                      href="/ceo/settings?section=users"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:underline"
                    >
                      Manage Foremen
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </Link>
                  </div>
                )
              ) : (
                <div className="border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  Foremen can only be assigned while a project is planned or
                  active.
                </div>
              )}
            </div>
          </section>
        </>
      ) : null}

      {tab === "workforce" ? (
        <section className="mt-5 rounded-lg border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-5">
            <div>
              <h2 className="font-heading text-lg font-semibold">
                Assigned Workers
              </h2>
            </div>
            <Users className="size-5 text-violet-700" aria-hidden="true" />
          </div>
          {workers.length === 0 ? (
            <div className="p-6">
              <p className="text-sm text-slate-500">
                No workers are currently assigned to this project.
              </p>
              <Link
                href="/ceo/workers"
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-800"
              >
                Manage workforce
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {workers.map((worker) => (
                <Link
                  key={worker.id}
                  href={`/ceo/workers/${worker.id}`}
                  className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">{worker.legal_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {worker.tradeName ?? "No trade"} ·{" "}
                      {worker.skillName ?? "No skill level"}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "leave" ? (
        <section className="mt-5">
          <div className="mb-4">
            <h2 className="font-heading text-xl font-semibold">
              Worker leave history
            </h2>
          </div>
          <LeaveRequestList requests={leaveRequests} />
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="mt-5">
          <div className="flex items-center gap-3">
            <ClipboardClock
              className="size-5 text-violet-700"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-semibold text-slate-500">
                Permanent history
              </p>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                Status and Foreman timeline
              </h2>
            </div>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-2">
            <article className="border border-violet-100 bg-white">
              <h3 className="border-b border-slate-200 px-5 py-4 font-heading text-base font-semibold">
                Status history
              </h3>
              <ol className="divide-y divide-slate-200">
                {project.statusHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <StatusBadge status={entry.status} />
                    <time className="text-xs text-slate-500">
                      {formatDateTime(entry.effective_at)}
                    </time>
                  </li>
                ))}
              </ol>
            </article>
            <article className="border border-violet-100 bg-white">
              <h3 className="border-b border-slate-200 px-5 py-4 font-heading text-base font-semibold">
                Foreman history
              </h3>
              {project.assignments.length === 0 ? (
                <p className="px-5 py-8 text-sm text-slate-500">
                  No Foreman has been assigned.
                </p>
              ) : (
                <ol className="divide-y divide-slate-200">
                  {project.assignments.map((assignment) => (
                    <li key={assignment.id} className="px-5 py-4">
                      <p className="text-sm font-semibold">
                        {assignment.foreman?.displayName}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(assignment.starts_on)} to{" "}
                        {formatDate(assignment.ends_on)}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}

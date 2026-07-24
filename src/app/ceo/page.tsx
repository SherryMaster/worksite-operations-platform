import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  HardHat,
  Settings,
  UserRoundCheck,
} from "lucide-react";
import Link from "next/link";

import { getDashboardData } from "@/lib/phase2/data";

export default async function CeoDashboard() {
  const data = await getDashboardData();
  const activeProjects = data.projects.filter(
    (project) => project.status === "ACTIVE",
  ).length;
  const activeForemen = data.foremen.filter(
    (foreman) => foreman.isActive,
  ).length;
  const actionCount =
    data.projectsWithoutForemen.length +
    data.unassignedActiveForemen.length +
    data.pendingInvitationCount +
    (data.companyConfigured ? 0 : 1);

  const metrics = [
    {
      label: "Active projects",
      value: activeProjects,
      detail: `${data.projects.length} total project${data.projects.length === 1 ? "" : "s"}`,
      icon: Building2,
      href: "/ceo/projects?status=ACTIVE",
    },
    {
      label: "Active Foremen",
      value: activeForemen,
      detail: `${data.unassignedActiveForemen.length} awaiting assignment`,
      icon: HardHat,
      href: "/ceo/settings#users",
    },
    {
      label: "Action required",
      value: actionCount,
      detail: "Operating-structure checks",
      icon: CircleAlert,
      href: "#action-required",
    },
  ];

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-5 border-b border-stone-300 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
            Operating structure
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none tracking-tight sm:text-6xl">
            Company dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
            Projects, Foremen, and setup exceptions are shown from the live
            development database.
          </p>
        </div>
        <Link
          href="/ceo/projects/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Create project
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <section
        aria-label="Company summary"
        className="mt-8 grid gap-px border border-stone-300 bg-stone-300 lg:grid-cols-3"
      >
        {metrics.map(({ label, value, detail, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group bg-white p-6 transition-colors hover:bg-amber-50"
          >
            <div className="flex items-start justify-between">
              <Icon className="size-5 text-amber-700" aria-hidden="true" />
              <ArrowUpRight
                className="size-4 text-stone-300 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-stone-700"
                aria-hidden="true"
              />
            </div>
            <p className="mt-8 font-heading text-5xl font-semibold">{value}</p>
            <h2 className="mt-2 font-heading text-lg font-semibold uppercase">
              {label}
            </h2>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </Link>
        ))}
      </section>

      <section
        id="action-required"
        className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_0.6fr]"
      >
        <article className="border border-stone-300 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
                Action required
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
                Setup queue
              </h2>
            </div>
            <span className="font-heading text-3xl font-semibold text-stone-300">
              {String(actionCount).padStart(2, "0")}
            </span>
          </div>
          <div className="divide-y divide-stone-200">
            {actionCount === 0 ? (
              <div className="flex items-start gap-4 p-6">
                <UserRoundCheck
                  className="mt-0.5 size-5 text-emerald-600"
                  aria-hidden="true"
                />
                <div>
                  <p className="font-semibold">Operating structure is ready</p>
                  <p className="mt-1 text-sm text-stone-500">
                    No Phase 2 setup exceptions need attention.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {data.projectsWithoutForemen.map((project) => (
                  <Link
                    key={project.id}
                    href={`/ceo/projects/${project.id}`}
                    className="flex items-center justify-between gap-4 p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">{project.name}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Needs a current Foreman
                      </p>
                    </div>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ))}
                {data.unassignedActiveForemen.length > 0 ? (
                  <Link
                    href="/ceo/settings#users"
                    className="flex items-center justify-between gap-4 p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {data.unassignedActiveForemen.length} active{" "}
                        {data.unassignedActiveForemen.length === 1
                          ? "Foreman"
                          : "Foremen"}{" "}
                        awaiting assignment
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Review users and project assignments
                      </p>
                    </div>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                {data.pendingInvitationCount > 0 ? (
                  <Link
                    href="/ceo/settings#users"
                    className="flex items-center justify-between gap-4 p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        {data.pendingInvitationCount} pending Foreman invitation
                        {data.pendingInvitationCount === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Waiting for account setup
                      </p>
                    </div>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                {!data.companyConfigured ? (
                  <Link
                    href="/ceo/settings#company"
                    className="flex items-center justify-between gap-4 p-5 hover:bg-stone-50"
                  >
                    <div>
                      <p className="text-sm font-semibold">
                        Company identity is incomplete
                      </p>
                      <p className="mt-1 text-xs text-stone-500">
                        Add legal and display names
                      </p>
                    </div>
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </>
            )}
          </div>
        </article>

        <aside className="border border-stone-800 bg-stone-950 p-6 text-stone-100">
          <Settings className="size-5 text-amber-400" aria-hidden="true" />
          <p className="mt-8 font-heading text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
            Phase 2
          </p>
          <h2 className="mt-2 font-heading text-3xl font-semibold uppercase">
            Structure before workforce
          </h2>
          <p className="mt-4 text-sm leading-6 text-stone-400">
            Configure projects, Foremen, trades, skills, and company identity
            before worker records arrive in Phase 3.
          </p>
          <Link
            href="/ceo/settings"
            className="mt-8 inline-flex items-center gap-2 border border-stone-700 px-4 py-3 text-sm font-semibold hover:border-amber-400 hover:text-amber-300"
          >
            Open settings
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </aside>
      </section>
    </main>
  );
}

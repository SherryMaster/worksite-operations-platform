import {
  ArrowUpRight,
  CheckCircle2,
  DatabaseZap,
  FolderPlus,
  LockKeyhole,
} from "lucide-react";

const controls = [
  {
    title: "Identity mapping",
    text: "Clerk identities resolve to active application roles.",
    icon: CheckCircle2,
  },
  {
    title: "Route authorization",
    text: "CEO and Foreman workspaces are checked on the server.",
    icon: LockKeyhole,
  },
  {
    title: "Database policies",
    text: "Row-level security limits access at the data boundary.",
    icon: DatabaseZap,
  },
];

export default function CeoDashboard() {
  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <div className="flex flex-col gap-4 border-b border-stone-300 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
            Friday · Operational overview
          </p>
          <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none tracking-tight sm:text-6xl">
            Company dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
            The secure foundation is active. Operational records begin in Phase
            2, so no project or workforce totals are shown yet.
          </p>
        </div>
        <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">
          <span className="size-2 rounded-full bg-emerald-500" />
          Foundation healthy
        </div>
      </div>

      <section className="mt-8 grid gap-px border border-stone-300 bg-stone-300 lg:grid-cols-3">
        {controls.map(({ title, text, icon: Icon }, index) => (
          <article key={title} className="bg-white p-6">
            <div className="flex items-start justify-between">
              <Icon className="size-5 text-amber-700" aria-hidden="true" />
              <span className="font-heading text-2xl font-semibold text-stone-300">
                0{index + 1}
              </span>
            </div>
            <h2 className="mt-8 font-heading text-xl font-semibold uppercase">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <article className="border border-stone-300 bg-white">
          <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
            <div>
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Projects
              </p>
              <h2 className="mt-1 font-heading text-2xl font-semibold uppercase">
                No active projects
              </h2>
            </div>
            <span className="grid size-10 place-items-center bg-stone-100 text-stone-500">
              <FolderPlus className="size-5" aria-hidden="true" />
            </span>
          </div>
          <div className="p-5 sm:p-8">
            <div className="border border-dashed border-stone-300 bg-stone-50 px-5 py-12 text-center">
              <p className="font-heading text-xl font-semibold uppercase">
                Project setup opens in Phase 2
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                The next usable increment adds project, Foreman, and settings
                management without changing this access foundation.
              </p>
            </div>
          </div>
        </article>

        <article className="border border-stone-800 bg-stone-950 p-6 text-stone-100">
          <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-amber-400">
            Phase status
          </p>
          <p className="mt-5 font-heading text-5xl font-semibold uppercase leading-none">
            01
          </p>
          <p className="mt-2 font-heading text-2xl font-semibold uppercase">
            Access foundation
          </p>
          <div className="mt-8 h-1 bg-stone-800">
            <div className="h-full w-full bg-amber-400" />
          </div>
          <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
            <span>Implementation complete</span>
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </div>
        </article>
      </section>
    </main>
  );
}

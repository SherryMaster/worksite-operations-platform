import {
  ArrowUpRight,
  Building2,
  CalendarDays,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/phase2/status-badge";
import { getForemanWorkspace } from "@/lib/phase2/data";
import { formatDate } from "@/lib/phase2/format";

export default async function ForemanToday() {
  const project = await getForemanWorkspace();

  return (
    <main className="min-h-[calc(100vh-9rem)] px-4 pb-24 pt-8">
      <p className="font-heading text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        Today
      </p>
      <h1 className="mt-2 font-heading text-5xl font-semibold uppercase leading-none">
        Site operations
      </h1>

      {!project ? (
        <section className="mt-8 border border-stone-300 bg-white p-5">
          <div className="grid size-12 place-items-center bg-amber-100 text-amber-800">
            <Building2 className="size-6" aria-hidden="true" />
          </div>
          <h2 className="mt-6 font-heading text-2xl font-semibold uppercase">
            Project assignment required
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Your account is active and secure, but no current project is
            assigned. Ask the CEO to assign a project before operational data
            becomes available.
          </p>
        </section>
      ) : (
        <section className="mt-8 overflow-hidden border border-stone-300 bg-white">
          <div className="bg-stone-950 p-5 text-stone-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">
                  Assigned project
                </p>
                <h2 className="mt-3 font-heading text-3xl font-semibold uppercase leading-none">
                  {project.name}
                </h2>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-stone-300">
              <MapPin className="size-4 text-amber-400" aria-hidden="true" />
              {project.location}
            </p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-stone-200 border-b border-stone-200">
            <div className="p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500">
                Client
              </p>
              <p className="mt-2 text-sm font-semibold">
                {project.client_name}
              </p>
            </div>
            <div className="p-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-stone-500">
                Operating dates
              </p>
              <p className="mt-2 text-xs font-semibold">
                {formatDate(project.start_date)} —{" "}
                {formatDate(project.end_date)}
              </p>
            </div>
          </div>
          <Link
            href={`/foreman/projects/${project.id}`}
            className="flex min-h-12 items-center justify-between px-5 text-sm font-semibold hover:bg-amber-50"
          >
            Open assigned project
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      )}

      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="border border-stone-300 bg-white p-4">
          <CalendarDays className="size-5 text-stone-400" aria-hidden="true" />
          <p className="mt-5 font-heading text-lg font-semibold uppercase">
            Attendance
          </p>
          <p className="mt-1 text-xs text-stone-500">Opens in Phase 4</p>
        </div>
        <div className="border border-emerald-200 bg-emerald-50 p-4">
          <ShieldCheck className="size-5 text-emerald-700" aria-hidden="true" />
          <p className="mt-5 font-heading text-lg font-semibold uppercase text-emerald-950">
            Scope verified
          </p>
          <p className="mt-1 text-xs text-emerald-800">Current project only</p>
        </div>
      </section>
    </main>
  );
}

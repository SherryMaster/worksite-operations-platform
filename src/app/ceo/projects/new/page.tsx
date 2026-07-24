import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { createProjectAction } from "@/app/ceo/actions";
import { ProjectForm } from "@/components/phase2/project-form";
import { malaysiaDateInputValue } from "@/lib/phase2/format";

export default function NewProjectPage() {
  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href="/ceo/projects"
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to projects
      </Link>
      <div className="mt-6 max-w-4xl">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          New operating unit
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Create project
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600">
          Keep the record lean: who the work is for, where it happens, its
          dates, and the notes the operating team needs.
        </p>
      </div>

      <section className="mt-8 max-w-4xl border border-stone-300 bg-white p-5 sm:p-8">
        <ProjectForm
          action={createProjectAction}
          defaults={{ startDate: malaysiaDateInputValue() }}
          submitLabel="Create project"
        />
      </section>
    </main>
  );
}

import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { createProjectAction } from "@/app/ceo/actions";
import { ProjectForm } from "@/components/phase2/project-form";
import { malaysiaDateInputValue } from "@/lib/phase2/format";

export default function NewProjectPage() {
  return (
    <main>
      <Link
        href="/ceo/projects"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to projects
      </Link>
      <div className="mt-4 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Create project
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Add the worksite details in two short steps.
        </p>
      </div>

      <section className="mt-5 max-w-3xl">
        <ProjectForm
          action={createProjectAction}
          defaults={{ startDate: malaysiaDateInputValue() }}
          submitLabel="Create project"
        />
      </section>
    </main>
  );
}

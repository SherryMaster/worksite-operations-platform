import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateProjectAction } from "@/app/ceo/actions";
import { ProjectForm } from "@/components/phase2/project-form";
import { getProject } from "@/lib/phase2/data";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await getProject(projectId);
  if (!project) notFound();
  if (project.status === "ARCHIVED") {
    redirect(`/ceo/projects/${project.id}`);
  }

  return (
    <main className="px-5 py-8 sm:px-8 lg:py-10">
      <Link
        href={`/ceo/projects/${project.id}`}
        className="inline-flex items-center gap-2 text-sm text-stone-600 hover:text-stone-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to project
      </Link>
      <div className="mt-6 max-w-4xl">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.23em] text-amber-700">
          Project record
        </p>
        <h1 className="mt-3 font-heading text-5xl font-semibold uppercase leading-none sm:text-6xl">
          Edit {project.name}
        </h1>
      </div>

      <section className="mt-8 max-w-4xl border border-stone-300 bg-white p-5 sm:p-8">
        <ProjectForm
          action={updateProjectAction.bind(null, project.id)}
          defaults={{
            name: project.name,
            clientName: project.client_name,
            contractorName: project.contractor_name,
            location: project.location,
            startDate: project.start_date,
            endDate: project.end_date,
            notes: project.notes,
          }}
          submitLabel="Save project"
        />
      </section>
    </main>
  );
}

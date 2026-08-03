import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { updateProjectAction } from "@/app/ceo/actions";
import { FormContentSkeleton } from "@/components/operations/loading-skeletons";
import { ProjectForm } from "@/components/phase2/project-form";
import { getProject } from "@/lib/phase2/data";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <main>
      <Link
        href={`/ceo/projects/${projectId}`}
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-950"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        Back to project
      </Link>
      <div className="mt-4 max-w-3xl">
        <h1 className="font-heading text-2xl font-semibold sm:text-3xl">
          Edit project
        </h1>
      </div>

      <Suspense fallback={<FormContentSkeleton fields={7} />}>
        <EditProjectForm projectId={projectId} />
      </Suspense>
    </main>
  );
}

async function EditProjectForm({ projectId }: { projectId: string }) {
  const project = await getProject(projectId);
  if (!project) notFound();
  if (project.status === "ARCHIVED") {
    redirect(`/ceo/projects/${project.id}`);
  }

  return (
    <section className="mt-5 max-w-3xl">
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
  );
}

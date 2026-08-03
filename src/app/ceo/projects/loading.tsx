import { DirectoryRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <DirectoryRouteLoading
      title="Projects"
      description="Review project status, assignments, dates, and workforce."
      action="New project"
      actionHref="/ceo/projects/new"
      columns={6}
      filters={1}
    />
  );
}

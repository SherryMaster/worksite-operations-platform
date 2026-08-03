import { DirectoryRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <DirectoryRouteLoading
      title="Workers"
      description="Search, review, and manage the company workforce."
      action="Add worker"
      actionHref="/ceo/workers/new"
      columns={6}
      filters={4}
      showLeading
    />
  );
}

import { DirectoryRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <DirectoryRouteLoading
      title="Workers"
      description="Current workers assigned to this project."
      columns={3}
      filters={0}
      showLeading
    />
  );
}

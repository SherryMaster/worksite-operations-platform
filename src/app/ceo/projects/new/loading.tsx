import { FormRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <FormRouteLoading
      backLabel="Back to projects"
      title="Create project"
      description="Create the project record before assigning a Foreman or workforce."
      fields={7}
    />
  );
}

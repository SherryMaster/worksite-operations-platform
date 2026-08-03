import { FormRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <FormRouteLoading
      backLabel="Back to project"
      title="Edit project"
      fields={7}
    />
  );
}

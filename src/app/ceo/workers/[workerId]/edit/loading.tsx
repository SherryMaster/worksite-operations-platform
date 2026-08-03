import { FormRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <FormRouteLoading
      backLabel="Back to worker"
      title="Edit worker"
      description="Update identity and contact information."
      fields={10}
    />
  );
}

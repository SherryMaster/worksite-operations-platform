import { FormRouteLoading } from "@/components/operations/route-loading";

export default function Loading() {
  return (
    <FormRouteLoading
      backLabel="Back to workers"
      title="Create worker"
      description="Create identity, employment, classification, and assignment records."
      fields={12}
    />
  );
}

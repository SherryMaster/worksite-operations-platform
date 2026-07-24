import { redirect } from "next/navigation";

import { AccessState } from "@/components/access-state";
import { destinationForAccess, getCurrentAccess } from "@/lib/auth/access";

export default async function UnmappedAccessPage() {
  const access = await getCurrentAccess();

  if (access.status !== "UNMAPPED") {
    redirect(destinationForAccess(access));
  }

  return (
    <AccessState
      eyebrow="Account not linked"
      title="Your company access is not ready."
      description="Your sign-in is valid, but it is not linked to an application role. Ask the CEO or system administrator to activate this account."
    />
  );
}

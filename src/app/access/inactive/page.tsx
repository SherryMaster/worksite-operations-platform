import { redirect } from "next/navigation";

import { AccessState } from "@/components/access-state";
import { destinationForAccess, getCurrentAccess } from "@/lib/auth/access";

export default async function InactiveAccessPage() {
  const access = await getCurrentAccess();

  if (access.status !== "INACTIVE") {
    redirect(destinationForAccess(access));
  }

  return (
    <AccessState
      eyebrow="Access suspended"
      title="This account is inactive."
      description="Your identity is linked, but company access has been deactivated. Contact the CEO if you believe this is a mistake."
    />
  );
}

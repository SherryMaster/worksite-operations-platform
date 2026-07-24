import { redirect } from "next/navigation";

import { destinationForAccess, getCurrentAccess } from "@/lib/auth/access";

export default async function Home() {
  const access = await getCurrentAccess();
  redirect(destinationForAccess(access));
}

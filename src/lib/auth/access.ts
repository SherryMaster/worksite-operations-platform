import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { logger } from "@/lib/server/logger";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  destinationForAccess,
  evaluateAccess,
  type ApplicationAccess,
  type ApplicationRole,
} from "@/lib/auth/policy";

export { destinationForAccess } from "@/lib/auth/policy";

export async function getCurrentAccess(): Promise<ApplicationAccess> {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("application_users")
    .select("role,is_active")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    logger.error("application_access_lookup_failed", {
      code: error.code,
      userId,
    });
    throw new Error("Application access could not be verified.");
  }

  return evaluateAccess(data);
}

export async function requireRole(requiredRole: ApplicationRole) {
  const access = await getCurrentAccess();

  if (access.status !== "AUTHORIZED" || access.role !== requiredRole) {
    redirect(destinationForAccess(access));
  }

  return access;
}

import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
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
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const [user, supabase] = await Promise.all([
    currentUser(),
    createServerSupabaseClient(),
  ]);

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

  const claims = sessionClaims as { fva?: unknown } | null;

  return evaluateAccess({
    applicationUser: data,
    currentSessionFva: claims?.fva,
    hasEnrolledSecondFactor: user?.twoFactorEnabled ?? false,
  });
}

export async function requireRole(requiredRole: ApplicationRole) {
  const access = await getCurrentAccess();

  if (access.status !== "AUTHORIZED" || access.role !== requiredRole) {
    redirect(destinationForAccess(access));
  }

  return access;
}

import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { getRequestAuth } from "@/lib/auth/request-context";
import { throwDependencyError } from "@/lib/server/dependency-error";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  destinationForAccess,
  evaluateAccess,
  type ApplicationAccess,
  type ApplicationRole,
} from "@/lib/auth/policy";

export { destinationForAccess } from "@/lib/auth/policy";

type AccessRecord = {
  access: ApplicationAccess;
  actorId: string;
  userId: string;
};

const resolveCurrentAccess = cache(async (): Promise<AccessRecord | null> => {
  const { userId } = await getRequestAuth();

  if (!userId) {
    return null;
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("application_users")
    .select("id,role,is_active")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) {
    throwDependencyError(error, {
      dependency: "SUPABASE_DATA",
      operation: "application_access_lookup",
      operationKind: "read",
      routeFamily: "/protected",
      surface: "layout",
    });
  }

  return {
    access: evaluateAccess(data),
    actorId: data?.id ?? "",
    userId,
  };
});

export async function getCurrentAccess(): Promise<ApplicationAccess> {
  const record = await resolveCurrentAccess();
  if (!record) redirect("/sign-in");
  return record.access;
}

export async function getCurrentAccessForRouteHandler() {
  const record = await resolveCurrentAccess();
  if (!record) {
    throwDependencyError(
      { code: "SIGNED_OUT", status: 401 },
      {
        dependency: "APP_AUTH",
        operation: "route_access_lookup",
        operationKind: "read",
        routeFamily: "/api",
        surface: "route_handler",
      },
    );
  }
  return record.access;
}

export async function requireRole(requiredRole: ApplicationRole) {
  const access = await getCurrentAccess();

  if (access.status !== "AUTHORIZED" || access.role !== requiredRole) {
    redirect(destinationForAccess(access));
  }

  return access;
}

export async function requireRoleForRouteHandler(
  requiredRole: ApplicationRole,
) {
  const record = await resolveCurrentAccess();
  if (!record) {
    throwDependencyError(
      { code: "SIGNED_OUT", status: 401 },
      {
        dependency: "APP_AUTH",
        operation: "route_role_lookup",
        operationKind: "read",
        routeFamily: "/api",
        surface: "route_handler",
      },
    );
  }
  if (
    record.access.status !== "AUTHORIZED" ||
    record.access.role !== requiredRole
  ) {
    throwDependencyError(
      { code: "ACCESS_DENIED", status: 403 },
      {
        dependency: "APP_AUTH",
        operation: "route_role_check",
        operationKind: "read",
        routeFamily: "/api",
        surface: "route_handler",
      },
    );
  }
  return record.access;
}

export async function requireSignedInForRouteHandler() {
  const record = await resolveCurrentAccess();
  if (!record) {
    throwDependencyError(
      { code: "SIGNED_OUT", status: 401 },
      {
        dependency: "APP_AUTH",
        operation: "route_session_check",
        operationKind: "read",
        routeFamily: "/api/private-files",
        surface: "route_handler",
      },
    );
  }
  return record;
}

export async function getAuthorizedActor(requiredRole: ApplicationRole) {
  const record = await resolveCurrentAccess();
  if (!record) redirect("/sign-in");
  if (
    record.access.status !== "AUTHORIZED" ||
    record.access.role !== requiredRole
  ) {
    redirect(destinationForAccess(record.access));
  }
  return {
    actorId: record.actorId,
    supabase: await createServerSupabaseClient(),
    userId: record.userId,
  };
}

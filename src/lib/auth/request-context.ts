import "server-only";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { cache } from "react";

import { throwDependencyError } from "@/lib/server/dependency-error";

export const getRequestAuth = cache(async () => {
  try {
    return await auth();
  } catch (error) {
    throwDependencyError(error, {
      dependency: "CLERK_BACKEND",
      operation: "clerk_request_auth",
      operationKind: "read",
      routeFamily: "/protected|/sign-in|/api",
      surface: "request_context",
    });
  }
});
export const getRequestClerkClient = cache(async () => clerkClient());
export const getRequestToken = cache(async () => {
  try {
    const { getToken } = await getRequestAuth();
    return await getToken();
  } catch (error) {
    throwDependencyError(error, {
      dependency: "CLERK_BACKEND",
      operation: "clerk_session_token",
      operationKind: "read",
      routeFamily: "/protected|/api",
      surface: "request_context",
    });
  }
});

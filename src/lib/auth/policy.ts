import type { Database } from "@/types/database";

export type ApplicationRole = Database["public"]["Enums"]["application_role"];

export type AccessStatus =
  "AUTHORIZED" | "INACTIVE" | "MFA_REQUIRED" | "UNMAPPED";

type ApplicationUser = Pick<
  Database["public"]["Tables"]["application_users"]["Row"],
  "is_active" | "role"
>;

export type ApplicationAccess = {
  role: ApplicationRole | null;
  status: AccessStatus;
};

export function hasCurrentSecondFactor(fva: unknown): boolean {
  return (
    Array.isArray(fva) &&
    fva.length > 1 &&
    typeof fva[1] === "number" &&
    fva[1] >= 0
  );
}

export function evaluateAccess({
  applicationUser,
  currentSessionFva,
  hasEnrolledSecondFactor,
}: {
  applicationUser: ApplicationUser | null;
  currentSessionFva: unknown;
  hasEnrolledSecondFactor: boolean;
}): ApplicationAccess {
  if (!applicationUser) {
    return { role: null, status: "UNMAPPED" };
  }

  if (!applicationUser.is_active) {
    return { role: applicationUser.role, status: "INACTIVE" };
  }

  if (
    applicationUser.role === "FOREMAN" &&
    (!hasEnrolledSecondFactor || !hasCurrentSecondFactor(currentSessionFva))
  ) {
    return { role: applicationUser.role, status: "MFA_REQUIRED" };
  }

  return { role: applicationUser.role, status: "AUTHORIZED" };
}

export function destinationForAccess(access: ApplicationAccess): string {
  if (access.status === "UNMAPPED") {
    return "/access/unmapped";
  }

  if (access.status === "INACTIVE") {
    return "/access/inactive";
  }

  if (access.status === "MFA_REQUIRED") {
    return "/access/mfa-required";
  }

  return access.role === "CEO" ? "/ceo" : "/foreman";
}

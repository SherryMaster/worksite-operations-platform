import type { Database } from "@/types/database";

export type ApplicationRole = Database["public"]["Enums"]["application_role"];

export type AccessStatus = "AUTHORIZED" | "INACTIVE" | "UNMAPPED";

type ApplicationUser = Pick<
  Database["public"]["Tables"]["application_users"]["Row"],
  "is_active" | "role"
>;

export type ApplicationAccess = {
  role: ApplicationRole | null;
  status: AccessStatus;
};

export function evaluateAccess(
  applicationUser: ApplicationUser | null,
): ApplicationAccess {
  if (!applicationUser) {
    return { role: null, status: "UNMAPPED" };
  }

  if (!applicationUser.is_active) {
    return { role: applicationUser.role, status: "INACTIVE" };
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

  return access.role === "CEO" ? "/ceo" : "/foreman";
}

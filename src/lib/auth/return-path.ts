import {
  destinationForAccess,
  type ApplicationAccess,
} from "@/lib/auth/policy";

export function safeInternalReturnPath(
  value: string | null | undefined,
  fallback = "/",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  try {
    const base = new URL("https://worksite.invalid");
    const resolved = new URL(value, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export function signInHref(returnPath: string) {
  const safe = safeInternalReturnPath(returnPath);
  return `/sign-in?redirect_url=${encodeURIComponent(safe)}`;
}

export function signedInDestination(
  access: ApplicationAccess,
  requestedReturnPath: string | null | undefined,
) {
  const returnPath = safeInternalReturnPath(requestedReturnPath);
  const rolePath = access.role === "CEO" ? "/ceo" : "/foreman";
  const matchesRole =
    returnPath === rolePath || returnPath.startsWith(`${rolePath}/`);
  return access.status === "AUTHORIZED" && matchesRole
    ? returnPath
    : destinationForAccess(access);
}

export function navigateToSignIn(returnPath: string) {
  window.location.assign(signInHref(returnPath));
}

export function reloadCurrentApplication() {
  window.location.reload();
}

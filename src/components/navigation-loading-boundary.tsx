"use client";

import { usePathname, useSearchParams } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const NAVIGATION_TIMEOUT_MS = 15_000;

function routeKey(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function destinationForNavigation(event: MouseEvent) {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const target = event.target;
  if (!(target instanceof Element)) return null;

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (
    anchor.hasAttribute("download") ||
    (anchor.target !== "" && anchor.target !== "_self") ||
    anchor.getAttribute("aria-disabled") === "true"
  ) {
    return null;
  }

  const destination = new URL(anchor.href, window.location.href);
  const current = new URL(window.location.href);
  if (
    destination.origin !== current.origin ||
    !["http:", "https:"].includes(destination.protocol) ||
    destination.pathname.startsWith("/api/") ||
    /\.[a-z0-9]+$/i.test(destination.pathname)
  ) {
    return null;
  }

  const destinationRoute = `${destination.pathname}${destination.search}`;
  const currentRoute = `${current.pathname}${current.search}`;
  return destinationRoute === currentRoute ? null : currentRoute;
}

function NavigationCompletion({
  onComplete,
}: {
  onComplete: (currentRoute: string) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentRoute = routeKey(pathname, searchParams);

  useEffect(() => {
    onComplete(currentRoute);
  }, [currentRoute, onComplete]);

  return null;
}

export function NavigationLoadingBoundary({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [pendingFromRoute, setPendingFromRoute] = useState<string | null>(null);
  const currentRouteRef = useRef<string | null>(null);

  const completeNavigation = useCallback((currentRoute: string) => {
    currentRouteRef.current = currentRoute;
    setPendingFromRoute((pendingRoute) =>
      pendingRoute !== null && pendingRoute !== currentRoute
        ? null
        : pendingRoute,
    );
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const currentRoute = destinationForNavigation(event);
      if (currentRoute) setPendingFromRoute(currentRoute);
    }

    function handleHistoryNavigation() {
      setPendingFromRoute(currentRouteRef.current);
    }

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handleHistoryNavigation);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handleHistoryNavigation);
    };
  }, []);

  useEffect(() => {
    if (pendingFromRoute === null) return;

    const timeout = window.setTimeout(
      () => setPendingFromRoute(null),
      NAVIGATION_TIMEOUT_MS,
    );
    return () => window.clearTimeout(timeout);
  }, [pendingFromRoute]);

  return (
    <>
      <Suspense fallback={null}>
        <NavigationCompletion onComplete={completeNavigation} />
      </Suspense>
      {pendingFromRoute !== null ? fallback : children}
    </>
  );
}

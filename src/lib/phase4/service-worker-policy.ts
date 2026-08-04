export const serviceWorkerActivationPolicy = {
  clientsClaim: true,
  skipWaiting: false,
} as const;

export const serviceWorkerUpdateMarker = "worksite-service-worker-update";

type UpdateMarkerStore = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export function getServiceWorkerUpdateMarker(store: UpdateMarkerStore) {
  try {
    return store.getItem(serviceWorkerUpdateMarker);
  } catch {
    return null;
  }
}

export function setServiceWorkerUpdateMarker(
  store: UpdateMarkerStore,
  value: "reloaded" | "requested",
) {
  try {
    store.setItem(serviceWorkerUpdateMarker, value);
  } catch {
    // A blocked session store must not break workspace rendering.
  }
}

export function clearServiceWorkerUpdateMarker(store: UpdateMarkerStore) {
  try {
    store.removeItem(serviceWorkerUpdateMarker);
  } catch {
    // A blocked session store must not break workspace rendering.
  }
}

export function requestServiceWorkerUpdate(store: UpdateMarkerStore) {
  setServiceWorkerUpdateMarker(store, "requested");
}

export function consumeServiceWorkerControllerChange(store: UpdateMarkerStore) {
  if (getServiceWorkerUpdateMarker(store) !== "requested") return false;
  setServiceWorkerUpdateMarker(store, "reloaded");
  return true;
}

export function finishServiceWorkerUpdate(store: UpdateMarkerStore) {
  if (getServiceWorkerUpdateMarker(store) !== "reloaded") return;
  clearServiceWorkerUpdateMarker(store);
}

export function isAuthenticatedApiRequest(
  pathname: string,
  sameOrigin: boolean,
) {
  return sameOrigin && pathname.startsWith("/api/");
}

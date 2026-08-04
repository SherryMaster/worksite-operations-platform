import { describe, expect, it, vi } from "vitest";

import {
  consumeServiceWorkerControllerChange,
  finishServiceWorkerUpdate,
  isAuthenticatedApiRequest,
  requestServiceWorkerUpdate,
  serviceWorkerActivationPolicy,
} from "@/lib/phase4/service-worker-policy";

function memoryStore() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe("service worker update policy", () => {
  it("keeps a new worker waiting until the user explicitly accepts it", () => {
    expect(serviceWorkerActivationPolicy).toEqual({
      clientsClaim: true,
      skipWaiting: false,
    });
  });

  it("permits exactly one controlled reload for an accepted controller change", () => {
    const store = memoryStore();

    expect(consumeServiceWorkerControllerChange(store)).toBe(false);
    requestServiceWorkerUpdate(store);
    expect(consumeServiceWorkerControllerChange(store)).toBe(true);
    expect(consumeServiceWorkerControllerChange(store)).toBe(false);
    finishServiceWorkerUpdate(store);
    expect(consumeServiceWorkerControllerChange(store)).toBe(false);
  });

  it("does not fail workspace startup when session storage is blocked", () => {
    const blocked = {
      getItem: vi.fn(() => {
        throw new DOMException("blocked");
      }),
      removeItem: vi.fn(() => {
        throw new DOMException("blocked");
      }),
      setItem: vi.fn(() => {
        throw new DOMException("blocked");
      }),
    };

    expect(() => requestServiceWorkerUpdate(blocked)).not.toThrow();
    expect(consumeServiceWorkerControllerChange(blocked)).toBe(false);
    expect(() => finishServiceWorkerUpdate(blocked)).not.toThrow();
  });

  it("matches only same-origin API requests for network-only handling", () => {
    expect(isAuthenticatedApiRequest("/api/attendance/sync", true)).toBe(true);
    expect(isAuthenticatedApiRequest("/api/reports/run/export", false)).toBe(
      false,
    );
    expect(isAuthenticatedApiRequest("/foreman/today", true)).toBe(false);
  });
});

/// <reference lib="webworker" />

import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
  type PrecacheEntry,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: PrecacheEntry[];
};

const serwist = new Serwist({
  clientsClaim: true,
  precacheEntries: self.__SW_MANIFEST,
  runtimeCaching: [
    {
      handler: async ({ request }) => {
        try {
          return await fetch(request);
        } catch (error) {
          if (new URL(request.url).pathname.startsWith("/foreman")) {
            const fallback = await caches.match("/~offline", {
              ignoreSearch: true,
            });
            if (fallback) return fallback;
          }
          throw error;
        }
      },
      matcher: ({ request }) => request.mode === "navigate",
    },
    {
      handler: new NetworkOnly(),
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/api/"),
    },
    {
      handler: new CacheFirst({
        cacheName: "worksite-static-scripts",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 7 * 24 * 60 * 60,
            maxEntries: 64,
          }),
        ],
      }),
      matcher: ({ sameOrigin, url }) =>
        sameOrigin && url.pathname.startsWith("/_next/static/"),
    },
    {
      handler: new StaleWhileRevalidate({
        cacheName: "worksite-static-images",
        plugins: [
          new ExpirationPlugin({
            maxAgeSeconds: 30 * 24 * 60 * 60,
            maxEntries: 24,
          }),
        ],
      }),
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
    },
  ],
  skipWaiting: true,
});

serwist.setCatchHandler(async ({ request }) => {
  if (
    request.mode === "navigate" &&
    new URL(request.url).pathname.startsWith("/foreman")
  ) {
    const fallback = await serwist.matchPrecache("/~offline");
    if (fallback) return fallback;
  }
  return Response.error();
});

serwist.addEventListeners();

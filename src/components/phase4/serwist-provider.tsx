"use client";

import { SerwistProvider as Provider } from "@serwist/turbopack/react";

import { ServiceWorkerUpdate } from "@/components/phase4/service-worker-update";

export function WorksiteSerwistProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Provider
      swUrl="/serwist/sw.js"
      cacheOnNavigation={false}
      reloadOnOnline={false}
    >
      <ServiceWorkerUpdate />
      {children}
    </Provider>
  );
}

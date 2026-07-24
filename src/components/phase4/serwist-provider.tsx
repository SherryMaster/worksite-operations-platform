"use client";

import { SerwistProvider as Provider } from "@serwist/turbopack/react";

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
      {children}
    </Provider>
  );
}

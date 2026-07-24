import { createSerwistRoute } from "@serwist/turbopack";

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    additionalPrecacheEntries: [
      {
        revision: "phase-4-offline-shell-v1",
        url: "/~offline",
      },
    ],
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });

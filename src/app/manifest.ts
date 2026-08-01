import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7f6fb",
    description: "Secure construction workforce operations for company teams.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/icons/worksite-v2-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/worksite-v2-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "192x192",
        src: "/icons/worksite-v2-maskable-192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/worksite-v2-maskable-512.png",
        type: "image/png",
      },
    ],
    name: "Worksite Operations",
    short_name: "Worksite",
    start_url: "/",
    theme_color: "#6d28d9",
  };
}

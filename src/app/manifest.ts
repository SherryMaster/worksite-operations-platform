import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f7f6fb",
    description: "Secure construction workforce operations for company teams.",
    display: "standalone",
    icons: [
      {
        sizes: "192x192",
        src: "/icons/worksite-192.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/worksite-512.png",
        type: "image/png",
      },
    ],
    name: "Worksite Operations",
    short_name: "Worksite",
    start_url: "/",
    theme_color: "#6d28d9",
  };
}

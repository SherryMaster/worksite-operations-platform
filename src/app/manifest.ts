import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f5f5f4",
    description: "Secure mobile attendance for Worksite Operations Foremen.",
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
    orientation: "portrait",
    short_name: "Worksite",
    start_url: "/foreman",
    theme_color: "#1c1917",
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#fafafa",
    categories: ["education", "productivity"],
    description:
      "Your AI study companion for clearer answers and better learning.",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "192x192",
        src: "/pwa/icon-192",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/pwa/icon-512",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/pwa/icon-512",
        type: "image/png",
      },
    ],
    id: "/",
    name: "Able — AI for students",
    orientation: "any",
    scope: "/",
    short_name: "Able",
    start_url: "/",
    theme_color: "#151515",
  };
}

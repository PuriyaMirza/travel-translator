import type { MetadataRoute } from "next";
import { brand } from "@/lib/brand";

// background_color / theme_color mirror --bg-main and --brand in globals.css.
// Duplicated because the manifest needs static values; keep in step.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.tagline,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F2F1EA",
    theme_color: "#F2F1EA",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-icon/512-maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

/* Lets members add the forum to their phone's home screen and open it like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: "Sellers Network",
    description: siteConfig.description,
    start_url: "/community?source=app",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches the dark navy in tokens.css (slate palette, dark mode).
    background_color: "#0b1220",
    theme_color: "#0b1220",
    categories: ["business", "social"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "New topic", url: "/community/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Notifications", url: "/community/notifications", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

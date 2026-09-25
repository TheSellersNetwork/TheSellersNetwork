import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/account", "/onboarding", "/community/u/", "/community/search", "/community/notifications", "/community/new", "/api/", "/auth/", "/brand"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}

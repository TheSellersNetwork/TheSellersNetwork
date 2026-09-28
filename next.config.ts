import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const isDev = process.env.NODE_ENV !== "production";
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co";
const supabaseWs = supabase.replace(/^https:/, "wss:");
const posthog = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/*
  Content Security Policy. Scripts only from this site, Cloudflare Turnstile
  and PostHog; images only from this site and our Supabase Storage (so a post
  cannot load a tracking pixel); no framing by other sites. 'unsafe-inline'
  for scripts is needed by Next.js hydration without per-request nonces.
*/
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://eu-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} ${posthog} https://eu-assets.i.posthog.com https://challenges.cloudflare.com https://openlibrary.org`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [
      /* Supabase Storage for avatars and post images. Host is set per environment. */
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  // Pickups live inside the community section.
  redirects: async () => [
    { source: "/pickups", destination: "/community/pickups", permanent: true },
    { source: "/pickups/:path*", destination: "/community/pickups/:path*", permanent: true },
  ],
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    },
    {
      // The service worker must never be cached, or a fix could take days to reach browsers.
      source: "/sw.js",
      headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
    },
  ],
};

const withMDX = createMDX({
  /* Plugins such as remark-gfm are added when the guides task lands. */
  options: { remarkPlugins: [], rehypePlugins: [] },
});

export default withMDX(nextConfig);

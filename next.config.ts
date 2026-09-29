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
  'wasm-unsafe-eval' lets the background remover (/tools/background-remover)
  compile ONNX Runtime's WebAssembly, served from this site. It allows only
  WebAssembly compilation, not JavaScript eval. Its Web Worker is a same-origin
  module file, which the existing worker-src 'self' already covers, and its
  previews are blob: images, which img-src already allows.
*/
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://eu-assets.i.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self' data:",
  `connect-src 'self' ${supabase} ${supabaseWs} ${posthog} https://eu-assets.i.posthog.com https://challenges.cloudflare.com https://openlibrary.org`,
  // 'self' so /tools/calculator/embed can preview the embeddable calculator.
  "frame-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self'",
  "manifest-src 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

/*
  The embeddable calculator (/embed/*) is made to sit in other sites' iframes,
  so it alone may be framed by anyone: frame-ancestors * and no
  X-Frame-Options. Every other route keeps frame-ancestors 'none' and DENY.
*/
const embedCsp = csp.replace("frame-ancestors 'none'", "frame-ancestors *");
const baseHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

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
    // Search engines look for /sitemap.xml; the index of our split sitemaps lives at /sitemap-index.xml.
    { source: "/sitemap.xml", destination: "/sitemap-index.xml", permanent: false },
    // The 33 single tools were gathered into 12 pages. Old addresses go to the page and tab that now holds each tool.
    ...[
      ["/tools/where-to-sell", "/tools/calculator"],
      ["/tools/fees/:platform", "/tools/calculator/:platform"],
      ["/tools/fba-calculator", "/tools/calculator/amazon-fba"],
      ["/tools/offer-calculator", "/tools/calculator#lowest-offer"],
      ["/tools/ebay-shop", "/tools/calculator/ebay#ebay-shop"],
      ["/tools/show-planner", "/tools/calculator/whatnot#show-planner"],
      ["/tools/postage-finder", "/tools/postage"],
      ["/tools/parcel-size", "/tools/postage?tab=size"],
      ["/tools/worth-my-time", "/tools/worth-it"],
      ["/tools/trip-cost", "/tools/worth-it?tab=trip"],
      ["/tools/tax-dates", "/tools/tax"],
      ["/tools/reporting-check", "/tools/tax?tab=reporting"],
      ["/tools/vat", "/tools/tax?tab=vat"],
      ["/tools/profit-report", "/tools/sales-reports"],
      ["/tools/amazon-settlement", "/tools/sales-reports?tab=amazon-settlement"],
      ["/tools/amazon-reimbursements", "/tools/amazon-claims"],
      ["/tools/claims-deadline", "/tools/amazon-claims?tab=deadline"],
      ["/tools/sold-comps", "/tools/pricing"],
      ["/tools/stock-ageing", "/tools/pricing?tab=markdowns"],
      ["/tools/bulk-price", "/tools/pricing?tab=bulk"],
      ["/tools/repricer-floors", "/tools/pricing?tab=amazon-floors"],
      ["/tools/isbn", "/tools/pricing?tab=books"],
    ].map(([source, destination]) => ({ source, destination, permanent: true })),
  ],
  headers: async () => [
    {
      // Everything except /embed and /embed/...
      source: "/((?!embed(?:/|$)).*)",
      headers: [{ key: "Content-Security-Policy", value: csp }, { key: "X-Frame-Options", value: "DENY" }, ...baseHeaders],
    },
    {
      source: "/embed/:path*",
      headers: [{ key: "Content-Security-Policy", value: embedCsp }, ...baseHeaders],
    },
    {
      /*
        Cross-origin isolation for the background remover only, so ONNX Runtime
        can use several threads (SharedArrayBuffer). COOP same-origin is already
        sent site-wide above. COEP "credentialless" rather than "require-corp":
        cross-origin images (Supabase Storage avatars) and the PostHog script
        still load, just without cookies. Browsers without credentialless
        support (Safari) are not isolated and run on one thread. The worker and
        the runtime files get the same header so their threads are isolated too.
        A visit that arrives by client-side navigation is not isolated either
        (headers apply to full page loads), and also falls back to one thread.
      */
      source: "/tools/background-remover",
      headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
    },
    {
      source: "/workers/:path*",
      headers: [{ key: "Cross-Origin-Embedder-Policy", value: "credentialless" }],
    },
    {
      // Background remover runtime and model. The runtime sits in a folder named for its version and
      // the model file never changes (give a new model a new name), so browsers can keep them a year.
      source: "/vendor/onnxruntime-web/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
      ],
    },
    {
      source: "/models/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
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

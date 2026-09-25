import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  images: {
    remotePatterns: [
      /* Supabase Storage for avatars and post images. Host is set per environment. */
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
};

const withMDX = createMDX({
  /* Plugins such as remark-gfm are added when the guides task lands. */
  options: { remarkPlugins: [], rehypePlugins: [] },
});

export default withMDX(nextConfig);

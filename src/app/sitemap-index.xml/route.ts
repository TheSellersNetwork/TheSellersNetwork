import { generateSitemaps } from "@/app/sitemap";
import { siteConfig } from "@/lib/site";

/*
  Sitemap index at /sitemap-index.xml (/sitemap.xml redirects here). Next.js serves the split sitemaps at /sitemap/0.xml,
  /sitemap/1.xml and so on, but nothing at /sitemap.xml, which is where
  search engines look first. This lists them all.
*/
export const revalidate = 3600;

export async function GET() {
  const parts = await generateSitemaps();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${parts.map((p) => `  <sitemap><loc>${siteConfig.url}/sitemap/${p.id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}

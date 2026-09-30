import { NextResponse } from "next/server";
import { getBlogPosts } from "@/lib/content/blog";
import { getChanges } from "@/lib/content/changes";
import { getGuides } from "@/lib/content/guides";
import { isLive } from "@/lib/content/schedule";
import { toolGroups, calculatorSlugs } from "@/lib/tools/catalogue";
import { calculatorPages } from "@/lib/og/calculator-share";
import { clip, postTypeLabel } from "@/lib/og/labels";
import { urls } from "@/lib/forum/urls";
import type { IndexEntry, SearchCatalogue } from "@/components/search/search-index";

/*
  The index behind instant search: every tool, each fee calculator platform,
  live guides and live blog posts, as compact JSON. Drafts and scheduled posts
  are left out even outside production, so search never shows a post early.
  Rebuilt at most hourly, which is how often a scheduled post can go live.
*/
export const revalidate = 3600;

export async function GET() {
  const [guides, posts, changes] = await Promise.all([getGuides(), getBlogPosts(), getChanges()]);
  const now = new Date();

  const tools: IndexEntry[] = [
    ...toolGroups.flatMap((g) =>
      g.tools.map((t) => ({ kind: "tool" as const, title: t.title, href: t.href, text: clip(t.description, 140), label: g.title, keywords: [...(t.includes ?? []), t.keywords ?? ""].join(" ").trim() })),
    ),
    ...calculatorSlugs.map((slug) => ({
      kind: "tool" as const,
      title: calculatorPages[slug].title,
      href: `/tools/calculator/${slug}`,
      text: `Fees and profit on ${calculatorPages[slug].platform} for one sale.`,
      label: "Fee calculator",
      keywords: `${calculatorPages[slug].platform} fees fee calculator profit`,
    })),
  ];

  const guideEntries: IndexEntry[] = guides
    .filter((g) => g.published && isLive(g.published, now))
    .map((g) => ({ kind: "guide", title: g.title, href: urls.guide(g.slug), text: clip(g.excerpt, 140), label: "Guide" }));

  const postEntries: IndexEntry[] = [
    ...posts
      .filter((p) => isLive(p.published, now))
      .map((p) => ({ kind: "post" as const, title: p.title, href: urls.blogPost(p.slug), text: clip(p.excerpt, 140), label: postTypeLabel(p.category, p.slug), keywords: p.platforms.join(" ") })),
    ...changes.map((c) => ({ kind: "post" as const, title: c.title, href: urls.blogPost(c.slug), text: clip(c.summary, 140), label: "Fee and policy change", keywords: c.platform })),
  ];

  const body: SearchCatalogue = { entries: [...tools, ...guideEntries, ...postEntries] };
  return NextResponse.json(body, { headers: { "cache-control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400" } });
}

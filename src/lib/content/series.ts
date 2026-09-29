import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getBlogPosts } from "@/lib/content/blog";
import { getGuides } from "@/lib/content/guides";
import { isLive } from "@/lib/content/schedule";
import { urls } from "@/lib/forum/urls";
import { parseStepKey, stepKey, type PathStep } from "@/lib/content/paths-core";
import { parseSeries, type Series } from "@/lib/content/series-core";

export type { Series } from "@/lib/content/series-core";

const file = path.join(process.cwd(), "content", "series.json");

/*
  The series with each part's title and excerpt. A part whose guide or post is
  missing, unpublished or still scheduled is left out (even in development),
  so "Part 3 of 8" always counts parts readers can open.
*/
export const getSeries = cache(async (): Promise<Series[]> => {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return [];
  }
  const [guides, posts] = await Promise.all([getGuides(), getBlogPosts()]);
  const guideBySlug = new Map(guides.filter((g) => g.published).map((g) => [g.slug, g]));
  const postBySlug = new Map(posts.filter((p) => isLive(p.published)).map((p) => [p.slug, p]));

  return parseSeries(raw)
    .map((s) => ({
      slug: s.slug,
      title: s.title,
      description: s.description,
      parts: s.parts.flatMap((key): PathStep[] => {
        const parsed = parseStepKey(key)!;
        if (parsed.kind === "guide") {
          const g = guideBySlug.get(parsed.slug);
          return g ? [{ key: stepKey("guide", g.slug), kind: "guide", slug: g.slug, title: g.title, excerpt: g.excerpt, href: urls.guide(g.slug) }] : [];
        }
        const b = postBySlug.get(parsed.slug);
        return b ? [{ key: stepKey("blog", b.slug), kind: "blog", slug: b.slug, title: b.title, excerpt: b.excerpt, href: urls.blogPost(b.slug) }] : [];
      }),
    }))
    .filter((s) => s.parts.length > 0);
});

import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getBlogPosts } from "@/lib/content/blog";
import { getGuides } from "@/lib/content/guides";
import { isLive } from "@/lib/content/schedule";
import { urls } from "@/lib/forum/urls";
import { parsePaths, parseStepKey, stepKey, type PathStep, type ReadingPath } from "@/lib/content/paths-core";

export type { PathStep, ReadingPath } from "@/lib/content/paths-core";

const file = path.join(process.cwd(), "content", "paths.json");

/*
  The beginner paths with each step's title and excerpt. A step whose guide
  or post is missing, unpublished or still scheduled is left out (even in
  development), so a path never links to something readers cannot open.
*/
export const getPaths = cache(async (): Promise<ReadingPath[]> => {
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return [];
  }
  const [guides, posts] = await Promise.all([getGuides(), getBlogPosts()]);
  const guideBySlug = new Map(guides.filter((g) => g.published).map((g) => [g.slug, g]));
  const postBySlug = new Map(posts.filter((p) => isLive(p.published)).map((p) => [p.slug, p]));

  return parsePaths(raw)
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      steps: p.steps.flatMap((s): PathStep[] => {
        const parsed = parseStepKey(s)!;
        if (parsed.kind === "guide") {
          const g = guideBySlug.get(parsed.slug);
          return g ? [{ key: stepKey("guide", g.slug), kind: "guide", slug: g.slug, title: g.title, excerpt: g.excerpt, href: urls.guide(g.slug) }] : [];
        }
        const b = postBySlug.get(parsed.slug);
        return b ? [{ key: stepKey("blog", b.slug), kind: "blog", slug: b.slug, title: b.title, excerpt: b.excerpt, href: urls.blogPost(b.slug) }] : [];
      }),
    }))
    .filter((p) => p.steps.length > 0);
});

export async function getPath(slug: string): Promise<ReadingPath | null> {
  return (await getPaths()).find((p) => p.slug === slug) ?? null;
}

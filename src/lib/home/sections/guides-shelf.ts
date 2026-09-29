import "server-only";
import { cache } from "react";
import { getBlogPosts } from "@/lib/content/blog";
import { getGuide, getGuides, type GuideMeta } from "@/lib/content/guides";
import { getPaths } from "@/lib/content/paths";
import { readingTime } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { coverTopic, groupByTopic, type ShelfCover, type ShelfGroup, type ShelfPath } from "@/lib/home/sections/guides-shelf-core";

export type GuidesShelfData = { byPath: boolean; groups: ShelfGroup[]; paths: ShelfPath[] };

async function guideMinutes(slug: string): Promise<number> {
  const g = await getGuide(slug);
  return g ? readingTime(g.content) : 1;
}

async function guideCover(g: Pick<GuideMeta, "slug" | "title" | "categories">): Promise<ShelfCover> {
  const topic = coverTopic(g.categories);
  return { key: `guide:${g.slug}`, kind: "guide", href: urls.guide(g.slug), title: g.title, topic: topic.label, colour: topic.colour, initial: topic.initial, minutes: await guideMinutes(g.slug) };
}

/*
  The first three beginner paths, each as a row of covers in path order. With
  no paths, the three biggest topics among the guides instead. Every path is
  also returned in outline so the shelf can offer "Continue" for any of them.
*/
export const getGuidesShelf = cache(async (): Promise<GuidesShelfData> => {
  const [paths, guides, posts] = await Promise.all([getPaths(), getGuides(), getBlogPosts()]);
  const guideBySlug = new Map(guides.map((g) => [g.slug, g]));
  const postBySlug = new Map(posts.map((p) => [p.slug, p]));
  const outline: ShelfPath[] = paths.map((p) => ({ slug: p.slug, title: p.title, href: `/guides/paths/${p.slug}`, steps: p.steps.map((s) => ({ key: s.key, title: s.title, href: s.href })) }));

  if (paths.length > 0) {
    const groups = await Promise.all(
      paths.slice(0, 3).map(async (p): Promise<ShelfGroup> => ({
        id: p.slug,
        title: p.title,
        href: `/guides/paths/${p.slug}`,
        covers: await Promise.all(
          p.steps.map(async (s): Promise<ShelfCover> => {
            if (s.kind === "guide") return guideCover(guideBySlug.get(s.slug) ?? { slug: s.slug, title: s.title, categories: [] });
            const post = postBySlug.get(s.slug);
            const topic = coverTopic(post ? [...post.platforms, post.category ?? ""] : []);
            return { key: s.key, kind: "blog", href: s.href, title: s.title, topic: topic.label, colour: topic.colour, initial: topic.initial, minutes: post?.minutes ?? 1 };
          }),
        ),
      })),
    );
    return { byPath: true, groups, paths: outline };
  }

  const published = guides.filter((g) => g.published);
  const groups = await Promise.all(
    groupByTopic(published).map(async (g): Promise<ShelfGroup> => ({ id: g.topic.id, title: g.topic.label, href: urls.guides(), covers: await Promise.all(g.items.slice(0, 10).map(guideCover)) })),
  );
  return { byPath: false, groups, paths: outline };
});

import "server-only";
import { getChanges } from "@/lib/content/changes";
import { getGuides } from "@/lib/content/guides";
import type { RecentTopic } from "@/lib/forum/overview-queries";
import { urls } from "@/lib/forum/urls";

export type FeedItem = { kind: "Guide" | "Change" | "Question"; title: string; href: string };

/* The hero ribbon: guides, fee and policy changes and recent questions, interleaved. All real. */
export async function getHeroFeed(topics: RecentTopic[]): Promise<FeedItem[]> {
  const [guides, changes] = await Promise.all([getGuides(), getChanges()]);
  const g = guides.slice(0, 10).map((x) => ({ kind: "Guide" as const, title: x.title, href: urls.guide(x.slug) }));
  const c = changes.slice(0, 8).map((x) => ({ kind: "Change" as const, title: x.title, href: urls.blogPost(x.slug) }));
  const t = topics.slice(0, 6).map((x) => ({ kind: "Question" as const, title: x.title, href: urls.topic(x) }));
  const feed: FeedItem[] = [];
  for (let i = 0; i < Math.max(g.length, c.length, t.length); i++) {
    if (g[i]) feed.push(g[i]);
    if (c[i]) feed.push(c[i]);
    if (t[i]) feed.push(t[i]);
  }
  return feed;
}

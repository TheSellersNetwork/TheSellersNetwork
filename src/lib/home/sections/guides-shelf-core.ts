/*
  The guides shelf on the home page: rows of typographic guide "covers",
  grouped by beginner path (or by topic when there are no paths), and a
  "Continue" card for a reader part way through a path. Pure, so the client
  shelf and the unit tests share it.
*/

import { pathProgress } from "@/lib/content/paths-core";

/* A --cat-* colour token from src/styles/tokens.css. */
export type CoverColour = "ebay" | "amazon" | "vinted" | "etsy" | "facebook" | "website" | "live" | "general";

export type CoverTopic = { id: string; label: string; colour: CoverColour; initial: string };

export type ShelfCover = {
  key: string;
  kind: "guide" | "blog";
  href: string;
  title: string;
  topic: string;
  colour: CoverColour;
  initial: string;
  minutes: number;
};

export type ShelfGroup = { id: string; title: string; href: string; covers: ShelfCover[] };

/* Just enough of a path to work out where the reader is. */
export type ShelfPath = { slug: string; title: string; href: string; steps: { key: string; title: string; href: string }[] };

const topics: { match: (slug: string) => boolean; topic: CoverTopic }[] = [
  { match: (s) => s === "ebay-live", topic: { id: "live", label: "eBay Live", colour: "live", initial: "e" } },
  { match: (s) => s === "ebay" || s.startsWith("ebay-"), topic: { id: "ebay", label: "eBay", colour: "ebay", initial: "e" } },
  { match: (s) => s === "amazon" || s.startsWith("amazon-"), topic: { id: "amazon", label: "Amazon", colour: "amazon", initial: "A" } },
  { match: (s) => s === "vinted", topic: { id: "vinted", label: "Vinted", colour: "vinted", initial: "V" } },
  { match: (s) => s === "facebook-marketplace" || s === "facebook", topic: { id: "facebook", label: "Facebook Marketplace", colour: "facebook", initial: "F" } },
  { match: (s) => s === "depop-and-clothing-resale", topic: { id: "depop", label: "Depop", colour: "website", initial: "D" } },
  { match: (s) => s === "etsy-and-handmade" || s === "etsy", topic: { id: "etsy", label: "Etsy", colour: "etsy", initial: "E" } },
  { match: (s) => s === "tiktok-shop", topic: { id: "tiktok", label: "TikTok Shop", colour: "website", initial: "T" } },
  { match: (s) => ["live-selling", "whatnot", "tiktok-live-and-other", "running-a-show"].includes(s), topic: { id: "live", label: "Live selling", colour: "live", initial: "L" } },
  { match: (s) => s === "own-website-and-shopify", topic: { id: "website", label: "Your own site", colour: "website", initial: "W" } },
  { match: (s) => s === "sourcing-and-stock", topic: { id: "sourcing", label: "Sourcing", colour: "general", initial: "S" } },
  { match: (s) => s === "tax-bookkeeping-and-legal", topic: { id: "tax", label: "Tax and bookkeeping", colour: "general", initial: "T" } },
  { match: (s) => s === "tools-and-automation", topic: { id: "tools", label: "Tools", colour: "general", initial: "T" } },
  { match: (s) => s === "multi-channel-selling", topic: { id: "multi", label: "Multi-channel", colour: "general", initial: "M" } },
  { match: (s) => s === "wins-and-case-studies", topic: { id: "wins", label: "Case studies", colour: "general", initial: "C" } },
];

export const EVERY_PLATFORM: CoverTopic = { id: "general", label: "Every platform", colour: "general", initial: "All" };

/* The topic of a guide from its first recognised forum category (or blog platform). */
export function coverTopic(categories: readonly string[]): CoverTopic {
  for (const c of categories) {
    const hit = topics.find((t) => t.match(c));
    if (hit) return hit.topic;
  }
  return EVERY_PLATFORM;
}

/*
  Guides grouped by topic, largest groups first, for when there are no
  beginner paths. Each guide sits under its first topic only.
*/
export function groupByTopic<T extends { categories: string[] }>(items: readonly T[], limit = 3): { topic: CoverTopic; items: T[] }[] {
  const groups = new Map<string, { topic: CoverTopic; items: T[] }>();
  for (const item of items) {
    const topic = coverTopic(item.categories);
    const g = groups.get(topic.id) ?? { topic, items: [] };
    g.items.push(item);
    groups.set(topic.id, g);
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length).slice(0, limit);
}

export type ContinueState = { path: ShelfPath; step: number; done: number; total: number; next: ShelfPath["steps"][number] };

/*
  The path to pick up again: started (at least one step read) but not
  finished. The one furthest through wins; ties go to the earlier path.
  `step` is the 1-based position of the first unread step.
*/
export function continuePath(paths: readonly ShelfPath[], read: readonly string[]): ContinueState | null {
  const readSet = new Set(read);
  let best: ContinueState | null = null;
  for (const path of paths) {
    const { done, total } = pathProgress(path.steps, read);
    if (done === 0 || done >= total) continue;
    const index = path.steps.findIndex((s) => !readSet.has(s.key));
    if (index === -1) continue;
    if (!best || done / total > best.done / best.total) best = { path, step: index + 1, done, total, next: path.steps[index] };
  }
  return best;
}

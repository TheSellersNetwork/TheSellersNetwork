/*
  How the blog index groups posts into rows and picks the featured post.
  Pure, no server imports, so unit tests can use it.
*/

export const blogGroups = [
  { id: "comparisons", label: "Comparisons" },
  { id: "debates", label: "Debates" },
  { id: "explainers", label: "Explainers" },
  { id: "myths", label: "Myth vs reality" },
  { id: "changes", label: "Fee and policy changes" },
  { id: "community", label: "Community" },
  { id: "consumer", label: "Consumer" },
  { id: "more", label: "More articles" },
] as const;

export type BlogGroupId = (typeof blogGroups)[number]["id"];

/* Values accepted in ?type=. "articles" (every post that is not a change) is kept for older links. */
export const blogTypeIds = ["all", "articles", ...blogGroups.map((g) => g.id)] as const;
export type BlogTypeId = (typeof blogTypeIds)[number];

export function parseBlogType(value: unknown): BlogTypeId {
  return typeof value === "string" && (blogTypeIds as readonly string[]).includes(value) ? (value as BlogTypeId) : "all";
}

export type IndexItem = {
  slug: string;
  kind: "change" | "article";
  category: string | null;
  /* UK publish date, YYYY-MM-DD, or null for a draft. */
  date: string | null;
  /* Set outside production for a post whose date has not arrived. */
  scheduled?: string | null;
  featured?: boolean;
};

/*
  The row a post belongs in. A post whose slug ends in "-compared" is a
  comparison whatever its category, so the bank accounts comparison (filed as
  an explainer) sits with the others.
*/
export function groupOf(item: Pick<IndexItem, "kind" | "category" | "slug">): BlogGroupId {
  if (item.kind === "change") return "changes";
  if (item.category === "comparison" || item.slug.endsWith("-compared")) return "comparisons";
  switch (item.category) {
    case "debate":
      return "debates";
    case "explainer":
      return "explainers";
    case "myth-vs-reality":
      return "myths";
    case "community":
    case "introductions":
    case "roundup":
      return "community";
    case "consumer":
      return "consumer";
    default:
      return "more";
  }
}

export function matchesType(item: IndexItem, type: BlogTypeId): boolean {
  if (type === "all") return true;
  if (type === "articles") return item.kind === "article";
  return groupOf(item) === type;
}

/* Live means dated and not scheduled. Drafts and scheduled posts only reach the index outside production. */
export function isLiveItem(item: IndexItem): boolean {
  return !!item.date && !item.scheduled;
}

/*
  The featured post: the newest live article marked `featured: true`, or
  failing that the newest live article. Items are expected newest first.
*/
export function pickFeatured<T extends IndexItem>(items: T[]): T | null {
  const live = items.filter((i) => i.kind === "article" && isLiveItem(i));
  return live.find((i) => i.featured) ?? live[0] ?? null;
}

/*
  Blog frontmatter to typed metadata. Pure, with no server imports, so the
  sync scripts and unit tests share it with src/lib/content/blog.ts.
*/

export type BlogPlatform = "ebay" | "amazon" | "vinted" | "etsy" | "facebook" | "other";

/* A debate post's poll, opened as a forum thread on the post's publish date. */
export type Debate = {
  /* Forum category slug for the thread. Falls back to "deals" when missing. */
  forum: string;
  question: string;
  options: string[];
};

export type BlogMeta = {
  slug: string;
  title: string;
  excerpt: string;
  platforms: BlogPlatform[];
  category: string | null;
  related_topic_ids: string[];
  cover: string | null;
  published: string | null;
  updated: string | null;
  discussion_topic_id: string | null;
  /* Pen-name byline (see src/lib/content/authors.ts), or null for the site itself. */
  author: string | null;
  /* Set only for category "debate" posts with well-formed debate frontmatter. */
  debate: Debate | null;
  /* `featured: true` puts the post at the top of the blog index. */
  featured: boolean;
  /*
    Comparison posts: the overall pick from "Our verdict". Any table row whose
    first cell starts with one of these is highlighted as "Our pick".
  */
  pick: string[];
};

export const DEBATE_DEFAULT_FORUM = "deals";

/*
  Reads the `debate:` block of a "debate" post. Anything malformed is ignored
  (null), matching the rules npm run guides:check enforces: a question of 3 to
  200 characters and 3 to 5 options of 1 to 80 characters each.
*/
export function parseDebate(category: unknown, raw: unknown): Debate | null {
  if (category !== "debate" || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const d = raw as Record<string, unknown>;
  if (typeof d.question !== "string") return null;
  const question = d.question.trim();
  if (question.length < 3 || question.length > 200) return null;
  if (!Array.isArray(d.options) || d.options.length < 3 || d.options.length > 5) return null;
  if (!d.options.every((o) => typeof o === "string" && o.trim().length >= 1 && o.trim().length <= 80)) return null;
  const options = (d.options as string[]).map((o) => o.trim());
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return null;
  const forum = typeof d.forum === "string" && /^[a-z0-9-]+$/.test(d.forum.trim()) ? d.forum.trim() : DEBATE_DEFAULT_FORUM;
  return { forum, question, options };
}

/* `pick: "Starling"` or `pick: ["A", "B"]`. Blank or non-string entries are dropped. */
export function parsePick(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw];
  return list.filter((p): p is string => typeof p === "string").map((p) => p.trim()).filter((p) => p.length > 0 && p.length <= 80);
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value instanceof Date ? value.toISOString() : value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toMeta(file: string, data: Record<string, unknown>): BlogMeta {
  return {
    slug: file.replace(/\.mdx$/, ""),
    title: String(data.title ?? file),
    excerpt: String(data.excerpt ?? ""),
    platforms: Array.isArray(data.platforms) ? (data.platforms.map(String) as BlogPlatform[]) : [],
    category: data.category ? String(data.category) : null,
    related_topic_ids: Array.isArray(data.related_topic_ids) ? data.related_topic_ids.map(String) : [],
    cover: data.cover ? String(data.cover) : null,
    published: toIso(data.published),
    updated: toIso(data.updated),
    discussion_topic_id: data.discussion_topic_id ? String(data.discussion_topic_id) : null,
    author: data.author ? String(data.author) : null,
    debate: parseDebate(data.category, data.debate),
    featured: data.featured === true,
    pick: parsePick(data.pick),
  };
}

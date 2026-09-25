import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  Flag,
  Notification,
  PostRow,
  Profile,
  ProfileSummary,
  TopicListView,
  TopicRow,
  TopPeriod,
} from "@/lib/db/types";

const PROFILE_SUMMARY = "id, username, display_name, avatar_url, trust_level, is_staff, solution_count, flair";

const TOPIC_SELECT = `
  *,
  category:categories (id, slug, name, colour),
  author:profiles!topics_author_id_fkey (${PROFILE_SUMMARY}),
  last_poster:profiles!topics_last_poster_id_fkey (${PROFILE_SUMMARY}),
  topic_tags (tag:tags (id, slug, name))
`;

type RawTopic = Omit<TopicRow, "tags"> & { topic_tags?: { tag: TopicRow["tags"][number] | null }[] };

function shapeTopic(raw: RawTopic): TopicRow {
  const { topic_tags, ...rest } = raw;
  return {
    ...rest,
    tags: (topic_tags ?? []).map((t) => t.tag).filter((t): t is TopicRow["tags"][number] => !!t),
  };
}

/* Cursor pagination: an opaque string carrying the sort value and row id. */
export type Cursor = { v: string | number; id: string };

export function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c)).toString("base64url");
}

export function decodeCursor(s: string | undefined | null): Cursor | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(Buffer.from(s, "base64url").toString()) as Cursor;
    if (parsed && typeof parsed.id === "string") return parsed;
  } catch {
    // Malformed cursors just start from the top.
  }
  return null;
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("position", { ascending: true })
    .order("name", { ascending: true });
  return (data ?? []) as Category[];
});

export const getCategoryBySlug = cache(async (slug: string): Promise<Category | null> => {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
});

/* Top-level categories with their children attached, in display order. */
export function groupCategories(categories: Category[]) {
  const parents = categories.filter((c) => !c.parent_id);
  return parents.map((parent) => ({
    ...parent,
    children: categories.filter((c) => c.parent_id === parent.id),
  }));
}

export type TopicListParams = {
  view?: TopicListView;
  period?: TopPeriod;
  categoryIds?: string[];
  cursor?: string | null;
  limit?: number;
  includePinnedFirst?: boolean;
};

export type TopicPage = { topics: TopicRow[]; nextCursor: string | null };

function periodStart(period: TopPeriod): string | null {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  switch (period) {
    case "day":
      return new Date(now - day).toISOString();
    case "week":
      return new Date(now - 7 * day).toISOString();
    case "month":
      return new Date(now - 30 * day).toISOString();
    default:
      return null;
  }
}

/*
  Latest, top and unanswered views with cursor pagination. Pinned topics are
  shown first only inside a category, matching how members expect them.
  The cursor keys on the sort column alone; a tie on the exact millisecond
  could skip a row, which is acceptable for a feed.
*/
export async function getTopics(params: TopicListParams = {}): Promise<TopicPage> {
  const { view = "latest", period = "week", categoryIds, includePinnedFirst = false } = params;
  const limit = Math.min(params.limit ?? 30, 50);
  const cursor = decodeCursor(params.cursor);
  const supabase = await createClient();

  let query = supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .is("deleted_at", null)
    .eq("is_unlisted", false)
    .limit(limit + 1);

  if (categoryIds && categoryIds.length > 0) {
    query = query.in("category_id", categoryIds);
  }

  if (view === "top") {
    const start = periodStart(period);
    if (start) query = query.gte("created_at", start);
    query = query.order("like_count", { ascending: false }).order("reply_count", { ascending: false }).order("created_at", { ascending: false });
    // Top is offset paginated: cursor.v holds the offset.
    const offset = cursor ? Number(cursor.v) : 0;
    query = query.range(offset, offset + limit);
  } else if (view === "unanswered") {
    query = query.eq("reply_count", 0).order("created_at", { ascending: false });
    if (cursor) query = query.lt("created_at", String(cursor.v));
  } else {
    if (includePinnedFirst) query = query.order("is_pinned", { ascending: false });
    query = query.order("last_post_at", { ascending: false });
    if (cursor) {
      query = query.lt("last_post_at", String(cursor.v));
      if (includePinnedFirst) query = query.eq("is_pinned", false);
    }
  }

  const { data } = await query;
  const rows = ((data ?? []) as unknown as RawTopic[]).map(shapeTopic);
  const hasMore = rows.length > limit;
  const topics = hasMore ? rows.slice(0, limit) : rows;
  const last = topics[topics.length - 1];

  let nextCursor: string | null = null;
  if (hasMore && last) {
    if (view === "top") {
      nextCursor = encodeCursor({ v: (cursor ? Number(cursor.v) : 0) + limit, id: last.id });
    } else if (view === "unanswered") {
      nextCursor = encodeCursor({ v: last.created_at, id: last.id });
    } else {
      nextCursor = encodeCursor({ v: last.last_post_at, id: last.id });
    }
  }

  return { topics, nextCursor };
}

export type TopicPageData = {
  topic: TopicRow;
  posts: PostRow[];
  solution: PostRow | null;
};

export const getTopicByShortId = cache(async (shortId: string, viewerId?: string | null): Promise<TopicPageData | null> => {
  const supabase = await createClient();
  const { data: topicRaw } = await supabase.from("topics").select(TOPIC_SELECT).eq("short_id", shortId).maybeSingle();
  if (!topicRaw) return null;
  const topic = shapeTopic(topicRaw as unknown as RawTopic);

  const { data: postsRaw } = await supabase
    .from("posts")
    .select(`*, author:profiles!posts_author_id_fkey (${PROFILE_SUMMARY})`)
    .eq("topic_id", topic.id)
    .order("post_number", { ascending: true });

  let posts = (postsRaw ?? []) as unknown as PostRow[];

  if (viewerId && posts.length > 0) {
    const { data: likes } = await supabase
      .from("likes")
      .select("post_id")
      .eq("user_id", viewerId)
      .in(
        "post_id",
        posts.map((p) => p.id),
      );
    const liked = new Set((likes ?? []).map((l) => l.post_id as string));
    posts = posts.map((p) => ({ ...p, liked_by_me: liked.has(p.id) }));
  }

  const solution = topic.solution_post_id ? (posts.find((p) => p.id === topic.solution_post_id) ?? null) : null;

  return { topic, posts, solution };
});

export const getProfileByUsername = cache(async (username: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("username", username.toLowerCase()).maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function getProfileActivity(userId: string) {
  const supabase = await createClient();
  const [{ data: topics }, { data: posts }] = await Promise.all([
    supabase.from("topics").select(TOPIC_SELECT).eq("author_id", userId).is("deleted_at", null).order("created_at", { ascending: false }).limit(10),
    supabase
      .from("posts")
      .select("id, topic_id, post_number, body_md, created_at, topic:topics (title, slug, short_id)")
      .eq("author_id", userId)
      .eq("is_deleted", false)
      .gt("post_number", 1)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  return {
    topics: ((topics ?? []) as unknown as RawTopic[]).map(shapeTopic),
    replies: (posts ?? []) as unknown as {
      id: string;
      topic_id: string;
      post_number: number;
      body_md: string;
      created_at: string;
      topic: { title: string; slug: string; short_id: string } | null;
    }[],
  };
}

/* Members whose username starts with the query, for mention autocomplete. */
export async function searchMembers(prefix: string, limit = 8): Promise<ProfileSummary[]> {
  const clean = prefix.toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (!clean) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SUMMARY)
    .ilike("username", `${clean}%`)
    .order("post_count", { ascending: false })
    .limit(limit);
  return (data ?? []) as ProfileSummary[];
}

/* Full-text search over titles and bodies. Title matches come first. */
export async function searchTopics(q: string, limit = 30): Promise<TopicRow[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const supabase = await createClient();

  const [{ data: byTitle }, { data: byBody }] = await Promise.all([
    supabase.from("topics").select(TOPIC_SELECT).is("deleted_at", null).textSearch("search_vector", query, { type: "websearch", config: "english" }).limit(limit),
    supabase
      .from("posts")
      .select("topic_id")
      .eq("is_deleted", false)
      .eq("is_hidden", false)
      .textSearch("search_vector", query, { type: "websearch", config: "english" })
      .limit(limit * 3),
  ]);

  const seen = new Set<string>();
  const results: TopicRow[] = [];
  for (const raw of (byTitle ?? []) as unknown as RawTopic[]) {
    const t = shapeTopic(raw);
    if (!seen.has(t.id)) {
      seen.add(t.id);
      results.push(t);
    }
  }

  const bodyIds = Array.from(new Set((byBody ?? []).map((p) => p.topic_id as string))).filter((id) => !seen.has(id));
  if (bodyIds.length > 0 && results.length < limit) {
    const { data: more } = await supabase.from("topics").select(TOPIC_SELECT).in("id", bodyIds.slice(0, limit - results.length)).is("deleted_at", null);
    for (const raw of (more ?? []) as unknown as RawTopic[]) results.push(shapeTopic(raw));
  }

  // Solved threads first: the accepted answer is what a searcher wants.
  results.sort((a, b) => Number(b.is_solved) - Number(a.is_solved));
  return results.slice(0, limit);
}

export type Answerer = { id: string; username: string; display_name: string | null; avatar_url: string | null; trust_level: number; is_staff: boolean; solutions: number };

export const getTopAnswerers = cache(async (days = 30, limit = 5): Promise<Answerer[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("top_answerers", { p_days: days, p_limit: limit });
  return ((data ?? []) as Answerer[]).map((a) => ({ ...a, solutions: Number(a.solutions) }));
});

export const getCategoryFollows = cache(async (userId: string): Promise<Map<string, "following" | "muted">> => {
  const supabase = await createClient();
  const { data } = await supabase.from("category_follows").select("category_id, level").eq("user_id", userId);
  return new Map((data ?? []).map((f) => [f.category_id as string, f.level as "following" | "muted"]));
});

export const getUnreadNotificationCount = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null);
  return count ?? 0;
});

export async function getNotifications(userId: string, limit = 30): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as Notification[];
}

export type FlagRow = Flag & {
  reporter: ProfileSummary | null;
  post: (PostRow & { topic: { id: string; title: string; slug: string; short_id: string } | null }) | null;
};

export async function getOpenFlags(): Promise<FlagRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("flags")
    .select(
      `*, reporter:profiles!flags_reporter_id_fkey (${PROFILE_SUMMARY}),
       post:posts (*, author:profiles!posts_author_id_fkey (${PROFILE_SUMMARY}), topic:topics (id, title, slug, short_id))`,
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);
  return (data ?? []) as unknown as FlagRow[];
}

export async function getUnansweredOlderThan(hours: number): Promise<TopicRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { data } = await supabase.from("topics").select(TOPIC_SELECT).eq("reply_count", 0).is("deleted_at", null).lt("created_at", since).order("created_at", { ascending: true }).limit(50);
  return ((data ?? []) as unknown as RawTopic[]).map(shapeTopic);
}

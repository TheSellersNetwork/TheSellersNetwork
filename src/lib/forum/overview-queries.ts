import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, TopicRow } from "@/lib/db/types";

const PROFILE_SUMMARY = "id, username, display_name, avatar_url, trust_level, is_staff, solution_count";

export type LatestInCategory = Pick<TopicRow, "id" | "title" | "slug" | "short_id" | "last_post_at" | "reply_count" | "is_solved"> & {
  last_poster: ProfileSummary | null;
};

/*
  The most recent topic in every category, for the Explore cards. Pulls the
  latest few hundred topics and keeps the first per category, which is plenty
  at launch scale; a DISTINCT ON function can replace it later.
*/
export const getCategoryOverview = cache(async (): Promise<Map<string, LatestInCategory>> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select(`id, title, slug, short_id, last_post_at, reply_count, is_solved, category_id, last_poster:profiles!topics_last_poster_id_fkey (${PROFILE_SUMMARY})`)
    .is("deleted_at", null)
    .eq("is_unlisted", false)
    .order("last_post_at", { ascending: false })
    .limit(300);
  const map = new Map<string, LatestInCategory>();
  for (const row of (data ?? []) as unknown as (LatestInCategory & { category_id: string })[]) {
    if (!map.has(row.category_id)) map.set(row.category_id, row);
  }
  return map;
});

export type RecentReply = {
  id: string;
  post_number: number;
  created_at: string;
  author: ProfileSummary | null;
  topic: { title: string; slug: string; short_id: string } | null;
};

export const getRecentReplies = cache(async (limit = 8): Promise<RecentReply[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(`id, post_number, created_at, author:profiles!posts_author_id_fkey (${PROFILE_SUMMARY}), topic:topics (title, slug, short_id)`)
    .eq("is_deleted", false)
    .eq("is_hidden", false)
    .gt("post_number", 1)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as RecentReply[];
});

export type RecentTopic = {
  id: string;
  title: string;
  slug: string;
  short_id: string;
  created_at: string;
  reply_count: number;
  author: ProfileSummary | null;
};

export const getRecentTopics = cache(async (limit = 8): Promise<RecentTopic[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select(`id, title, slug, short_id, created_at, reply_count, author:profiles!topics_author_id_fkey (${PROFILE_SUMMARY})`)
    .is("deleted_at", null)
    .eq("is_unlisted", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as RecentTopic[];
});

/*
  The site's own accounts (the house account that posts fee changes and weekly
  threads, and the placeholder for deleted members), as profile ids.
*/
export const getSiteAccountIds = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_accounts").select("profile_id").in("key", ["house", "deleted"]);
  return new Set((data ?? []).map((r) => r.profile_id as string));
});

/*
  Newest real member questions nobody has replied to. Threads the site posts
  itself (the house, anonymous-holder and deleted accounts: fee change
  discussions, weekly threads, starters) are not questions, so they are left out,
  and so are staff posts.
*/
export const getUnansweredTopics = cache(async (limit = 5): Promise<RecentTopic[]> => {
  const supabase = await createClient();
  const { data: site } = await supabase.from("site_accounts").select("profile_id").in("key", ["house", "deleted"]);
  const siteIds = (site ?? []).map((r) => r.profile_id as string);
  let query = supabase
    .from("topics")
    .select(`id, title, slug, short_id, created_at, reply_count, author:profiles!topics_author_id_fkey!inner (${PROFILE_SUMMARY})`)
    .is("deleted_at", null)
    .eq("is_unlisted", false)
    .eq("reply_count", 0)
    .eq("is_pinned", false)
    .eq("author.is_staff", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (siteIds.length) query = query.not("author_id", "in", `(${siteIds.join(",")})`);
  const { data } = await query;
  return (data ?? []) as unknown as RecentTopic[];
});

export type PopularTag = { slug: string; name: string; topic_count: number };

export const getPopularTags = cache(async (limit = 6): Promise<PopularTag[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("slug, name, topic_count").gt("topic_count", 0).order("topic_count", { ascending: false }).limit(limit);
  return (data ?? []) as PopularTag[];
});

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileSummary, TopicRow } from "@/lib/db/types";

export type CommunityStats = { topics_week: number; replies_week: number; solved_week: number; online_now: number; members: number };

export const getCommunityStats = cache(async (): Promise<CommunityStats> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("community_stats").maybeSingle();
  const row = (data ?? {}) as Partial<Record<keyof CommunityStats, number | string>>;
  return {
    topics_week: Number(row.topics_week ?? 0),
    replies_week: Number(row.replies_week ?? 0),
    solved_week: Number(row.solved_week ?? 0),
    online_now: Number(row.online_now ?? 0),
    members: Number(row.members ?? 0),
  };
});

export type OnlineMember = ProfileSummary & { last_seen_at: string };

export const getOnlineMembers = cache(async (limit = 12): Promise<OnlineMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("online_members", { p_minutes: 5, p_limit: limit });
  return (data ?? []) as OnlineMember[];
});

/* Unread topic counts per category for the signed-in member. */
export const getCategoryUnread = cache(async (): Promise<Map<string, number>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("category_unread_counts");
  return new Map(((data ?? []) as { category_id: string; unread: number | string }[]).map((r) => [r.category_id, Number(r.unread)]));
});

const PROFILE_SUMMARY = "id, username, display_name, avatar_url, trust_level, is_staff, solution_count";
const TOPIC_SELECT = `
  *,
  category:categories (id, slug, name, colour),
  author:profiles!topics_author_id_fkey (${PROFILE_SUMMARY}),
  last_poster:profiles!topics_last_poster_id_fkey (${PROFILE_SUMMARY}),
  topic_tags (tag:tags (id, slug, name))
`;

type RawTopic = Omit<TopicRow, "tags"> & { topic_tags?: { tag: TopicRow["tags"][number] | null }[] };
const shape = (raw: RawTopic): TopicRow => {
  const { topic_tags, ...rest } = raw;
  return { ...rest, tags: (topic_tags ?? []).map((t) => t.tag).filter((t): t is TopicRow["tags"][number] => !!t) };
};

export type HeroTopics = {
  solved: (TopicRow & { solver: ProfileSummary | null }) | null;
  discussed: TopicRow | null;
  weekly: TopicRow | null;
};

/* The three front page cards: best solved answer, busiest thread, this week's numbers thread. */
export const getHeroTopics = cache(async (): Promise<HeroTopics> => {
  const supabase = await createClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: solvedRows }, { data: discussedRows }, { data: weeklyRows }] = await Promise.all([
    supabase
      .from("topics")
      .select(`${TOPIC_SELECT}, solution:posts!topics_solution_post_fk (author:profiles!posts_author_id_fkey (${PROFILE_SUMMARY}))`)
      .eq("is_solved", true)
      .is("deleted_at", null)
      .gte("updated_at", since)
      .order("like_count", { ascending: false })
      .order("reply_count", { ascending: false })
      .limit(1),
    supabase.from("topics").select(TOPIC_SELECT).is("deleted_at", null).eq("is_pinned", false).gte("last_post_at", since).order("reply_count", { ascending: false }).order("last_post_at", { ascending: false }).limit(1),
    supabase.from("topics").select(TOPIC_SELECT).is("deleted_at", null).eq("is_pinned", true).ilike("title", "What did you sell this week%").order("created_at", { ascending: false }).limit(1),
  ]);

  const solvedRaw = (solvedRows ?? [])[0] as unknown as (RawTopic & { solution: { author: ProfileSummary | null } | null }) | undefined;
  const discussedRaw = (discussedRows ?? [])[0] as unknown as RawTopic | undefined;
  const weeklyRaw = (weeklyRows ?? [])[0] as unknown as RawTopic | undefined;

  const solved = solvedRaw ? { ...shape(solvedRaw), solver: solvedRaw.solution?.author ?? null } : null;
  const discussed = discussedRaw && discussedRaw.id !== solved?.id ? shape(discussedRaw) : null;
  return { solved, discussed, weekly: weeklyRaw ? shape(weeklyRaw) : null };
});

export function isOnline(lastSeenAt: string | null | undefined, minutes = 5): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < minutes * 60 * 1000;
}

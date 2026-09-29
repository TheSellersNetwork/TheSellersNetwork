import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Tag = { id: string; slug: string; name: string; topic_count: number };

/*
  Before migration 20260930000100 is applied, tag_follows does not exist and
  Supabase answers 42P01 or PGRST205. Callers then hide the follow controls.
*/
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message ?? "");
}

export const getTagBySlug = cache(async (slug: string): Promise<Tag | null> => {
  const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!clean) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, slug, name, topic_count").eq("slug", clean).maybeSingle();
  return (data as Tag | null) ?? null;
});

/* Ids of the topics carrying a tag, newest first. Tags are small, so a capped list is enough for a page of results. */
export async function getTopicIdsForTag(tagId: string, limit = 500): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("topic_tags").select("topic_id").eq("tag_id", tagId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []).map((r) => r.topic_id as string);
}

/*
  The tags a member follows, or null when following tags is not switched on
  yet (the migration has not been applied).
*/
export const getFollowedTags = cache(async (userId: string): Promise<Tag[] | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tag_follows").select("created_at, tag:tags (id, slug, name, topic_count)").eq("user_id", userId).order("created_at", { ascending: true });
  if (error) return isMissingTable(error) ? null : [];
  return (data ?? []).map((r) => r.tag as unknown as Tag | null).filter((t): t is Tag => !!t);
});

/* Followed tag ids as a set, or null when the feature is not available. */
export async function getFollowedTagIds(userId: string): Promise<Set<string> | null> {
  const tags = await getFollowedTags(userId);
  return tags ? new Set(tags.map((t) => t.id)) : null;
}

/* Is following tags available at all? For signed-out pages. Anonymous visitors get "permission denied", which still means the table exists. */
export const tagFollowsAvailable = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { error } = await supabase.from("tag_follows").select("tag_id").limit(1);
  return !isMissingTable(error);
});

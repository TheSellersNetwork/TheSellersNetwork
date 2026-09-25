import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Kit, KitItem, ProfileSummary } from "@/lib/db/types";

/* Consecutive Monday threads a member has posted in. Cached per request, so a thread with one author asks once. */
export const getStreak = cache(async (userId: string): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("numbers_streak", { p_user_id: userId });
  return Number(data ?? 0);
});

export type DealMeta = { heat: number; valid: number; expired: number };

/* Deal ordering and vote counts for a deals forum. */
export const getDealOrder = cache(async (categoryId: string): Promise<Map<string, DealMeta>> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("deal_topics", { p_category_id: categoryId, p_limit: 100 });
  return new Map(((data ?? []) as { topic_id: string; heat: number | string; valid_votes: number | string; expired_votes: number | string }[]).map((r) => [r.topic_id, { heat: Number(r.heat), valid: Number(r.valid_votes), expired: Number(r.expired_votes) }]));
});

export async function getMyDealVote(userId: string, topicId: string): Promise<"valid" | "expired" | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("deal_votes").select("vote").eq("user_id", userId).eq("topic_id", topicId).maybeSingle();
  return (data?.vote as "valid" | "expired" | undefined) ?? null;
}

/* First image in each opening post, for gallery forums. */
export async function getCoverImages(topicIds: string[]): Promise<Map<string, string>> {
  if (topicIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select("topic_id, body_md").in("topic_id", topicIds).eq("post_number", 1);
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const m = /!\[[^\]]*\]\((https:\/\/[^)\s]+)\)/.exec(row.body_md as string);
    if (m) map.set(row.topic_id as string, m[1]);
  }
  return map;
}

export type KitRow = Kit & { owner: ProfileSummary | null; item_count: number };

export const getPublicKits = cache(async (limit = 30): Promise<KitRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kits")
    .select("*, owner:profiles!kits_user_id_fkey (id, username, display_name, avatar_url, trust_level, is_staff, solution_count), kit_items (id)")
    .eq("is_public", true)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as (Kit & { owner: ProfileSummary | null; kit_items: { id: string }[] })[]).map(({ kit_items, ...k }) => ({ ...k, item_count: kit_items.length }));
});

export const getKitsForUser = cache(async (userId: string): Promise<KitRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kits")
    .select("*, owner:profiles!kits_user_id_fkey (id, username, display_name, avatar_url, trust_level, is_staff, solution_count), kit_items (id)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return ((data ?? []) as unknown as (Kit & { owner: ProfileSummary | null; kit_items: { id: string }[] })[]).map(({ kit_items, ...k }) => ({ ...k, item_count: kit_items.length }));
});

export async function getKit(id: string): Promise<(Kit & { owner: ProfileSummary | null; items: KitItem[] }) | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kits")
    .select("*, owner:profiles!kits_user_id_fkey (id, username, display_name, avatar_url, trust_level, is_staff, solution_count), items:kit_items (*)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const kit = data as unknown as Kit & { owner: ProfileSummary | null; items: KitItem[] };
  kit.items = [...kit.items].sort((a, b) => a.position - b.position);
  return kit;
}

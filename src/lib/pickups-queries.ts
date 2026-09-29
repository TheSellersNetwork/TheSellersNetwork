import "server-only";
import { createClient } from "@/lib/supabase/server";
import { rankByMultiple, ukMonthStart, type Pickup } from "@/lib/pickups";
import type { PickupComment } from "@/lib/pickups-comments";

const SELECT = "*, author:profiles!pickups_user_id_fkey (username, display_name, avatar_url)";

export type PickupFilters = { category?: string; source?: string; sold?: boolean; brand?: string };

export async function getPickups(filters: PickupFilters, limit = 48): Promise<Pickup[]> {
  const supabase = await createClient();
  let q = supabase.from("pickups").select(SELECT).eq("is_hidden", false).order("created_at", { ascending: false }).limit(limit);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.source) q = q.eq("source_type", filters.source);
  if (filters.sold) q = q.not("sold_price", "is", null);
  // Part of the name is enough ("levi" finds "Levi's"). Wildcards typed in are ignored.
  const brand = filters.brand?.replace(/[%_*\\]/g, "").trim();
  if (brand) q = q.ilike("brand", `%${brand}%`);
  const { data } = await q;
  return (data ?? []) as unknown as Pickup[];
}

export async function getPickup(id: string, viewerId?: string | null): Promise<Pickup | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("pickups").select(SELECT).eq("id", id).maybeSingle();
  if (!data) return null;
  let liked = false;
  if (viewerId) {
    const { data: like } = await supabase.from("pickup_likes").select("pickup_id").eq("pickup_id", id).eq("user_id", viewerId).maybeSingle();
    liked = !!like;
  }
  return { ...(data as unknown as Pickup), liked_by_me: liked };
}

export type BoloBrand = {
  brand: string;
  pickups: number;
  sold: number;
  median_paid: number;
  median_sold: number | null;
  median_multiple: number | null;
  top_category: string;
  top_source: string;
};

export async function getBoloBrands(): Promise<BoloBrand[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("bolo_brands", { p_days: 365, p_min_sold: 3 });
  return (data ?? []) as BoloBrand[];
}

/* Totals across every pickup, for the page header. Honest: shown only when there is something to show. */
export async function getPickupTotals(): Promise<{ count: number; sold: number }> {
  const supabase = await createClient();
  const [all, sold] = await Promise.all([
    supabase.from("pickups").select("id", { count: "exact", head: true }).eq("is_hidden", false),
    supabase.from("pickups").select("id", { count: "exact", head: true }).eq("is_hidden", false).not("sold_price", "is", null),
  ]);
  return { count: all.count ?? 0, sold: sold.count ?? 0 };
}

/* Fewer than this many sold this month and the "what sold this month" strip stays hidden. */
export const SOLD_MONTH_MIN = 3;

/* This calendar month's sold pickups with the highest multiples. Empty unless at least SOLD_MONTH_MIN have sold. */
export async function getSoldThisMonth(limit = 8): Promise<Pickup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("pickups")
    .select(SELECT)
    .eq("is_hidden", false)
    .not("sold_price", "is", null)
    .gte("sold_at", ukMonthStart())
    .gt("paid", 0)
    .order("sold_at", { ascending: false })
    .limit(500);
  const rows = (data ?? []) as unknown as Pickup[];
  if (rows.length < SOLD_MONTH_MIN) return [];
  return rankByMultiple(rows, limit);
}

/* One member's pickups, newest first, for their profile. */
export async function getPickupsForUser(userId: string, limit = 24): Promise<Pickup[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("pickups").select(SELECT).eq("user_id", userId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as unknown as Pickup[];
}

/*
  Comments on one pickup, oldest first. `available` is false until the
  comments migration is applied, so the page can leave the section out.
*/
export async function getPickupComments(pickupId: string): Promise<{ available: boolean; comments: PickupComment[] }> {
  if (!/^[0-9a-f-]{36}$/.test(pickupId)) return { available: false, comments: [] };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pickup_comments")
    .select("id, pickup_id, user_id, body, created_at, author:profiles!pickup_comments_user_id_fkey (username, display_name, avatar_url)")
    .eq("pickup_id", pickupId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return { available: false, comments: [] };
  return { available: true, comments: (data ?? []) as unknown as PickupComment[] };
}

/* The viewer's own "Would you have bought it?" answer: true, false, or null if they have not voted. */
export async function getMyPickupVote(pickupId: string, userId: string): Promise<boolean | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pickup_votes").select("would_buy").eq("pickup_id", pickupId).eq("user_id", userId).maybeSingle();
  if (error || !data) return null;
  return data.would_buy as boolean;
}

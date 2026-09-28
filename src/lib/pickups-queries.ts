import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Pickup } from "@/lib/pickups";

const SELECT = "*, author:profiles!pickups_user_id_fkey (username, display_name, avatar_url)";

export type PickupFilters = { category?: string; source?: string; sold?: boolean; brand?: string };

export async function getPickups(filters: PickupFilters, limit = 48): Promise<Pickup[]> {
  const supabase = await createClient();
  let q = supabase.from("pickups").select(SELECT).eq("is_hidden", false).order("created_at", { ascending: false }).limit(limit);
  if (filters.category) q = q.eq("category", filters.category);
  if (filters.source) q = q.eq("source_type", filters.source);
  if (filters.sold) q = q.not("sold_price", "is", null);
  if (filters.brand) q = q.ilike("brand", filters.brand.replace(/[%_]/g, ""));
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

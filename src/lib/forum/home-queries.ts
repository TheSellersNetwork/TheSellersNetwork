import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/forum/queries";
import type { ProfileSummary } from "@/lib/db/types";

export type RecentMember = ProfileSummary & { marketplaces: string[]; last_seen_at: string };

/* Members active in the last week, with their platforms. */
export const getRecentMembers = cache(async (limit = 12): Promise<RecentMember[]> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("recent_members", { p_days: 7, p_limit: limit });
  return (data ?? []) as RecentMember[];
});

export type PlatformTile = { label: string; slug: string; forums: number; topics: number; colour: string };

/* One tile per platform with real counts: how many forums it has and how many topics have ever been posted. */
const tiles: { label: string; slug: string }[] = [
  { label: "eBay", slug: "ebay" },
  { label: "Amazon", slug: "amazon" },
  { label: "Vinted", slug: "vinted" },
  { label: "Whatnot", slug: "whatnot" },
  { label: "TikTok Shop", slug: "tiktok-shop" },
  { label: "Facebook Marketplace", slug: "facebook-marketplace" },
  { label: "Etsy", slug: "etsy-and-handmade" },
  { label: "Depop", slug: "depop-and-clothing-resale" },
];

export const getPlatformTiles = cache(async (): Promise<PlatformTile[]> => {
  const categories = await getCategories();
  return tiles.flatMap((t) => {
    const cat = categories.find((c) => c.slug === t.slug);
    if (!cat) return [];
    const children = categories.filter((c) => c.parent_id === cat.id);
    const all = [cat, ...children];
    return [{ label: t.label, slug: cat.slug, forums: Math.max(children.length, 1), topics: all.reduce((n, c) => n + c.topic_count, 0), colour: cat.colour }];
  });
});

export type NewsletterIssue = { id: string; slug: string; subject: string; preview_text: string | null; body_md: string; body_html: string | null; sent_at: string; recipient_count: number };

export const getLatestIssue = cache(async (): Promise<NewsletterIssue | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_issues").select("*").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle();
  return (data as NewsletterIssue | null) ?? null;
});

export const getIssues = cache(async (): Promise<NewsletterIssue[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_issues").select("*").not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(50);
  return (data ?? []) as NewsletterIssue[];
});

export async function getIssue(slug: string): Promise<NewsletterIssue | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("newsletter_issues").select("*").eq("slug", slug).not("sent_at", "is", null).maybeSingle();
  return (data as NewsletterIssue | null) ?? null;
}

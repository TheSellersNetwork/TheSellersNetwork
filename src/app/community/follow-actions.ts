"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export async function setCategoryFollow(categoryId: string, level: "following" | "muted" | null): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { error } = level
    ? await supabase.from("category_follows").upsert({ user_id: user.id, category_id: categoryId, level }, { onConflict: "user_id,category_id" })
    : await supabase.from("category_follows").delete().eq("user_id", user.id).eq("category_id", categoryId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/community");
  return { ok: true, message: "" };
}

/* Marketplaces chosen at onboarding become followed categories, so the feed starts relevant. */
export const marketplaceToCategory: Record<string, string> = {
  ebay: "ebay",
  amazon: "amazon",
  vinted: "vinted",
  facebook: "facebook-marketplace",
  depop: "depop-and-clothing-resale",
  etsy: "etsy-and-handmade",
  own_website: "own-website-and-shopify",
  live: "live-selling",
  other: "other-platforms",
};

export async function followFromMarketplaces(userId: string, marketplaces: string[]): Promise<void> {
  const slugs = Array.from(new Set(marketplaces.map((m) => marketplaceToCategory[m]).filter(Boolean)));
  if (slugs.length === 0) return;
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id").in("slug", slugs);
  if (!categories || categories.length === 0) return;
  await supabase.from("category_follows").upsert(
    categories.map((c) => ({ user_id: userId, category_id: c.id, level: "following" })),
    { onConflict: "user_id,category_id", ignoreDuplicates: true },
  );
}

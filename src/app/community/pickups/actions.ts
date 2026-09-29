"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allowAction } from "@/lib/rate-limit";
import { friendlyError } from "@/lib/errors";
import { pickupCategories, pickupPlatforms, pickupSources } from "@/lib/pickups";
import { validateComment } from "@/lib/pickups-comments";

export type PickupState = { ok: boolean; message: string };

const money = z
  .string()
  .trim()
  .transform((v) => v.replace(/[£,\s]/g, ""))
  .refine((v) => v === "" || /^\d{1,5}(\.\d{1,2})?$/.test(v), "Enter an amount like 4.50")
  .transform((v) => (v === "" ? null : Number(v)));

const noLinks = (v: string) => !/(https?:\/\/|www\.)/i.test(v);

const schema = z.object({
  title: z.string().trim().min(3, "Say what it is.").max(120).refine(noLinks, "No links please."),
  brand: z.string().trim().max(60).optional(),
  category: z.enum(Object.keys(pickupCategories) as [string, ...string[]]),
  source_type: z.enum(Object.keys(pickupSources) as [string, ...string[]]),
  area: z.string().trim().max(60).optional(),
  paid: money.refine((v) => v !== null, "Enter what you paid (0 if it was free)."),
  expected: money,
  note: z.string().trim().max(1000).refine(noLinks, "No links please.").optional(),
  photo_url: z.string().url().optional().or(z.literal("")),
});

export async function createPickup(_prev: PickupState, formData: FormData): Promise<PickupState> {
  const user = await requireOnboardedUser("/community/pickups/new");
  if (!user.emailConfirmed) return { ok: false, message: "Confirm your email address first." };
  const parsed = schema.safeParse(Object.fromEntries(["title", "brand", "category", "source_type", "area", "paid", "expected", "note", "photo_url"].map((k) => [k, formData.get(k) ?? undefined])));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (!(await allowAction(`pickup:${user.id}`, 20, "1 day"))) return { ok: false, message: "That is a lot of pickups for one day. Try again tomorrow." };

  const d = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pickups")
    .insert({
      user_id: user.id,
      title: d.title,
      brand: d.brand || null,
      category: d.category,
      source_type: d.source_type,
      area: d.area || null,
      paid: d.paid,
      expected: d.expected,
      note: d.note || null,
      photo_url: d.photo_url || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: friendlyError(error) };
  revalidatePath("/community/pickups");
  redirect(`/community/pickups/${data.id}`);
}

const soldSchema = z.object({
  id: z.string().uuid(),
  sold_price: money.refine((v) => v !== null, "Enter what it sold for."),
  sold_platform: z.enum(Object.keys(pickupPlatforms) as [string, ...string[]]),
});

/* The follow-up that makes pickups useful: what it actually sold for. */
export async function markPickupSold(_prev: PickupState, formData: FormData): Promise<PickupState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const parsed = soldSchema.safeParse({ id: formData.get("id"), sold_price: formData.get("sold_price"), sold_platform: formData.get("sold_platform") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase
    .from("pickups")
    .update({ sold_price: parsed.data.sold_price, sold_platform: parsed.data.sold_platform, sold_at: new Date().toISOString().slice(0, 10) })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/community/pickups/${parsed.data.id}`);
  revalidatePath("/community/pickups");
  return { ok: true, message: "Nice. Sold price saved." };
}

export async function deletePickup(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !/^[0-9a-f-]{36}$/.test(id)) return;
  const supabase = await createClient();
  await supabase.from("pickups").delete().eq("id", id);
  revalidatePath("/community/pickups");
  redirect("/community/pickups");
}

export async function togglePickupLike(id: string): Promise<{ ok: boolean; liked?: boolean; count?: number; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to say nice find." };
  if (!(await allowAction(`pickup-like:${user.id}`, 120, "1 hour"))) return { ok: false, message: "Slow down a little." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("pickup_likes").select("pickup_id").eq("user_id", user.id).eq("pickup_id", id).maybeSingle();
  const { error } = existing
    ? await supabase.from("pickup_likes").delete().eq("user_id", user.id).eq("pickup_id", id)
    : await supabase.from("pickup_likes").insert({ user_id: user.id, pickup_id: id });
  if (error) return { ok: false, message: friendlyError(error) };
  const { data } = await supabase.from("pickups").select("like_count").eq("id", id).single();
  return { ok: true, liked: !existing, count: data?.like_count ?? 0 };
}

export type CommentState = { ok: boolean; message: string; nonce?: number };

/* Comments on a pickup: members only, rate limited, same link rule as forum posts. */
export async function addPickupComment(_prev: CommentState, formData: FormData): Promise<CommentState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to comment." };
  if (!user.profile.onboarded_at) return { ok: false, message: "Finish setting up your profile first." };
  if (!user.emailConfirmed) return { ok: false, message: "Confirm your email address first." };
  if (user.profile.is_suspended) return { ok: false, message: "Your account is suspended." };
  const id = String(formData.get("pickup_id") ?? "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return { ok: false, message: "That pickup could not be found." };
  const body = String(formData.get("body") ?? "").trim();
  const invalid = validateComment(body, user.profile.trust_level, user.profile.is_staff);
  if (invalid) return { ok: false, message: invalid };
  if (!(await allowAction(`pickup-comment:${user.id}`, 30, "1 hour"))) return { ok: false, message: "That is a lot of comments in an hour. Try again a little later." };

  const supabase = await createClient();
  const { error } = await supabase.from("pickup_comments").insert({ pickup_id: id, user_id: user.id, body });
  if (error) {
    if (error.message.includes("links_not_allowed")) return { ok: false, message: "New members cannot post links yet. Describe it in words for now." };
    if (error.message.includes("posting_too_fast")) return { ok: false, message: "That is a lot of comments in an hour. Try again a little later." };
    return { ok: false, message: friendlyError(error) };
  }
  revalidatePath(`/community/pickups/${id}`);
  return { ok: true, message: "Comment posted.", nonce: Date.now() };
}

export async function deletePickupComment(commentId: string, pickupId: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  if (!/^[0-9a-f-]{36}$/.test(commentId) || !/^[0-9a-f-]{36}$/.test(pickupId)) return { ok: false };
  const supabase = await createClient();
  // RLS limits this to the author (or staff).
  const { error } = await supabase.from("pickup_comments").delete().eq("id", commentId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/community/pickups/${pickupId}`);
  return { ok: true };
}

/* "Would you have bought it at that price?" One answer per member, which they can change. Not on your own pickup. */
export async function votePickup(id: string, wouldBuy: boolean): Promise<{ ok: boolean; message?: string; yes?: number; no?: number; mine?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to vote." };
  if (!/^[0-9a-f-]{36}$/.test(id) || typeof wouldBuy !== "boolean") return { ok: false, message: "That did not work." };
  if (!(await allowAction(`pickup-vote:${user.id}`, 120, "1 hour"))) return { ok: false, message: "Slow down a little." };
  const supabase = await createClient();
  const { data: existing } = await supabase.from("pickup_votes").select("would_buy").eq("pickup_id", id).eq("user_id", user.id).maybeSingle();
  const { error } = existing
    ? await supabase.from("pickup_votes").update({ would_buy: wouldBuy }).eq("pickup_id", id).eq("user_id", user.id)
    : await supabase.from("pickup_votes").insert({ pickup_id: id, user_id: user.id, would_buy: wouldBuy });
  if (error) return { ok: false, message: friendlyError(error, "You cannot vote on this pickup.") };
  const { data } = await supabase.from("pickups").select("vote_yes_count, vote_no_count").eq("id", id).single();
  revalidatePath(`/community/pickups/${id}`);
  return { ok: true, yes: data?.vote_yes_count ?? 0, no: data?.vote_no_count ?? 0, mine: wouldBuy };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";

export type AdminState = { ok: boolean; message: string };

const partnerSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,60}$/, "Slug: lowercase letters, numbers and hyphens."),
  name: z.string().trim().min(1, "Name is required.").max(80),
  url: z.string().trim().url("Enter a full URL starting with https://"),
  logo_url: z.string().trim().url().optional().or(z.literal("")),
  blurb: z.string().trim().max(600).optional(),
  category: z.enum(["postage", "bookkeeping", "sourcing", "software", "other"]),
  relationship: z.enum(["partner", "sponsored", "affiliate"]),
  position: z.coerce.number().int().min(0).max(999).default(0),
  is_active: z.enum(["on", "off"]).default("on"),
});

async function staff() {
  const user = await getCurrentUser();
  if (!user?.profile.is_staff) throw new Error("Staff only.");
  return user;
}

async function log(actorId: string, action: string, targetType: string, targetId: string, metadata: Record<string, unknown> = {}) {
  const supabase = await createClient();
  await supabase.from("moderation_log").insert({ actor_id: actorId, action, target_type: targetType, target_id: targetId, metadata });
}

export async function savePartner(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = partnerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  let user;
  try {
    user = await staff();
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
  const supabase = await createClient();
  const row = {
    slug: parsed.data.slug,
    name: parsed.data.name,
    url: parsed.data.url,
    logo_url: parsed.data.logo_url || null,
    blurb: parsed.data.blurb || null,
    category: parsed.data.category,
    relationship: parsed.data.relationship,
    position: parsed.data.position,
    is_active: parsed.data.is_active === "on",
  };
  const query = parsed.data.id ? supabase.from("partners").update(row).eq("id", parsed.data.id) : supabase.from("partners").insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not save. Is the slug unique?") };
  await log(user.id, parsed.data.id ? "partner_update" : "partner_create", "partner", data.id, { slug: row.slug });
  revalidatePath("/admin/partners");
  revalidatePath("/partners");
  return { ok: true, message: "Partner saved." };
}

const placementSchema = z.object({
  id: z.string().uuid().optional(),
  partner_id: z.string().uuid(),
  slot: z.enum(["rail", "topic_list"]),
  headline: z.string().trim().min(1, "Headline is required.").max(90, "Headlines are at most 90 characters."),
  body: z.string().trim().max(240, "Body is at most 240 characters.").optional(),
  cta_label: z.string().trim().min(1).max(40).default("Find out more"),
  url: z.string().trim().url().optional().or(z.literal("")),
  starts_at: z.string().min(1, "Start date is required."),
  ends_at: z.string().optional(),
  weight: z.coerce.number().int().min(1).max(100).default(1),
  is_active: z.enum(["on", "off"]).default("on"),
});

export async function savePlacement(_prev: AdminState, formData: FormData): Promise<AdminState> {
  const parsed = placementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  let user;
  try {
    user = await staff();
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
  const supabase = await createClient();
  const row = {
    partner_id: parsed.data.partner_id,
    slot: parsed.data.slot,
    headline: parsed.data.headline,
    body: parsed.data.body || null,
    cta_label: parsed.data.cta_label,
    url: parsed.data.url || null,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
    weight: parsed.data.weight,
    is_active: parsed.data.is_active === "on",
  };
  const query = parsed.data.id ? supabase.from("placements").update(row).eq("id", parsed.data.id) : supabase.from("placements").insert(row);
  const { data, error } = await query.select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not save the placement. Check the dates.") };
  await log(user.id, parsed.data.id ? "placement_update" : "placement_create", "partner", parsed.data.partner_id, { placement_id: data.id, slot: row.slot });
  revalidatePath("/admin/partners");
  revalidatePath("/community");
  return { ok: true, message: "Placement saved." };
}

export async function deletePlacement(id: string): Promise<AdminState> {
  let user;
  try {
    user = await staff();
  } catch (e) {
    return { ok: false, message: friendlyError(e) };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("placements").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  await log(user.id, "placement_delete", "partner", id);
  revalidatePath("/admin/partners");
  return { ok: true, message: "Placement removed." };
}

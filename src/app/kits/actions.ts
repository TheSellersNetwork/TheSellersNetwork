"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOnboardedUser, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { kitKinds } from "@/lib/kits";

export type KitState = { ok: boolean; message: string };

const kindIds = kitKinds.map((k) => k.id) as [string, ...string[]];

const itemSchema = z.object({
  kind: z.enum(kindIds),
  name: z.string().trim().min(1).max(120),
  price_paid: z.string().trim().optional(),
  bought_from: z.string().trim().max(80).optional(),
  url: z.string().trim().url().optional().or(z.literal("")),
  note: z.string().trim().max(300).optional(),
});

const kitSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Give it a title of at least 3 characters.").max(80),
  description: z.string().trim().max(1000).optional(),
  is_public: z.enum(["on", "off"]).default("on"),
  items: z.array(itemSchema).min(1, "Add at least one item.").max(40),
});

/* Items arrive as items[0][name] style fields from the form. */
function collectItems(formData: FormData) {
  const items: Record<string, Record<string, string>> = {};
  for (const [key, value] of formData.entries()) {
    const m = /^items\[(\d+)\]\[(\w+)\]$/.exec(key);
    if (m && typeof value === "string") {
      items[m[1]] = items[m[1]] ?? {};
      items[m[1]][m[2]] = value;
    }
  }
  return Object.keys(items)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => items[k])
    .filter((i) => i.name && i.name.trim());
}

export async function saveKit(_prev: KitState, formData: FormData): Promise<KitState> {
  const parsed = kitSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    is_public: formData.get("is_public") ?? "off",
    items: collectItems(formData),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const user = await requireOnboardedUser("/kits/new");
  const supabase = await createClient();
  const row = { user_id: user.id, title: parsed.data.title, description: parsed.data.description || null, is_public: parsed.data.is_public === "on" };

  let kitId = parsed.data.id;
  if (kitId) {
    const { error } = await supabase.from("kits").update(row).eq("id", kitId);
    if (error) return { ok: false, message: friendlyError(error) };
    await supabase.from("kit_items").delete().eq("kit_id", kitId);
  } else {
    const { data, error } = await supabase.from("kits").insert(row).select("id").single();
    if (error || !data) return { ok: false, message: friendlyError(error) };
    kitId = data.id as string;
  }

  const { error: itemsError } = await supabase.from("kit_items").insert(
    parsed.data.items.map((i, position) => ({
      kit_id: kitId,
      kind: i.kind,
      name: i.name,
      price_paid: i.price_paid ? Number(i.price_paid.replace(/[£,\s]/g, "")) || null : null,
      bought_from: i.bought_from || null,
      url: i.url || null,
      note: i.note || null,
      position,
    })),
  );
  if (itemsError) return { ok: false, message: friendlyError(itemsError) };

  revalidatePath("/kits");
  redirect(`/kits/${kitId}`);
}

export async function copyKit(kitId: string): Promise<KitState & { id?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_kit", { p_kit_id: kitId });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/kits");
  return { ok: true, message: "", id: data as string };
}

export async function deleteKit(kitId: string): Promise<KitState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { error } = await supabase.from("kits").delete().eq("id", kitId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/kits");
  redirect("/kits");
}

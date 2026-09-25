"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { siteConfig } from "@/lib/site";

export type AccountState = { ok: boolean; message: string };

const marketplaceIds = siteConfig.marketplaces.map((m) => m.id) as [string, ...string[]];

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_]{2,29}$/, "Usernames are 3 to 30 characters: lowercase letters, numbers and underscores."),
  display_name: z.string().trim().max(60),
  bio: z.string().trim().max(500),
  marketplaces: z.array(z.enum(marketplaceIds)),
  email_on_reply: z.enum(["on", "off"]),
  email_on_mention: z.enum(["on", "off"]),
  email_digest: z.enum(["on", "off"]),
});

export async function updateAccount(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name") ?? "",
    bio: formData.get("bio") ?? "",
    marketplaces: formData.getAll("marketplaces"),
    email_on_reply: formData.get("email_on_reply"),
    email_on_mention: formData.get("email_on_mention"),
    email_digest: formData.get("email_digest"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const user = await requireUser("/account");
  const supabase = await createClient();

  // Flair: one entry per ticked platform that has a year or a label.
  const year = new Date().getFullYear();
  const flair = parsed.data.marketplaces.flatMap((m) => {
    const since = Number(formData.get(`flair_since_${m}`) ?? "");
    const label = String(formData.get(`flair_label_${m}`) ?? "").trim().slice(0, 24);
    if (!since && !label) return [];
    if (/(https?:\/\/|www\.|\.co|\.com)/i.test(label)) return [];
    return [{ platform: m, ...(since >= 1995 && since <= year ? { since } : {}), ...(label ? { label } : {}) }];
  });

  const { error } = await supabase
    .from("profiles")
    .update({
      flair,
      username: parsed.data.username,
      display_name: parsed.data.display_name || null,
      bio: parsed.data.bio || null,
      marketplaces: parsed.data.marketplaces,
      email_on_reply: parsed.data.email_on_reply === "on",
      email_on_mention: parsed.data.email_on_mention === "on",
      email_digest: parsed.data.email_digest === "on",
    })
    .eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/account");
  revalidatePath(`/community/u/${parsed.data.username}`);
  return { ok: true, message: "Saved." };
}

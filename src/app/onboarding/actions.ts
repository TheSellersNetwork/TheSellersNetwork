"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { siteConfig } from "@/lib/site";

export type OnboardingState = { ok: boolean; message: string };

const marketplaceIds = siteConfig.marketplaces.map((m) => m.id) as [string, ...string[]];

const schema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_]{2,29}$/, "Usernames are 3 to 30 characters: lowercase letters, numbers and underscores."),
  display_name: z.string().trim().max(60).optional(),
  marketplaces: z.array(z.enum(marketplaceIds)),
  accept_rules: z.literal("yes", { message: "Please accept the house rules." }),
  bio: z.string().trim().max(500).optional(),
  next: z.string().startsWith("/").optional(),
});

export async function completeOnboarding(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = schema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name") ?? "",
    marketplaces: formData.getAll("marketplaces"),
    accept_rules: formData.get("accept_rules"),
    bio: formData.get("bio") ?? "",
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const user = await requireUser("/onboarding");
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({
      username: parsed.data.username,
      display_name: parsed.data.display_name || null,
      marketplaces: parsed.data.marketplaces,
      bio: parsed.data.bio || null,
      rules_accepted_at: now,
      onboarded_at: now,
    })
    .eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };

  redirect(parsed.data.next ?? "/community");
}

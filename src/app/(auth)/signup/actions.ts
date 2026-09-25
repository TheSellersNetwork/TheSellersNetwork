"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { trackServer } from "@/lib/analytics/server";
import { siteConfig } from "@/lib/site";

export type SignupState = { ok: boolean; message: string };

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Passwords need at least 8 characters.").max(200),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_]{2,29}$/, "Usernames are 3 to 30 characters: lowercase letters, numbers and underscores."),
  turnstile_token: z.string().optional(),
});

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    turnstile_token: formData.get("turnstile_token") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const human = await verifyTurnstile(parsed.data.turnstile_token, ip);
  if (!human) return { ok: false, message: "We could not confirm you are human. Reload and try again." };

  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("check_rate_limit", { p_key: `register:${ip}`, p_limit: 5, p_window: "1 hour" });
  if (allowed === false) return { ok: false, message: "Too many sign ups from this connection. Try again later." };

  const { data: taken } = await supabase.from("profiles").select("id").eq("username", parsed.data.username).maybeSingle();
  if (taken) return { ok: false, message: "That username is taken." };

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteConfig.url}/auth/callback?next=/onboarding`,
      data: { username: parsed.data.username },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already registered")) return { ok: false, message: "There is already an account with that email. Sign in instead." };
    return { ok: false, message: "We could not create the account. Try again in a moment." };
  }

  if (data.user) await trackServer("signup", { username: parsed.data.username }, data.user.id);

  return { ok: true, message: "We have sent a confirmation link. Click it to finish setting up your account." };
}

"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/turnstile";
import { trackServer } from "@/lib/analytics/server";
import { siteConfig } from "@/lib/site";
import { allowAction, clientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

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
  age: z.literal("on", { message: "You need to be 18 or over to join." }),
  terms: z.literal("on", { message: "Tick the box to agree to the terms and house rules." }),
});

export async function signUp(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
    turnstile_token: formData.get("turnstile_token") ?? undefined,
    age: formData.get("age"),
    terms: formData.get("terms"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const ip = clientIp(await headers());
  const human = await verifyTurnstile(parsed.data.turnstile_token, ip);
  if (!human) return { ok: false, message: "We could not confirm you are human. Reload and try again." };

  const supabase = await createClient();
  if (!(await allowAction(`register:${ip}`, 5, "1 hour"))) return { ok: false, message: "Too many sign ups from this connection. Try again later." };

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

  if (data.user) {
    // Record when they confirmed their age and accepted the terms.
    try {
      const now = new Date().toISOString();
      await createAdminClient().from("profiles").update({ terms_accepted_at: now, age_confirmed_at: now }).eq("id", data.user.id);
    } catch {
      // No service key locally.
    }
    await trackServer("signup", {}, data.user.id);
  }

  return { ok: true, message: "We have sent a confirmation link. Click it to finish setting up your account." };
}

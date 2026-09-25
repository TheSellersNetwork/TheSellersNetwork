"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { trackServer } from "@/lib/analytics/server";

export type SignupState = { ok: boolean; message: string };

const schema = z.object({
  email: z.string().trim().email(),
  source: z.string().trim().max(200).default("unknown"),
});

/*
  Adds an address to the 7-day course. Confirmation email and the sequence
  itself are wired in the email course task; for now the row is stored as
  pending. Rate limited per IP through the database.
*/
export async function subscribeToCourse(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({ email: formData.get("email"), source: formData.get("source") });
  if (!parsed.success) {
    return { ok: false, message: "That email address does not look right." };
  }

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("check_rate_limit", {
    p_key: `signup:${ip}`,
    p_limit: 5,
    p_window: "1 hour",
  });
  if (allowed === false) {
    return { ok: false, message: "Too many attempts. Try again in an hour." };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("email_subscribers")
      .upsert({ email: parsed.data.email.toLowerCase(), source: parsed.data.source }, { onConflict: "email", ignoreDuplicates: true });
    if (error) throw error;
  } catch {
    return { ok: false, message: "Something went wrong saving that. Try again in a moment." };
  }

  await trackServer("signup_form_submitted", { source: parsed.data.source }, parsed.data.email.toLowerCase());
  return { ok: true, message: "Check your inbox for the first email." };
}

"use server";

import { randomBytes } from "node:crypto";
import { z } from "zod";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { trackServer } from "@/lib/analytics/server";
import { sendEmail } from "@/lib/email/send";
import { allowAction, clientIp } from "@/lib/rate-limit";
import { NewsletterConfirmEmail } from "@/emails/newsletter-confirm-email";
import { siteConfig } from "@/lib/site";
import { NEWSLETTER_CONSENT } from "@/lib/newsletter";

export type SignupState = { ok: boolean; message: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: z.string().trim().max(200).default("unknown"),
});

/*
  Newsletter sign-up with double opt-in (PECR): the address is stored as
  pending and only becomes active when its owner clicks the link we send.
  The reply is the same whether or not the address is already on the list,
  so the form cannot be used to check who subscribes.
*/
export async function subscribeToCourse(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = schema.safeParse({ email: formData.get("email"), source: formData.get("source") ?? undefined });
  if (!parsed.success) {
    return { ok: false, message: "That email address does not look right." };
  }
  const { email, source } = parsed.data;

  const ip = clientIp(await headers());
  if (!(await allowAction(`newsletter:${ip}`, 5, "1 hour")) || !(await allowAction(`newsletter-email:${email}`, 3, "1 day"))) {
    return { ok: false, message: "Too many attempts. Try again later." };
  }

  const done: SignupState = { ok: true, message: "Nearly there. Check your inbox and click the link to confirm." };
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "Something went wrong saving that. Try again in a moment." };
  }

  const { data: existing } = await admin.from("email_subscribers").select("id, status").eq("email", email).maybeSingle();
  if (existing?.status === "active") return done;

  const token = randomBytes(24).toString("base64url");
  const row = { email, source, status: "pending", confirm_token: token, consent_text: NEWSLETTER_CONSENT, unsubscribed_at: null };
  const { error } = existing
    ? await admin.from("email_subscribers").update(row).eq("id", existing.id)
    : await admin.from("email_subscribers").insert(row);
  if (error) return { ok: false, message: "Something went wrong saving that. Try again in a moment." };

  await sendEmail({
    to: email,
    subject: "Confirm your newsletter sign-up",
    react: NewsletterConfirmEmail({ confirmUrl: `${siteConfig.url}/newsletter/confirm?token=${token}` }),
  });
  await trackServer("signup_form_submitted", { source }, email);
  return done;
}

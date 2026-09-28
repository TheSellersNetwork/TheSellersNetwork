"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import { allowAction, clientIp } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { ContactReceivedEmail } from "@/emails/contact-received-email";
import { siteConfig } from "@/lib/site";
import { contactKinds } from "@/lib/contact";

export type ContactState = { ok: boolean; message: string; reference?: string };


const schema = z.object({
  kind: z.enum(contactKinds),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter an email address so we can reply.").max(254).optional().or(z.literal("")),
  // Shown to staff as a link, so only ordinary web addresses are accepted.
  url: z
    .string()
    .trim()
    .max(500)
    .url("Enter the full link, starting with https://")
    .refine((u) => /^https?:\/\//i.test(u), "Links must start with https://")
    .optional(),
  reason: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(5000),
  turnstile_token: z.string().optional(),
});

/*
  One route in for everything that needs a person: reports of illegal or
  harmful content, data requests, complaints, appeals, and legal notices.
  Works without an account (reports must be open to anyone affected) and
  still works for suspended members, who need it to appeal.
*/
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    url: formData.get("url") || undefined,
    reason: formData.get("reason") || undefined,
    message: formData.get("message"),
    turnstile_token: formData.get("turnstile_token") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;

  const user = await getCurrentUser();
  const ip = clientIp(await headers());
  if (!user) {
    if (!data.email) return { ok: false, message: "Enter an email address so we can reply." };
    if (!(await verifyTurnstile(data.turnstile_token, ip))) return { ok: false, message: "We could not confirm you are human. Reload and try again." };
  }
  if (!(await allowAction(`contact:${user?.id ?? ip}`, 8, "1 hour"))) return { ok: false, message: "You have sent a lot of messages. Try again in an hour." };

  const email = data.email || user?.email || null;
  const message = data.reason ? `Reason: ${data.reason}\n\n${data.message}` : data.message;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, message: "The form is not working right now. Try again later." };
  }
  const { data: row, error } = await admin
    .from("contact_messages")
    .insert({ kind: data.kind, name: data.name ?? null, email, url: data.url ?? null, message, user_id: user?.id ?? null })
    .select("id")
    .single();
  if (error || !row) return { ok: false, message: "The form is not working right now. Try again later." };
  const reference = String(row.id).slice(0, 8).toUpperCase();

  // Tell staff, and send the sender a receipt with their reference.
  const staffInbox = siteConfig.legal.email ?? process.env.SEED_AUTHOR_EMAIL;
  if (staffInbox) {
    await sendEmail({
      to: staffInbox,
      subject: `[${data.kind}] New message ${reference}`,
      react: ContactReceivedEmail({ reference, kind: data.kind, forStaff: true, adminUrl: `${siteConfig.url}/admin/messages` }),
    });
  }
  if (email) {
    await sendEmail({ to: email, subject: `We have your message (${reference})`, react: ContactReceivedEmail({ reference, kind: data.kind, forStaff: false }) });
  }

  return { ok: true, message: "Thanks. We have your message.", reference };
}

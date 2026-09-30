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
import { noticeProblems } from "@/lib/defamation/notice";

export type ContactState = { ok: boolean; message: string; reference?: string };

// Shown to staff as a link, so only ordinary web addresses are accepted.
const webUrl = z
  .string()
  .trim()
  .max(500)
  .url("Enter the full link, starting with https://")
  .refine((u) => /^https?:\/\//i.test(u), "Links must start with https://");

const schema = z.object({
  kind: z.enum(contactKinds),
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter an email address so we can reply.").max(254).optional().or(z.literal("")),
  url: webUrl.optional(),
  reason: z.string().trim().max(60).optional(),
  message: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(5000),
  turnstile_token: z.string().optional(),
});

/* True when a link points at this site, so a notice is about something we host. */
function isOurSite(url: string): boolean {
  try {
    const bare = (h: string) => h.replace(/^www\./i, "").toLowerCase();
    return bare(new URL(url).host) === bare(new URL(siteConfig.url).host);
  } catch {
    return false;
  }
}

const yesNo = (message: string) => z.enum(["yes", "no"], { error: message }).transform((v) => v === "yes");

/*
  A defamation notice of complaint must contain what the Defamation Act 2013
  s5(6) and the Defamation (Operators of Websites) Regulations 2013 reg 2 list.
  Every field is required except the confirmation about the poster: a notice
  without it is still accepted and stored, but staff see that it is not a
  valid notice and the complainant is told what is missing (reg 4).
*/
const defamationSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name.").max(200),
  email: z.string().trim().toLowerCase().email("Enter an email address we can contact you at.").max(254),
  url: webUrl.refine(isOurSite, "Give the link to the post on this site where the statement appears."),
  statement: z.string().trim().min(3, "Copy the exact words you are complaining about.").max(5000),
  meaning: z.string().trim().min(10, "Tell us what you take the words to mean and why they are defamatory of you (at least 10 characters).").max(5000),
  inaccuracies: z.string().trim().min(3, "Tell us which parts are untrue, or are opinion not supported by fact.").max(5000),
  insufficient_info: z.literal("yes").optional(),
  consent_name: yesNo("Say whether we may give your name to the person who posted it."),
  consent_email: yesNo("Say whether we may give your email address to the person who posted it."),
  previous_removals: yesNo("Say whether we have removed this statement after your complaints before."),
  previous_details: z.string().trim().max(2000).optional(),
});

function field(formData: FormData, name: string): string | undefined {
  const v = formData.get(name);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/*
  One route in for everything that needs a person: reports of illegal or
  harmful content, data requests, complaints, appeals, and legal notices.
  Works without an account (reports must be open to anyone affected) and
  still works for suspended members, who need it to appeal.
*/
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const kind = z.enum(contactKinds).safeParse(formData.get("kind"));
  if (!kind.success) return { ok: false, message: "Choose what your message is about." };
  if (kind.data === "defamation") return sendDefamationNotice(formData);

  const parsed = schema.safeParse({
    kind: formData.get("kind"),
    name: field(formData, "name"),
    email: field(formData, "email"),
    url: field(formData, "url"),
    reason: field(formData, "reason"),
    message: formData.get("message"),
    turnstile_token: field(formData, "turnstile_token"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;

  const gate = await checkSender(data.email, data.turnstile_token);
  if (!gate.ok) return { ok: false, message: gate.message };

  const email = data.email || gate.userEmail || null;
  const message = data.reason ? `Reason: ${data.reason}\n\n${data.message}` : data.message;

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return unavailable;
  }
  const { data: row, error } = await admin
    .from("contact_messages")
    .insert({ kind: data.kind, name: data.name ?? null, email, url: data.url ?? null, message, user_id: gate.userId })
    .select("id")
    .single();
  if (error || !row) return unavailable;
  const reference = String(row.id).slice(0, 8).toUpperCase();
  await notify(reference, data.kind, email);
  return { ok: true, message: "Thanks. We have your message.", reference };
}

const unavailable: ContactState = { ok: false, message: "The form is not working right now. Try again later." };

/* The bot check for visitors without an account, and the shared rate limit. */
async function checkSender(email: string | undefined, token: string | undefined): Promise<{ ok: true; userId: string | null; userEmail: string | null } | { ok: false; message: string }> {
  const user = await getCurrentUser();
  const ip = clientIp(await headers());
  if (!user) {
    if (!email) return { ok: false, message: "Enter an email address so we can reply." };
    if (!(await verifyTurnstile(token, ip))) return { ok: false, message: "We could not confirm you are human. Reload and try again." };
  }
  if (!(await allowAction(`contact:${user?.id ?? ip}`, 8, "1 hour"))) return { ok: false, message: "You have sent a lot of messages. Try again in an hour." };
  return { ok: true, userId: user?.id ?? null, userEmail: user?.email ?? null };
}

/* Tell staff, and send the sender a receipt with their reference. Returns whether the receipt went. */
async function notify(reference: string, kind: string, email: string | null, missing?: string[]): Promise<boolean> {
  const staffInbox = siteConfig.legal.email ?? process.env.SEED_AUTHOR_EMAIL;
  if (staffInbox) {
    await sendEmail({
      to: staffInbox,
      subject: `[${kind}] New message ${reference}`,
      react: ContactReceivedEmail({ reference, kind, forStaff: true, adminUrl: `${siteConfig.url}/admin/messages` }),
    });
  }
  if (!email) return false;
  return sendEmail({ to: email, subject: `We have your message (${reference})`, react: ContactReceivedEmail({ reference, kind, forStaff: false, missing }) });
}

async function sendDefamationNotice(formData: FormData): Promise<ContactState> {
  const parsed = defamationSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    url: formData.get("url") ?? "",
    statement: formData.get("statement") ?? "",
    meaning: formData.get("meaning") ?? "",
    inaccuracies: formData.get("inaccuracies") ?? "",
    insufficient_info: field(formData, "insufficient_info"),
    consent_name: formData.get("consent_name") ?? undefined,
    consent_email: formData.get("consent_email") ?? undefined,
    previous_removals: formData.get("previous_removals") ?? "no",
    previous_details: field(formData, "previous_details"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const d = parsed.data;

  const gate = await checkSender(d.email, field(formData, "turnstile_token"));
  if (!gate.ok) return { ok: false, message: gate.message };

  const notice = {
    complainant_name: d.name,
    complainant_email: d.email,
    statement: d.statement,
    statement_url: d.url,
    meaning: d.meaning,
    inaccuracies: d.inaccuracies,
    insufficient_info_confirmed: d.insufficient_info === "yes",
    consent_share_name: d.consent_name,
    consent_share_email: d.consent_email,
    previous_removals: d.previous_removals,
    previous_details: d.previous_removals ? (d.previous_details ?? null) : null,
  };
  const missing = noticeProblems(notice);
  // The inbox shows the structured notice; this summary keeps the message list readable.
  const summary = `Defamation notice${missing.length ? " (incomplete)" : ""}.\n\nStatement complained of:\n${d.statement}`.slice(0, 5000);

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return unavailable;
  }
  const { data: row, error } = await admin
    .from("contact_messages")
    .insert({ kind: "defamation", name: d.name, email: d.email, url: d.url, message: summary, user_id: gate.userId })
    .select("id, created_at")
    .single();
  if (error || !row) return unavailable;
  const { data: stored, error: noticeError } = await admin
    .from("defamation_notices")
    .insert({ ...notice, message_id: row.id, received_at: row.created_at })
    .select("id")
    .single();
  if (noticeError || !stored) {
    // Do not leave half a notice behind: the sender will try again.
    await admin.from("contact_messages").delete().eq("id", row.id);
    return unavailable;
  }

  const reference = String(row.id).slice(0, 8).toUpperCase();
  const receiptSent = await notify(reference, "defamation", d.email, missing.length ? missing : undefined);
  // An incomplete notice needs a reply saying what is missing (reg 4); the receipt is that reply.
  if (missing.length && receiptSent) {
    await admin.from("defamation_notices").update({ complainant_acknowledged_at: new Date().toISOString() }).eq("id", stored.id);
  }
  return { ok: true, message: "Thanks. We have your complaint.", reference };
}

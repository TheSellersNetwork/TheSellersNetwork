import "server-only";
import { Resend } from "resend";
import type { ReactElement } from "react";

const from = process.env.EMAIL_FROM ?? "The Sellers Network <hello@example.test>";

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

/*
  Sends a React Email template. Returns false when Resend is not configured,
  so local development never tries to send and callers can still mark rows.
*/
export async function sendEmail(args: { to: string; subject: string; react: ReactElement; replyTo?: string }): Promise<boolean> {
  const resend = getClient();
  if (!resend) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email skipped] to=${args.to} subject=${args.subject}`);
    }
    return false;
  }
  const { error } = await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    react: args.react,
    replyTo: args.replyTo,
  });
  return !error;
}

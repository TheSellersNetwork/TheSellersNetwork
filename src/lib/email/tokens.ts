import { createHmac, timingSafeEqual } from "node:crypto";

/*
  Signed one-click unsubscribe tokens for member emails (digest, fee alerts).
  The token names the member and the email type and is signed with
  EMAIL_TOKEN_SECRET, so it works without signing in and cannot be forged or
  pointed at another member. Nothing is stored: a token stays valid until the
  secret changes, and using it twice is harmless.

  Format: <user id>.<kind>.<signature>, all URL safe.
*/

export type EmailKind = "digest" | "fees";
export const EMAIL_KINDS: EmailKind[] = ["digest", "fees"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function signature(secret: string, userId: string, kind: EmailKind): string {
  return createHmac("sha256", secret).update(`unsubscribe:${kind}:${userId}`).digest("base64url").slice(0, 32);
}

export function signUnsubscribeToken(secret: string, userId: string, kind: EmailKind): string {
  if (!secret) throw new Error("EMAIL_TOKEN_SECRET is not set");
  return `${userId}.${kind}.${signature(secret, userId, kind)}`;
}

/* The member and email type a token is for, or null if it is malformed or the signature does not match. */
export function verifyUnsubscribeToken(secret: string, token: string | null | undefined): { userId: string; kind: EmailKind } | null {
  if (!secret || !token || token.length > 120) return null;
  const [userId, kind, sig, ...rest] = token.split(".");
  if (rest.length > 0 || !userId || !kind || !sig) return null;
  if (!UUID.test(userId) || !(EMAIL_KINDS as string[]).includes(kind)) return null;
  const expected = Buffer.from(signature(secret, userId, kind as EmailKind));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { userId, kind: kind as EmailKind };
}

/* The secret from the environment. Empty when not configured, in which case member emails are not sent. */
export function emailTokenSecret(): string {
  return process.env.EMAIL_TOKEN_SECRET ?? "";
}

/* The visible link and the RFC 8058 headers for one member and email type. */
export function unsubscribeFor(siteUrl: string, secret: string, userId: string, kind: EmailKind): { url: string; headers: Record<string, string> } {
  const url = `${siteUrl}/email/unsubscribe?token=${signUnsubscribeToken(secret, userId, kind)}`;
  return { url, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
}

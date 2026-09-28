import "server-only";
import { PostHog } from "posthog-node";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key || key.startsWith("placeholder")) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export type ServerEvent = "signup" | "first_post" | "solution_marked" | "signup_form_submitted" | "partner_click";

/*
  Fire-and-forget server-side event. Silent when PostHog is not configured or
  the visitor has not accepted analytics. The id is always hashed, so an email
  address or account id never reaches PostHog.
*/
export async function trackServer(event: ServerEvent, properties: Record<string, unknown>, id: string) {
  const ph = getClient();
  if (!ph) return;
  try {
    if ((await cookies()).get("tsn-consent")?.value !== "analytics") return;
  } catch {
    return;
  }
  const distinctId = createHash("sha256").update(`${process.env.PLACEMENT_HASH_SALT ?? "tsn"}:${id.toLowerCase()}`).digest("hex").slice(0, 32);
  try {
    ph.capture({ distinctId, event, properties });
    await ph.flush();
  } catch {
    // Analytics must never break a request.
  }
}

import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  Sends a push notification to every device a member has turned push on for.
  Subscriptions the push service says are gone (404 or 410) are removed.
  Without VAPID keys this quietly does nothing, so local dev needs no setup.
*/

type Payload = { title: string; body: string; url: string; tag?: string };

let configured: boolean | null = null;

function configure(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  configured = !!(publicKey && privateKey && subject);
  if (configured) webpush.setVapidDetails(subject!, publicKey!, privateKey!);
  return configured;
}

export async function sendPush(userIds: string[], payload: Payload): Promise<void> {
  if (userIds.length === 0 || !configure()) return;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const { data: subs } = await admin.from("push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", userIds);
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }),
  );
}

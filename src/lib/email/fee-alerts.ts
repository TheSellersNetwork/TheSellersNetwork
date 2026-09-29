/*
  Fee change alerts: which changes are new and who should hear about each.
  Pure, so the rules are unit tested; the cron (fee-alerts-run.tsx) fetches,
  sends and records.

  - The first run records every existing change as 'baseline' and sends
    nothing, so members are not flooded with old news.
  - After that, a change file the cron has not seen before is 'sending'. Each
    opted-in member whose platforms include it gets one email, recorded in
    fee_alert_sends so a rerun never sends twice. Changes for "general"
    (everyone) go to every opted-in member.
  - A change becomes 'done' once every email for it has gone. Members who opt
    in later only get changes that arrive after they opted in.
*/

export const FEE_ALERT_PLATFORMS = ["ebay", "vinted", "amazon", "etsy", "depop", "tiktok-shop", "royal-mail", "evri", "hmrc"] as const;
export type FeeAlertPlatform = (typeof FEE_ALERT_PLATFORMS)[number];

export type SeenStatus = "baseline" | "sending" | "done";
export type SeenChange = { slug: string; status: SeenStatus };
export type ChangeInput = { slug: string; platform: string };
export type AlertMember = { id: string; platforms: string[] };

export type FeeAlertPlan = {
  /* Rows to add to fee_changes_seen. */
  newSeen: { slug: string; platform: string; status: SeenStatus }[];
  /* One email each. */
  deliveries: { userId: string; slug: string }[];
  /* Changes being sent this run. A change is marked done when all of its deliveries succeed. */
  sending: string[];
};

export function isFeeAlertPlatform(value: string): value is FeeAlertPlatform {
  return (FEE_ALERT_PLATFORMS as readonly string[]).includes(value);
}

export function planFeeAlerts(args: { changes: ChangeInput[]; seen: SeenChange[]; members: AlertMember[]; sent: Set<string> }): FeeAlertPlan {
  const { changes, seen, members, sent } = args;
  const firstRun = seen.length === 0;
  const status = new Map(seen.map((s) => [s.slug, s.status]));

  const newSeen = changes
    .filter((c) => !status.has(c.slug))
    .map((c) => ({ slug: c.slug, platform: c.platform, status: (firstRun ? "baseline" : "sending") as SeenStatus }));
  for (const s of newSeen) status.set(s.slug, s.status);

  const sending = changes.filter((c) => status.get(c.slug) === "sending");
  const deliveries: FeeAlertPlan["deliveries"] = [];
  for (const change of sending) {
    for (const m of members) {
      const wants = change.platform === "general" || m.platforms.includes(change.platform);
      if (wants && !sent.has(sendKey(m.id, change.slug))) deliveries.push({ userId: m.id, slug: change.slug });
    }
  }
  return { newSeen, deliveries, sending: sending.map((c) => c.slug) };
}

export function sendKey(userId: string, slug: string): string {
  return `${userId}:${slug}`;
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailsFor } from "@/lib/supabase/find-user";
import { sendEmail } from "@/lib/email/send";
import { isMissingTable, pause } from "@/lib/email/cron-auth";
import { planFeeAlerts, sendKey, type SeenChange } from "@/lib/email/fee-alerts";
import { emailTokenSecret, unsubscribeFor } from "@/lib/email/tokens";
import { FeeAlertEmail } from "@/emails/fee-alert-email";
import { getChanges } from "@/lib/content/changes";
import { effectiveStatus, formatChangeDate, platformLabels, type ChangeMeta } from "@/lib/tools/changes";
import { siteConfig } from "@/lib/site";

/*
  Daily: emails members about fee and policy changes (content/changes/*.mdx)
  for the platforms they chose. See src/lib/email/fee-alerts.ts for the rules.
*/
export async function runFeeAlerts(): Promise<Record<string, unknown>> {
  const secret = emailTokenSecret();
  if (!secret) return { message: "EMAIL_TOKEN_SECRET is not set, so no alerts were sent" };
  const admin = createAdminClient();

  const { data: seenRows, error } = await admin.from("fee_changes_seen").select("slug, status");
  if (error) return { message: isMissingTable(error) ? "Migration 20260930000100 is not applied yet" : error.message };

  const changes = await getChanges();
  const { data: prefs } = await admin.from("member_email_prefs").select("user_id, fee_alert_platforms").eq("fee_alerts", true);
  const members = (prefs ?? []).map((p) => ({ id: p.user_id as string, platforms: (p.fee_alert_platforms as string[] | null) ?? [] }));
  const { data: sentRows } = await admin.from("fee_alert_sends").select("user_id, change_slug");
  const sent = new Set((sentRows ?? []).map((r) => sendKey(r.user_id as string, r.change_slug as string)));

  const plan = planFeeAlerts({ changes, seen: (seenRows ?? []) as SeenChange[], members, sent });

  if (plan.newSeen.length > 0) {
    const { error: insertError } = await admin.from("fee_changes_seen").upsert(plan.newSeen, { onConflict: "slug", ignoreDuplicates: true });
    if (insertError) return { message: insertError.message };
  }

  const bySlug = new Map(changes.map((c) => [c.slug, c]));
  const emails = await emailsFor(admin, Array.from(new Set(plan.deliveries.map((d) => d.userId))));
  const failedSlugs = new Set<string>();
  let delivered = 0;
  for (const d of plan.deliveries) {
    const change = bySlug.get(d.slug);
    const to = emails.get(d.userId);
    if (!change || !to) continue;
    const platform = platformLabels[change.platform] ?? change.platform;
    const unsubscribe = unsubscribeFor(siteConfig.url, secret, d.userId, "fees");
    const ok = await sendEmail({
      to,
      subject: `${platform === "Everyone" ? "Fee change" : platform}: ${change.title}`,
      headers: unsubscribe.headers,
      react: (
        <FeeAlertEmail
          platform={platform}
          title={change.title}
          summary={change.summary}
          when={whenText(change)}
          url={`${siteConfig.url}/changes/${change.slug}`}
          unsubscribeUrl={unsubscribe.url}
          settingsUrl={`${siteConfig.url}/account#email-preferences`}
        />
      ),
    });
    if (ok) {
      delivered += 1;
      await admin.from("fee_alert_sends").insert({ user_id: d.userId, change_slug: d.slug });
    } else {
      failedSlugs.add(d.slug);
    }
    await pause(550);
  }

  const finished = plan.sending.filter((slug) => !failedSlugs.has(slug));
  if (finished.length > 0) await admin.from("fee_changes_seen").update({ status: "done", done_at: new Date().toISOString() }).in("slug", finished);

  return {
    recorded: plan.newSeen.length,
    baseline: plan.newSeen.filter((s) => s.status === "baseline").length,
    sending: plan.sending,
    delivered,
    failed: Array.from(failedSlugs),
  };
}

/* "Takes effect 1 October 2026", "In effect from ..." or "Announced 11 March 2025", matching the change page. */
function whenText(change: ChangeMeta): string | null {
  if (change.date === "1970-01-01") return null;
  const status = effectiveStatus(change);
  if (status === "announced") return `Announced ${formatChangeDate(change.date)}.`;
  return status === "coming" ? `Takes effect ${formatChangeDate(change.date)}.` : `In effect from ${formatChangeDate(change.date)}.`;
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isMissingTable } from "@/lib/email/cron-auth";

export type EmailPrefs = {
  weekly_digest: boolean;
  fee_alerts: boolean;
  fee_alert_platforms: string[];
  weekly_digest_changed_at: string | null;
  fee_alerts_changed_at: string | null;
};

/* Opt-in: everything starts off. */
export const DEFAULT_PREFS: EmailPrefs = { weekly_digest: false, fee_alerts: false, fee_alert_platforms: [], weekly_digest_changed_at: null, fee_alerts_changed_at: null };

/* The member's email choices, or null when the migration is not applied yet and the settings should stay hidden. */
export async function getEmailPrefs(userId: string): Promise<EmailPrefs | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("member_email_prefs")
    .select("weekly_digest, fee_alerts, fee_alert_platforms, weekly_digest_changed_at, fee_alerts_changed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return isMissingTable(error) ? null : DEFAULT_PREFS;
  return (data as EmailPrefs | null) ?? DEFAULT_PREFS;
}

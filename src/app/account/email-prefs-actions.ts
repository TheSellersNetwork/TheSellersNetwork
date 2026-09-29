"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/errors";
import { isMissingTable } from "@/lib/email/cron-auth";
import { FEE_ALERT_PLATFORMS } from "@/lib/email/fee-alerts";

export type EmailPrefsState = { ok: boolean; message: string };

const schema = z.object({
  weekly_digest: z.enum(["on", "off"]),
  fee_alerts: z.enum(["on", "off"]),
  fee_alert_platforms: z.array(z.enum(FEE_ALERT_PLATFORMS)).max(FEE_ALERT_PLATFORMS.length),
});

/*
  Saves the weekly digest and fee alert choices. The database stamps the time
  of each change as the consent record, so nothing here sets a timestamp.
*/
export async function saveEmailPrefs(_prev: EmailPrefsState, formData: FormData): Promise<EmailPrefsState> {
  const parsed = schema.safeParse({
    weekly_digest: formData.get("weekly_digest"),
    fee_alerts: formData.get("fee_alerts"),
    fee_alert_platforms: formData.getAll("fee_alert_platforms"),
  });
  if (!parsed.success) return { ok: false, message: "Those settings could not be read. Refresh the page and try again." };
  const feeAlerts = parsed.data.fee_alerts === "on";
  const platforms = Array.from(new Set(parsed.data.fee_alert_platforms));
  if (feeAlerts && platforms.length === 0) return { ok: false, message: "Choose at least one platform for fee change alerts, or switch them off." };

  const user = await requireUser("/account");
  const supabase = await createClient();
  const { error } = await supabase.from("member_email_prefs").upsert(
    {
      user_id: user.id,
      weekly_digest: parsed.data.weekly_digest === "on",
      fee_alerts: feeAlerts,
      fee_alert_platforms: platforms,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, message: isMissingTable(error) ? "Email updates are not switched on yet." : friendlyError(error) };
  revalidatePath("/account");
  return { ok: true, message: "Email settings saved." };
}

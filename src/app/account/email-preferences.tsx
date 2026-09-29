"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveEmailPrefs, type EmailPrefsState } from "@/app/account/email-prefs-actions";
import { TagFollowButton } from "@/components/forum/tag-follow-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { FEE_ALERT_PLATFORMS } from "@/lib/email/fee-alerts";
import { platformLabels } from "@/lib/tools/changes";
import { urls } from "@/lib/forum/urls";

type Props = {
  initial: { weekly_digest: boolean; fee_alerts: boolean; fee_alert_platforms: string[] };
  /* Null when following tags is not available yet. */
  tags: { id: string; slug: string; name: string }[] | null;
};

/*
  Account settings for the two opt-in emails and the tags a member follows.
  Both emails start off. Saving records the time of the choice.
*/
export function EmailPreferences({ initial, tags }: Props) {
  const [state, action, pending] = useActionState<EmailPrefsState, FormData>(saveEmailPrefs, { ok: false, message: "" });
  const [digest, setDigest] = useState(initial.weekly_digest);
  const [fees, setFees] = useState(initial.fee_alerts);
  const [platforms, setPlatforms] = useState<string[]>(initial.fee_alert_platforms);

  return (
    <section id="email-preferences" aria-labelledby="email-preferences-heading" className="mt-12 scroll-mt-24">
      <h2 id="email-preferences-heading" className="text-lg font-semibold">
        Email updates
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Both are off unless you switch them on. Every email has a one-click unsubscribe link.</p>

      <form action={action} className="mt-4 space-y-6" data-testid="email-preferences">
        <input type="hidden" name="weekly_digest" value={digest ? "on" : "off"} />
        <input type="hidden" name="fee_alerts" value={fees ? "on" : "off"} />

        <div className="flex items-start justify-between gap-4">
          <div className="text-sm">
            <label htmlFor="weekly-digest" className="font-medium">
              Weekly digest
            </label>
            <p id="weekly-digest-hint" className="mt-0.5 text-muted-foreground">
              Monday mornings: new topics in the forums and tags you follow, replies to your topics you have not seen, and the numbers thread. Nothing is sent in a quiet week.
            </p>
          </div>
          <Switch id="weekly-digest" checked={digest} onCheckedChange={setDigest} aria-describedby="weekly-digest-hint" />
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <div className="text-sm">
              <label htmlFor="fee-alerts" className="font-medium">
                Fee change alerts
              </label>
              <p id="fee-alerts-hint" className="mt-0.5 text-muted-foreground">
                One email when we post a new fee or policy change for a platform you choose, plus changes that affect every seller.
              </p>
            </div>
            <Switch id="fee-alerts" checked={fees} onCheckedChange={setFees} aria-describedby="fee-alerts-hint" aria-controls="fee-alert-platforms" />
          </div>
          <fieldset id="fee-alert-platforms" className="mt-3 rounded-lg border p-3" disabled={!fees} hidden={!fees}>
            <legend className="px-1 text-sm font-medium">Platforms</legend>
            <div className="grid gap-1 sm:grid-cols-3">
              {FEE_ALERT_PLATFORMS.map((p) => (
                <label key={p} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-8">
                  <Checkbox
                    name="fee_alert_platforms"
                    value={p}
                    checked={platforms.includes(p)}
                    onCheckedChange={(v) => setPlatforms((s) => (v ? [...s, p] : s.filter((x) => x !== p)))}
                  />
                  {platformLabels[p]}
                </label>
              ))}
            </div>
          </fieldset>
          {/* A hidden fieldset submits nothing, so keep the choice when alerts are off. */}
          {!fees ? platforms.map((p) => <input key={p} type="hidden" name="fee_alert_platforms" value={p} />) : null}
        </div>

        {state.message ? (
          <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"} role={state.ok ? "status" : "alert"}>
            {state.message}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save email settings"}
        </Button>
      </form>

      {tags ? (
        <div className="mt-10" data-testid="followed-tags">
          <h3 className="font-semibold">Followed tags</h3>
          <p className="mt-1 text-sm text-muted-foreground">New topics with these tags show in your notifications and, if it is on, your weekly digest.</p>
          {tags.length === 0 ? (
            <p className="mt-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              You do not follow any tags yet. Follow one from a tag page or from the sidebar of a topic that has tags.
            </p>
          ) : (
            <ul className="mt-3 divide-y rounded-lg border bg-card">
              {tags.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <Link href={urls.tag(t.slug)} className="min-w-0 truncate font-medium hover:underline">
                    {t.name}
                  </Link>
                  <TagFollowButton tagId={t.id} tagName={t.name} following signedIn compact />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}

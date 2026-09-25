"use client";

import { useActionState, useState } from "react";
import { updateAccount, type AccountState } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { siteConfig } from "@/lib/site";
import { FlairEditor } from "@/components/auth/flair-editor";
import type { Flair } from "@/lib/db/types";

type Initial = {
  username: string;
  display_name: string;
  bio: string;
  marketplaces: string[];
  email_on_reply: boolean;
  email_on_mention: boolean;
  email_digest: boolean;
  flair: Flair[];
};

export function AccountForm({ initial }: { initial: Initial }) {
  const [state, action, pending] = useActionState<AccountState, FormData>(updateAccount, { ok: false, message: "" });
  const [prefs, setPrefs] = useState({ reply: initial.email_on_reply, mention: initial.email_on_mention, digest: initial.email_digest });
  const [marketplaces, setMarketplaces] = useState<string[]>(initial.marketplaces);

  return (
    <form action={action} className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={initial.username} required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_]{2,29}" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input id="display_name" name="display_name" defaultValue={initial.display_name} maxLength={60} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={500} rows={3} />
        </div>
        <fieldset>
          <legend className="text-sm font-medium">Where you sell</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {siteConfig.marketplaces.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="marketplaces" value={m.id} checked={marketplaces.includes(m.id)} onCheckedChange={(v) => setMarketplaces((s) => (v ? [...s, m.id] : s.filter((x) => x !== m.id)))} />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <h3 className="text-sm font-medium">Flair</h3>
          <p className="mb-2 text-xs text-muted-foreground">Optional. How long you have sold on each platform and a short label.</p>
          <FlairEditor flair={initial.flair} marketplaces={marketplaces} />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Email notifications</h2>
        <p className="text-sm text-muted-foreground">The bell in the header always shows everything. These control email only.</p>
        <input type="hidden" name="email_on_reply" value={prefs.reply ? "on" : "off"} />
        <input type="hidden" name="email_on_mention" value={prefs.mention ? "on" : "off"} />
        <input type="hidden" name="email_digest" value={prefs.digest ? "on" : "off"} />
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>Replies to topics I am watching</span>
            <Switch checked={prefs.reply} onCheckedChange={(v) => setPrefs((p) => ({ ...p, reply: v }))} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>When someone mentions me</span>
            <Switch checked={prefs.mention} onCheckedChange={(v) => setPrefs((p) => ({ ...p, mention: v }))} />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>Weekly digest</span>
            <Switch checked={prefs.digest} onCheckedChange={(v) => setPrefs((p) => ({ ...p, digest: v }))} />
          </label>
        </div>
      </section>

      {state.message ? (
        <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"} role={state.ok ? "status" : "alert"}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Save changes"}
      </Button>
    </form>
  );
}

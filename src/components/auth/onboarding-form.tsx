"use client";

import { useActionState, useState } from "react";
import { completeOnboarding, type OnboardingState } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { houseRules } from "@/content/house-rules";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

type Initial = { username: string; display_name: string; marketplaces: string[]; bio: string };

/*
  Three steps on one page: who you are, where you sell (any number), and the
  house rules. Real name or username is the member's choice: the display name
  is optional and free text.
*/
export function OnboardingForm({ next, initial }: { next: string; initial: Initial }) {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(completeOnboarding, { ok: false, message: "" });
  const [selected, setSelected] = useState<string[]>(initial.marketplaces);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <form action={action} className="space-y-10">
      <input type="hidden" name="next" value={next} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">1. Your name</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" defaultValue={initial.username} required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_]{2,29}" />
            <p className="text-xs text-muted-foreground">For @mentions and your profile link.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Display name (optional)</Label>
            <Input id="display_name" name="display_name" defaultValue={initial.display_name} maxLength={60} placeholder="Your real name or shop name" />
            <p className="text-xs text-muted-foreground">Shown next to your posts. Leave blank to show your username.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">2. Where do you sell?</h2>
        <p className="text-sm text-muted-foreground">Pick as many as apply. You can change this later.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {siteConfig.marketplaces.map((m) => {
            const checked = selected.includes(m.id);
            return (
              <label key={m.id} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm hover:bg-secondary", checked && "border-brand bg-brand-soft")}>
                <Checkbox name="marketplaces" value={m.id} checked={checked} onCheckedChange={() => toggle(m.id)} />
                {m.label}
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">3. House rules</h2>
        <ol className="space-y-2 rounded-lg border bg-card p-4 text-sm">
          {houseRules.map((rule, i) => (
            <li key={rule.title} className="flex gap-2">
              <span className="w-4 shrink-0 text-muted-foreground">{i + 1}.</span>
              <span>
                <strong>{rule.title}</strong> {rule.body}
              </span>
            </li>
          ))}
        </ol>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <Checkbox name="accept_rules" value="yes" required className="mt-0.5" />
          <span>I have read the house rules and will follow them.</span>
        </label>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">4. Introduce yourself (optional)</h2>
        <div className="space-y-1.5">
          <Label htmlFor="bio">A line or two for your profile</Label>
          <Textarea id="bio" name="bio" defaultValue={initial.bio} maxLength={500} rows={3} placeholder="What you sell, how long you have been at it, what you are working on." />
        </div>
      </section>

      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving" : "Finish and enter the community"}
      </Button>
    </form>
  );
}

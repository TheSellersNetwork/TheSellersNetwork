"use client";

import { useActionState } from "react";
import { subscribeToCourse } from "@/app/actions/email-signup";
import { track } from "@/lib/analytics/client";
import { landingContext } from "@/components/analytics/landing-tracker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  source: string;
  variant?: "card" | "inline";
  className?: string;
};

/*
  The free 7-day email course capture. Appears in the right rail, under
  solved answers and at the end of every blog post. The source page is
  stored with the subscriber and sent to PostHog.
*/
export function EmailSignupCard({ source, variant = "card", className }: Props) {
  const [state, action, pending] = useActionState(
    async (prev: { ok: boolean; message: string }, formData: FormData) => {
      const result = await subscribeToCourse(prev, formData);
      if (result.ok) track("signup_form_submitted", { source, ...landingContext() });
      return result;
    },
    { ok: false, message: "" },
  );

  return (
    <div className={cn(variant === "card" ? "forum-card rail-card rounded-lg border bg-card p-4" : "rounded-lg bg-brand-soft p-5", className)}>
      <h2 className="font-semibold">[TOM: email course headline]</h2>
      <p className="mt-1 text-sm text-muted-foreground">[TOM: one line on what the 7 daily emails fix]</p>
      {state.ok ? (
        <p className="mt-3 text-sm" role="status">
          {state.message}
        </p>
      ) : (
        <form action={action} className="mt-3 flex flex-col gap-2">
          <input type="hidden" name="source" value={source} />
          <Label htmlFor={`email-${source}`} className="sr-only">
            Email address
          </Label>
          <Input id={`email-${source}`} name="email" type="email" required autoComplete="email" placeholder="you@example.co.uk" />
          <Button type="submit" disabled={pending}>
            {pending ? "Sending" : "Start the free course"}
          </Button>
          {state.message ? (
            <p className="text-sm text-destructive" role="alert">
              {state.message}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground">One email a day for seven days. Unsubscribe any time.</p>
        </form>
      )}
    </div>
  );
}

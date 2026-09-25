"use client";

import { useActionState, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { signUp, type SignupState } from "@/app/(auth)/signup/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics/client";
import { landingContext } from "@/components/analytics/landing-tracker";

export function SignupForm({ turnstileSiteKey }: { turnstileSiteKey: string | null }) {
  const [token, setToken] = useState("");
  const [state, action, pending] = useActionState<SignupState, FormData>(
    async (prev, formData) => {
      const result = await signUp(prev, formData);
      if (result.ok) track("signup", landingContext());
      return result;
    },
    { ok: false, message: "" },
  );

  if (state.ok) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm" role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={30} pattern="[a-z0-9][a-z0-9_]{2,29}" placeholder="lowercase, numbers and underscores" />
        <p className="text-xs text-muted-foreground">Used for @mentions and your profile link. You can add a display name next.</p>
      </div>
      {turnstileSiteKey ? (
        <Turnstile siteKey={turnstileSiteKey} onSuccess={setToken} onExpire={() => setToken("")} options={{ theme: "auto" }} />
      ) : null}
      <input type="hidden" name="turnstile_token" value={token} />
      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending || (!!turnstileSiteKey && !token)}>
        {pending ? "Creating your account" : "Create account"}
      </Button>
      <p className="text-xs text-muted-foreground">By joining you agree to the house rules and privacy policy.</p>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { signUp, type SignupState } from "@/app/(auth)/signup/actions";
import { VerifyCode } from "@/components/auth/verify-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { track } from "@/lib/analytics/client";
import { landingContext } from "@/components/analytics/landing-tracker";

export function SignupForm({ turnstileSiteKey, next = "/community" }: { turnstileSiteKey: string | null; next?: string }) {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [state, action, pending] = useActionState<SignupState, FormData>(
    async (prev, formData) => {
      const result = await signUp(prev, formData);
      if (result.ok) track("signup", landingContext());
      return result;
    },
    { ok: false, message: "" },
  );

  if (state.ok) {
    return <VerifyCode email={email} type="signup" next={next} />;
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value.trim())} />
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
      <div className="space-y-2 text-sm">
        <label className="flex items-start gap-2">
          <input type="checkbox" name="age" required className="mt-1 size-4 accent-[var(--brand)]" />
          <span>I am 18 or over.</span>
        </label>
        <label className="flex items-start gap-2">
          <input type="checkbox" name="terms" required className="mt-1 size-4 accent-[var(--brand)]" />
          <span>
            I agree to the{" "}
            <a href="/terms" target="_blank" className="underline">
              terms
            </a>{" "}
            and{" "}
            <a href="/community/rules" target="_blank" className="underline">
              house rules
            </a>
            , and I have read the{" "}
            <a href="/privacy" target="_blank" className="underline">
              privacy policy
            </a>
            .
          </span>
        </label>
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
      <p className="text-xs text-muted-foreground">We will email you a 6-digit code to confirm the address.</p>
    </form>
  );
}

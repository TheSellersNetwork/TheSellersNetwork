"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { OtpInput, maskEmail } from "@/components/auth/otp-input";
import { createClient } from "@/lib/supabase/client";

type Props = {
  email: string;
  /* signup after creating an account, email for a code sign-in. */
  type: Extract<EmailOtpType, "signup" | "email">;
  next: string;
  onBack?: () => void;
};

/*
  "We've sent a code to a****@gmail.com": enter it and you are in. Works for
  sign up (the code confirms the address) and for passwordless sign in.
  The link in the same email still works for anyone who prefers to click.
*/
export function VerifyCode({ email, type, next, onBack }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "checking" | "error" | "done">("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(30);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  async function verify(code: string) {
    setStatus("checking");
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type });
    if (error) {
      setStatus("error");
      setMessage(error.message.toLowerCase().includes("expired") ? "That code has expired. Send a new one." : "That code is not right. Check the email and try again.");
      setAttempt((a) => a + 1);
      return;
    }
    setStatus("done");
    router.push(type === "signup" ? `/onboarding?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  }

  async function resend() {
    const supabase = createClient();
    setMessage("");
    const { error } =
      type === "signup"
        ? await supabase.auth.resend({ type: "signup", email })
        : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (error) {
      setMessage("We could not send another code just now. Wait a minute and try again.");
      return;
    }
    setCooldown(30);
    setMessage("A new code is on its way.");
    setStatus("idle");
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Verify your email</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&rsquo;ve sent a code to <span className="font-medium text-foreground">{maskEmail(email)}</span>. It may take a minute and can land in spam.
        </p>
      </div>
      <OtpInput key={attempt} onComplete={verify} disabled={status === "checking" || status === "done"} error={status === "error"} />
      <p className={status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role="status" aria-live="polite">
        {status === "checking" ? "Checking" : status === "done" ? "Verified. Taking you in." : message}
      </p>
      <p className="text-sm text-muted-foreground">
        Didn&rsquo;t receive a code?{" "}
        {cooldown > 0 ? (
          <span>Resend in {cooldown}s</span>
        ) : (
          <button type="button" onClick={resend} className="font-medium text-brand underline underline-offset-2 hover:text-brand-deep">
            Resend
          </button>
        )}
        {onBack ? (
          <>
            {" · "}
            <button type="button" onClick={onBack} className="underline underline-offset-2 hover:text-foreground">
              Use a different email
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

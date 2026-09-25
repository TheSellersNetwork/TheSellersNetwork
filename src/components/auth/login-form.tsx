"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VerifyCode } from "@/components/auth/verify-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/* Email and password, or a 6-digit code emailed to you. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "code">("password");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    const address = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();
    setEmail(address);

    if (mode === "code") {
      const { error: codeError } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: false } });
      setPending(false);
      if (codeError) setError(codeError.message.toLowerCase().includes("signups not allowed") ? "No account with that email. Create one first." : "We could not send the code. Check the address and try again.");
      else setCodeSent(true);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: address, password });
    setPending(false);
    if (signInError) {
      setError("That email and password do not match.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (codeSent) {
    return <VerifyCode email={email} type="email" next={next} onBack={() => setCodeSent(false)} />;
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={email} />
      </div>
      {mode === "password" ? (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">We will email you a 6-digit code. No password needed.</p>
      )}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "One moment" : mode === "password" ? "Sign in" : "Email me a code"}
      </Button>
      <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={() => setMode(mode === "password" ? "code" : "password")}>
        {mode === "password" ? "Sign in with a code instead" : "Use a password instead"}
      </button>
    </form>
  );
}

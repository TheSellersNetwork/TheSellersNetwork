"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/* Email and password, with a magic link fallback for members who prefer it. */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "link">("password");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const supabase = createClient();

    if (mode === "link") {
      const { error: linkError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      setPending(false);
      if (linkError) setError("We could not send the link. Check the address and try again.");
      else setSent(true);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError("That email and password do not match.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  if (sent) {
    return (
      <p className="rounded-lg border bg-card p-4 text-sm" role="status">
        Check your inbox for a sign in link. It works for one hour.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {mode === "password" ? (
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required minLength={8} />
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in" : mode === "password" ? "Sign in" : "Email me a sign in link"}
      </Button>
      <button type="button" className="block w-full text-center text-sm text-muted-foreground hover:text-foreground hover:underline" onClick={() => setMode(mode === "password" ? "link" : "password")}>
        {mode === "password" ? "Use a sign in link instead" : "Use a password instead"}
      </button>
    </form>
  );
}

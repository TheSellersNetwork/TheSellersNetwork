import type { Metadata } from "next";
import Link from "next/link";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Newsletter", robots: { index: false } };
export const dynamic = "force-dynamic";

/* The link in the confirmation email. Turns a pending sign-up into an active one. */
export default async function ConfirmPage({ searchParams }: PageProps<"/newsletter/confirm">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(sp.token) ? sp.token : null;
  let ok = false;
  if (token) {
    try {
      // A fresh token replaces the used one and becomes the unsubscribe key.
      const { data } = await createAdminClient()
        .from("email_subscribers")
        .update({ status: "active", confirmed_at: new Date().toISOString(), confirm_token: randomBytes(24).toString("base64url") })
        .eq("confirm_token", token)
        .eq("status", "pending")
        .select("id");
      ok = (data?.length ?? 0) > 0;
    } catch {
      ok = false;
    }
  }
  return (
    <main id="main" className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{ok ? "You are on the list" : "That link has expired"}</h1>
      <p className="mt-3 text-muted-foreground">
        {ok
          ? "Thanks for confirming. Every email has an unsubscribe link at the bottom."
          : "It may have been used already, or be more than 30 days old. Sign up again and we will send a fresh one."}
      </p>
      <Link href={ok ? "/community" : "/newsletter"} className="mt-6 inline-block underline">
        {ok ? "Go to the forums" : "Back to the newsletter page"}
      </Link>
    </main>
  );
}

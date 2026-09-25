import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Join", robots: { index: false } };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.profile.onboarded_at ? urls.community() : urls.onboarding());

  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Join The Sellers Network</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free, for anyone who buys and sells for profit in the UK. Already a member?{" "}
        <Link href={urls.login()} className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
      <div className="mt-6">
        <SignupForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} />
      </div>
    </main>
  );
}

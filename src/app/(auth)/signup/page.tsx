import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Join", robots: { index: false } };

/* ?next= brings people back to where they started (a debate vote, a question) once they have joined. */
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next, urls.community());
  const user = await getCurrentUser();
  if (user) redirect(user.profile.onboarded_at ? next : `${urls.onboarding()}?next=${encodeURIComponent(next)}`);

  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Join The Sellers Network</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Free, for anyone who buys and sells for profit in the UK. Already a member?{" "}
        <Link href={urls.login()} className="text-brand underline underline-offset-2 hover:text-brand-deep">
          Sign in
        </Link>
      </p>
      <div className="mt-6">
        <SignupForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} next={next} />
      </div>
    </main>
  );
}

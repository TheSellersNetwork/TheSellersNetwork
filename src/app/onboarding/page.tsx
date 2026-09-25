import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { requireUser } from "@/lib/auth";
import { urls } from "@/lib/forum/urls";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") ? sp.next : urls.community();
  const user = await requireUser(urls.onboarding());
  if (user.profile.onboarded_at) redirect(next);

  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome</h1>
      <p className="mt-1 text-muted-foreground">Three quick things and you are in. Takes about a minute.</p>
      <div className="mt-8">
        <OnboardingForm
          next={next}
          initial={{
            username: user.profile.username,
            display_name: user.profile.display_name ?? "",
            marketplaces: user.profile.marketplaces,
            bio: user.profile.bio ?? "",
          }}
        />
      </div>
    </main>
  );
}

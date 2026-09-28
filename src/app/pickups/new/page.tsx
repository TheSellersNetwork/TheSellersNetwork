import type { Metadata } from "next";
import Link from "next/link";
import { PickupForm } from "@/components/pickups/pickup-form";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Post a pickup", robots: { index: false } };

export default async function NewPickupPage() {
  const user = await requireOnboardedUser("/pickups/new");
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/pickups" className="hover:underline">
          Pickups
        </Link>
      </nav>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Post a pickup</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share what you found and what you paid. When it sells, come back and add the price: that is what makes the BOLO list work.</p>
      {!user.emailConfirmed ? <p className="mt-4 text-sm text-destructive">Confirm your email address before posting.</p> : null}
      <div className="mt-6">
        <PickupForm />
      </div>
    </main>
  );
}

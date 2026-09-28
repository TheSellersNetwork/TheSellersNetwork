import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { PickupForm } from "@/components/pickups/pickup-form";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Post a pickup", robots: { index: false } };

export default async function NewPickupPage() {
  const user = await requireOnboardedUser("/community/pickups/new");
  return (
    <ForumShell source="/community/pickups/new" activeNav="pickups">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/community" className="hover:underline">
          Community
        </Link>
        {" / "}
        <Link href="/community/pickups" className="hover:underline">
          Pickups
        </Link>
      </nav>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Post a pickup</h1>
      <p className="mt-1 text-sm text-muted-foreground">Share what you found and what you paid. When it sells, come back and add the price: that is what makes the BOLO list work.</p>
      {!user.emailConfirmed ? <p className="mt-4 text-sm text-destructive">Confirm your email address before posting.</p> : null}
      <div className="mt-6">
        <PickupForm />
      </div>
    </ForumShell>
  );
}

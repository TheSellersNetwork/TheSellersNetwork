import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { Plus, Search } from "lucide-react";
import { PickupMasonry } from "@/components/pickups/pickup-masonry";
import { PickupFilters } from "@/components/pickups/pickup-filters";
import { SoldThisMonth } from "@/components/pickups/sold-this-month";
import { getPickups, getPickupTotals } from "@/lib/pickups-queries";
import { pickupCategories, pickupSources } from "@/lib/pickups";

export const metadata: Metadata = {
  title: "Pickups",
  description: "What UK resellers are finding at car boots, charity shops and clearance, what they paid, and what it sold for.",
  alternates: { canonical: "/community/pickups" },
};
export const dynamic = "force-dynamic";

export default async function PickupsPage({ searchParams }: PageProps<"/community/pickups">) {
  const raw = await searchParams;
  const sp = {
    category: typeof raw.category === "string" && raw.category in pickupCategories ? raw.category : undefined,
    source: typeof raw.source === "string" && raw.source in pickupSources ? raw.source : undefined,
    sold: raw.sold === "1" ? "1" : undefined,
    brand: typeof raw.brand === "string" && raw.brand.trim() ? raw.brand.trim().slice(0, 60) : undefined,
  };
  const filtered = !!(sp.category || sp.source || sp.sold || sp.brand);
  const [pickups, totals] = await Promise.all([getPickups({ category: sp.category, source: sp.source, sold: sp.sold === "1", brand: sp.brand }), getPickupTotals()]);

  return (
    <ForumShell source="/community/pickups" activeNav="pickups">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
            <Link href="/community" className="hover:underline">
              Community
            </Link>
          </nav>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pickups</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            What members are finding, what they paid, where, and what it sold for. Add the sold price when it goes and everyone learns what is worth picking up.
          </p>
          {totals.count > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {totals.count} {totals.count === 1 ? "pickup" : "pickups"} shared, {totals.sold} with a sold price.
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Link href="/community/pickups/bolo" className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 py-2 text-sm sm:min-h-0 font-medium hover:bg-secondary">
            <Search className="size-4" aria-hidden="true" /> BOLO list
          </Link>
          <Link href="/community/pickups/new" className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-3 py-2 sm:min-h-0 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            <Plus className="size-4" aria-hidden="true" /> Post a pickup
          </Link>
        </div>
      </div>

      <SoldThisMonth />

      {totals.count > 0 ? <PickupFilters sp={sp} /> : null}

      {pickups.length === 0 ? (
        filtered ? (
          <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
            <p className="font-medium">No pickups match these filters.</p>
            <p className="mt-1 text-sm text-muted-foreground">Try fewer filters, or a shorter brand name.</p>
            <Link href="/community/pickups" className="mt-4 inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium hover:bg-secondary sm:min-h-9">
              Show all pickups
            </Link>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed p-10 text-center">
            <p className="font-medium">No pickups here yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">Been to a car boot or charity shop lately? Share what you found and what you paid.</p>
            <Link href="/community/pickups/new" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85 sm:min-h-9">
              Post the first one
            </Link>
          </div>
        )
      ) : (
        <>
          <p className="sr-only" aria-live="polite">
            {pickups.length} {pickups.length === 1 ? "pickup" : "pickups"} shown
          </p>
          <PickupMasonry pickups={pickups} className="mt-4" />
        </>
      )}
    </ForumShell>
  );
}

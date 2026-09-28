import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { PickupCard } from "@/components/pickups/pickup-card";
import { getPickups, getPickupTotals } from "@/lib/pickups-queries";
import { pickupCategories, pickupSources } from "@/lib/pickups";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pickups",
  description: "What UK resellers are finding at car boots, charity shops and clearance, what they paid, and what it sold for.",
  alternates: { canonical: "/pickups" },
};
export const dynamic = "force-dynamic";

function href(sp: Record<string, string | undefined>, change: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...change })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `/pickups?${s}` : "/pickups";
}

export default async function PickupsPage({ searchParams }: PageProps<"/pickups">) {
  const raw = await searchParams;
  const sp = {
    category: typeof raw.category === "string" && raw.category in pickupCategories ? raw.category : undefined,
    source: typeof raw.source === "string" && raw.source in pickupSources ? raw.source : undefined,
    sold: raw.sold === "1" ? "1" : undefined,
    brand: typeof raw.brand === "string" ? raw.brand.slice(0, 60) : undefined,
  };
  const [pickups, totals] = await Promise.all([getPickups({ category: sp.category, source: sp.source, sold: sp.sold === "1", brand: sp.brand }), getPickupTotals()]);

  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pickups</h1>
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
          <Link href="/pickups/bolo" className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-secondary">
            <Search className="size-4" aria-hidden="true" /> BOLO list
          </Link>
          <Link href="/pickups/new" className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand-deep">
            <Plus className="size-4" aria-hidden="true" /> Post a pickup
          </Link>
        </div>
      </div>

      <nav aria-label="Filter" className="mt-6 flex flex-wrap gap-1.5">
        <Link href={href(sp, { sold: sp.sold ? undefined : "1" })} aria-current={sp.sold ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-sm", sp.sold ? "border-brand bg-brand/15" : "hover:bg-secondary")}>
          Sold only
        </Link>
        {Object.entries(pickupSources).map(([id, label]) => (
          <Link key={id} href={href(sp, { source: sp.source === id ? undefined : id })} aria-current={sp.source === id ? "page" : undefined} className={cn("rounded-full border px-3 py-1 text-sm", sp.source === id ? "border-brand bg-brand/15" : "hover:bg-secondary")}>
            {label}
          </Link>
        ))}
      </nav>
      <nav aria-label="Category" className="mt-2 flex flex-wrap gap-1">
        {Object.entries(pickupCategories).map(([id, label]) => (
          <Link key={id} href={href(sp, { category: sp.category === id ? undefined : id })} aria-current={sp.category === id ? "page" : undefined} className={cn("rounded-full border px-2.5 py-0.5 text-xs", sp.category === id ? "border-brand bg-brand/15" : "hover:bg-secondary")}>
            {label}
          </Link>
        ))}
      </nav>
      {sp.brand ? (
        <p className="mt-3 text-sm">
          Showing brand <strong>{sp.brand}</strong>.{" "}
          <Link href={href(sp, { brand: undefined })} className="underline">
            Clear
          </Link>
        </p>
      ) : null}

      {pickups.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">No pickups here yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">Been to a car boot or charity shop lately? Share what you found and what you paid.</p>
          <Link href="/pickups/new" className="mt-4 inline-block rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-deep">
            Post the first one
          </Link>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pickups.map((p) => (
            <PickupCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { SoldThisMonth } from "@/components/pickups/sold-this-month";
import { getBoloBrands } from "@/lib/pickups-queries";
import { gbp, pickupCategories, pickupSources, type PickupCategory, type PickupSource } from "@/lib/pickups";

export const metadata: Metadata = {
  title: "BOLO: be on the lookout",
  description: "Brands UK resellers have picked up and sold, with typical buy and sell prices from members' real pickups.",
  alternates: { canonical: "/community/pickups/bolo" },
};
export const dynamic = "force-dynamic";

/*
  Built only from members' own pickups with a sold price. A brand appears once
  at least three of its pickups have sold, so one lucky find never looks like a pattern.
*/
export default async function BoloPage() {
  const brands = await getBoloBrands();
  return (
    <ForumShell source="/community/pickups/bolo" activeNav="pickups">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/community" className="hover:underline">
          Community
        </Link>
        {" / "}
        <Link href="/community/pickups" className="hover:underline">
          Pickups
        </Link>
      </nav>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">BOLO: be on the lookout</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Brands members have picked up and sold in the last year, with the typical price paid and the typical sold price. It comes only from real pickups with a sold price, and a brand only appears once three of them have sold.
      </p>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Sold prices are before fees and postage, and condition, size and season change everything. Check recent sold listings before you buy.
      </p>

      <SoldThisMonth />

      {brands.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <p className="font-medium">The list builds itself as members add sold prices.</p>
          <p className="mt-1 text-sm text-muted-foreground">Post your pickups, and when they sell, add the price. Once three pickups of a brand have sold, it shows here.</p>
          <Link href="/community/pickups/new" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85">
            Post a pickup
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-secondary text-left">
              <tr>
                <th className="p-3">Brand</th>
                <th className="p-3">Usually found</th>
                <th className="p-3 text-right">Typical paid</th>
                <th className="p-3 text-right">Typical sold</th>
                <th className="p-3 text-right">Multiple</th>
                <th className="p-3 text-right">Sold / found</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {brands.map((b) => (
                <tr key={b.brand}>
                  <td className="p-3 font-medium">
                    <Link href={`/community/pickups?brand=${encodeURIComponent(b.brand)}`} className="hover:underline">
                      {b.brand}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{pickupCategories[b.top_category as PickupCategory] ?? b.top_category}</span>
                  </td>
                  <td className="p-3 text-muted-foreground">{pickupSources[b.top_source as PickupSource] ?? b.top_source}</td>
                  <td className="p-3 text-right tabular-nums">{gbp(b.median_paid)}</td>
                  <td className="p-3 text-right tabular-nums text-success">{gbp(b.median_sold)}</td>
                  <td className="p-3 text-right tabular-nums">{b.median_multiple ? `${b.median_multiple}x` : ""}</td>
                  <td className="p-3 text-right tabular-nums text-muted-foreground">
                    {b.sold} / {b.pickups}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ForumShell>
  );
}

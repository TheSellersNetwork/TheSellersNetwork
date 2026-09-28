import type { Metadata } from "next";
import Link from "next/link";
import { ParcelChecker } from "@/components/tools/parcel-checker";
import { ToolHeader } from "@/components/tools/tool-header";
import { PARCELS_CHECKED } from "@/lib/tools/parcels";

export const metadata: Metadata = {
  title: "Parcel size checker",
  description: "Enter your parcel's size and weight and see which Royal Mail, Evri and Parcelforce services take it, with links to their price pages.",
  alternates: { canonical: "/tools/parcel-size" },
};

export default function ParcelSizePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Parcel size checker" intro="Enter the size and weight of the packed parcel. We show which Royal Mail, Evri and Parcelforce services take it, and link to each price list so you can compare." />
      <ParcelChecker />
      <section className="mt-10 space-y-2 text-sm text-muted-foreground">
        <p>
          Sizes and weights come from the carriers&rsquo; own guides, checked on {PARCELS_CHECKED}. Carriers change their rules, so check the linked size guide before you buy postage. We do not show prices because they change too often and vary by where you buy.
        </p>
        <p>
          Choosing between services, what tracking is worth and how to pack cheaply:{" "}
          <Link href="/guides/postage-and-royal-mail-choices" className="underline">
            the postage guide
          </Link>{" "}
          and{" "}
          <Link href="/guides/packaging-cheaply" className="underline">
            packaging cheaply and safely
          </Link>
          . Questions go in{" "}
          <Link href="/community/c/ebay-postage-and-packaging" className="underline">
            Postage and packaging
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

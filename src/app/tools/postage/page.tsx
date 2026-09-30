import type { Metadata } from "next";
import Link from "next/link";
import { PostageFinder } from "@/components/tools/fee-tools";
import { LabelHelper } from "@/components/tools/label-helper";
import { ParcelChecker } from "@/components/tools/parcel-checker";
import { ToolHeader, ToolIntro } from "@/components/tools/tool-header";
import { ToolTabs } from "@/components/tools/tool-tabs";
import { PARCELS_CHECKED } from "@/lib/tools/parcels";

export const metadata: Metadata = {
  title: "Postage finder: cheapest service, parcel size checker and label printing",
  description: "The cheapest Royal Mail and Evri service for your parcel's size and weight, and every Royal Mail, Evri and Parcelforce service it fits, with links to their price pages, and the right settings for printing labels. Free.",
  alternates: { canonical: "/tools/postage" },
};

export default async function Page({ searchParams }: PageProps<"/tools/postage">) {
  const { tab } = await searchParams;
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Postage finder" intro="Enter the packed size and weight to find the cheapest Royal Mail or Evri service, or to see every service your parcel fits.">
        <p className="mt-3 text-sm">
          Sending for Christmas? See the{" "}
          <Link href="/tools/postage/christmas-last-posting-dates" className="font-medium underline">
            Christmas last posting dates
          </Link>{" "}
          for each carrier.
        </p>
      </ToolHeader>
      <ToolTabs
        initial={typeof tab === "string" ? tab : undefined}
        label="Postage tools"
        tabs={[
          {
            id: "finder",
            label: "Cheapest service",
            content: (
              <>
                <ToolIntro>Enter the packed size and weight and see which Royal Mail and Evri services take it, cheapest first.</ToolIntro>
                <PostageFinder />
              </>
            ),
          },
          {
            id: "size",
            label: "What my parcel fits",
            content: (
              <>
                <ToolIntro>Enter the size and weight of the packed parcel. We show which Royal Mail, Evri and Parcelforce services take it, and link to each price list so you can compare.</ToolIntro>
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
              </>
            ),
          },
          {
            id: "labels",
            label: "Label printing",
            content: (
              <>
                <ToolIntro>Choose what you print labels on and where the label comes from, and see the size, scaling and orientation to pick, with a link to the platform&rsquo;s own label help.</ToolIntro>
                <LabelHelper />
                <p className="mt-8 rounded-xl border bg-card p-4 text-sm">
                  Got an A4 label PDF and a 4x6 printer? The{" "}
                  <Link href="/tools/label-cropper" className="font-medium underline">
                    shipping label cropper
                  </Link>{" "}
                  crops the label out of each page and makes a PDF the right size, on your device. For Vinted labels, the{" "}
                  <Link href="/tools/vinted-label-cropper" className="font-medium underline">
                    Vinted label cropper
                  </Link>{" "}
                  also says which Vinted carriers need no printer.
                </p>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}

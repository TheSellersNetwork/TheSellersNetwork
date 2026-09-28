import type { Metadata } from "next";
import { PostageFinder } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Cheapest postage finder",
  description: "Cheapest Royal Mail and Evri service for your parcel's size and weight.",
  alternates: { canonical: "/tools/postage-finder" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Cheapest postage finder" intro="Enter the packed size and weight and see which Royal Mail and Evri services take it, cheapest first." />
      <PostageFinder />
    </main>
  );
}

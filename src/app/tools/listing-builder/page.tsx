import type { Metadata } from "next";
import { ListingBuilder } from "@/components/tools/listing-builder";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Listing title and description builder",
  description: "Build a search-friendly listing title and an honest description with measurements, for eBay, Vinted, Depop and more. Free, no sign-up.",
  alternates: { canonical: "/tools/listing-builder" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Listing title and description builder" intro="Fill in what you know about the item and get a title in the order buyers search, plus a clear description with condition and measurements. Copy them into any platform." />
      <ListingBuilder />
    </main>
  );
}

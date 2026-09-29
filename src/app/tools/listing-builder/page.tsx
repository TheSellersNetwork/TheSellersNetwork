import type { Metadata } from "next";
import { ListingBuilder } from "@/components/tools/listing-builder";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Listing builder and cross-listing copy pack",
  description:
    "Fill in one form and get a listing title, an honest description and copy ready to paste into eBay, Vinted, Depop and Etsy, with live character counts, Depop hashtags and Etsy tags. Free, no sign-up, and it never posts for you.",
  alternates: { canonical: "/tools/listing-builder" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Listing builder and cross-listing copy pack"
        intro="Fill in what you know about the item once. You get a title in the order buyers search, a clear description with condition and measurements, and a version for eBay, Vinted, Depop and Etsy trimmed to each platform's limits, with a copy button on each. Tags and hashtags only use the words you typed. Nothing is posted: you paste it in yourself."
      />
      <ListingBuilder />
    </main>
  );
}

import type { Metadata } from "next";
import { EbayShop } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Is an eBay shop worth it?",
  description: "Compare eBay listing fees with and without a shop.",
  alternates: { canonical: "/tools/ebay-shop" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Is an eBay shop worth it?" intro="For private sellers: compare listing fees with and without an eBay shop for the number of listings you make each month." />
      <EbayShop />
    </main>
  );
}

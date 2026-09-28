import type { Metadata } from "next";
import { ShowPlanner } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Live show planner",
  description: "Lowest safe starting bids for Whatnot, eBay Live and TikTok Shop live shows.",
  alternates: { canonical: "/tools/show-planner" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Live show planner" intro="List what you plan to sell in your next Whatnot, eBay Live or TikTok show and get the lowest safe starting bid for each item, covering fees, packaging and giveaways." />
      <ShowPlanner />
    </main>
  );
}

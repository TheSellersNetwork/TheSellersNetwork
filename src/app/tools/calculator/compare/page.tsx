import type { Metadata } from "next";
import { ToolHeader } from "@/components/tools/tool-header";
import { CompareItems } from "@/components/tools/calculator/compare-items";
import { readCompare } from "@/components/tools/calculator/model";
import { CalculatorSwitcher, HUB } from "@/components/tools/calculator/views";

/* Two items side by side, each on its own platform. The figures travel in the link (?a_platform=vinted&a_price=20&b_platform=ebay_business&b_price=22). */

export const metadata: Metadata = {
  title: "Compare two items: fees and profit side by side",
  description: "Put two items, or one item on two platforms, side by side: fees, what you receive, profit and margin, with the difference worked out. Free, UK fees.",
  alternates: { canonical: "/tools/calculator/compare" },
};

export default async function ComparePage({ searchParams }: PageProps<"/tools/calculator/compare">) {
  const initial = readCompare(await searchParams);
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Compare two items"
        intro="Two items, or the same item on two platforms, side by side. Each has its own platform, price and costs, and the table shows which does better on fees, profit and margin."
        parent={{ href: "/tools/calculator", label: HUB }}
      />
      <CalculatorSwitcher current="compare" />
      <CompareItems initial={initial} />
    </main>
  );
}

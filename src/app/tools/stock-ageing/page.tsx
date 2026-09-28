import type { Metadata } from "next";
import { StockAgeing } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Stock ageing and price-drop planner",
  description: "Work out your break-even price and a simple markdown plan for stock that is not selling.",
  alternates: { canonical: "/tools/stock-ageing" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Stock ageing and price-drop planner" intro="How long has it been listed, what is the lowest you can go without losing money, and when should the price come down? Enter the numbers for one item." />
      <StockAgeing />
    </main>
  );
}

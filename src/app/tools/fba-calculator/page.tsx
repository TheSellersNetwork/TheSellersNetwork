import type { Metadata } from "next";
import { FbaCalculator } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Amazon FBA profit calculator",
  description: "Amazon FBA UK fees, profit, ROI and maximum buy price in one place. Free.",
  alternates: { canonical: "/tools/fba-calculator" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Amazon FBA profit calculator" intro="Referral fee, fulfilment fee, the fuel surcharge, storage and VAT on fees, with your profit, ROI and the most you can pay to hit your target." />
      <FbaCalculator />
    </main>
  );
}

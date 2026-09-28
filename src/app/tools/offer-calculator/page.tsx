import type { Metadata } from "next";
import { OfferCalculator } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Lowest offer calculator",
  description: "The lowest offer you can accept on eBay, Vinted, Depop and more after fees and postage.",
  alternates: { canonical: "/tools/offer-calculator" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Lowest offer calculator" intro="Work out the lowest offer you can accept and still make the profit you want, and see what each level of discount leaves you with." />
      <OfferCalculator />
    </main>
  );
}

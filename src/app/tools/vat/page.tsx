import type { Metadata } from "next";
import { VatTools } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "VAT calculators for resellers",
  description: "Rolling 12-month VAT threshold tracker, margin scheme VAT on second-hand goods, and Flat Rate against standard VAT. Arithmetic only, linked to GOV.UK.",
  alternates: { canonical: "/tools/vat" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="VAT calculators for resellers" intro="Three sums growing sellers ask about: how close you are to the VAT threshold, VAT on a second-hand item under the margin scheme, and Flat Rate against standard VAT. Not tax advice." />
      <VatTools />
    </main>
  );
}

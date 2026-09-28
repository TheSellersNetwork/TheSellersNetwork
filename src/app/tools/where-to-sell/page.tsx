import type { Metadata } from "next";
import { WhereToSell } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Where should I sell this?",
  description: "Compare what you keep after fees on every UK selling platform for the same item. Free, no sign-up.",
  alternates: { canonical: "/tools/where-to-sell" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Where should I sell this?" intro="Enter one price and see what you would actually keep on eBay, Vinted, Depop, Etsy, TikTok Shop, Whatnot, eBay Live, Amazon and Facebook, side by side. Tap a platform for the breakdown." />
      <WhereToSell />
    </main>
  );
}

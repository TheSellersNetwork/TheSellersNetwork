import type { Metadata } from "next";
import { ScamCheck } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Is this buyer a scam?",
  description: "A quick checklist for messages from buyers on Facebook Marketplace, Vinted, eBay and elsewhere.",
  alternates: { canonical: "/tools/scam-check" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Is this buyer a scam?" intro="Got a message that feels off? Tick what has happened and see how worried to be. The same few tricks come up again and again." />
      <ScamCheck />
    </main>
  );
}

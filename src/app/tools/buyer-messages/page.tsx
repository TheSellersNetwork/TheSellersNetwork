import type { Metadata } from "next";
import Link from "next/link";
import { BuyerMessages } from "@/components/tools/buyer-messages";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Buyer message templates",
  description:
    "Polite reply templates for UK resellers: low offers, is this still available, measurements, bundles, returns, items not received, requests to pay off the platform, feedback and cancellations. Fill in the blanks and copy.",
  alternates: { canonical: "/tools/buyer-messages" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Buyer message templates"
        intro="Replies for the messages every seller gets, written plainly and kindly. Choose the situation, fill in the blanks and copy it into the chat. Nothing you type is sent or saved."
      />
      <BuyerMessages />
      <section className="mt-14 space-y-2 border-t pt-8 text-sm text-muted-foreground">
        <h2 className="font-semibold text-foreground">Something feels off?</h2>
        <p>
          If a buyer is pushing you to pay or talk off the platform, or sending links, check the message with{" "}
          <Link href="/tools/scam-check" className="underline">
            is this buyer a scam?
          </Link>{" "}
          before you reply.
        </p>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ChangeTimeline } from "@/components/tools/change-timeline";
import { ToolHeader } from "@/components/tools/tool-header";
import { getPolicyChanges } from "@/lib/tools/changes";

export const metadata: Metadata = {
  title: "Fee and policy changes for UK sellers",
  description: "A timeline of fee and policy changes on eBay, Amazon, Vinted, Depop, TikTok Shop, Royal Mail, Evri and HMRC, each linked to the official announcement.",
  alternates: { canonical: "/tools/policy-changes" },
};

export default function PolicyChangesPage() {
  const changes = getPolicyChanges();
  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader
        title="Fee and policy changes"
        intro="What changed, when, and who it affects. Every entry links to the platform's own announcement or help page, so you can check the detail yourself."
      >
        <p className="mt-3 text-sm text-muted-foreground">
          Spotted a change we have missed? Post it in{" "}
          <Link href="/community/c/deals" className="underline">
            Deals and fee changes
          </Link>{" "}
          with the link. The{" "}
          <Link href="/newsletter" className="underline">
            free newsletter
          </Link>{" "}
          rounds up new ones.
        </p>
      </ToolHeader>
      <ChangeTimeline changes={changes} />
    </main>
  );
}

import type { Metadata } from "next";
import { ReportingCheck } from "@/components/tools/small-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Will my platform report me to HMRC?",
  description: "Check your sales on each platform against the 30 sales or about £1,700 platform reporting limits.",
  alternates: { canonical: "/tools/reporting-check" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Will my platform report me to HMRC?" intro="Selling sites now send HMRC details of sellers who pass a limit each calendar year. Enter your numbers for each platform to see where you stand." />
      <ReportingCheck />
    </main>
  );
}

import type { Metadata } from "next";
import { WorthMyTime } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Is it worth my time?",
  description: "Work out your hourly rate on a flip and compare it with the National Living Wage.",
  alternates: { canonical: "/tools/worth-my-time" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Is it worth my time?" intro="Add up the minutes an item really takes, from sourcing to the post office, and see what you earned per hour." />
      <WorthMyTime />
    </main>
  );
}

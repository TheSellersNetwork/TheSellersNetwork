import type { Metadata } from "next";
import { ClaimsDeadline } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Amazon claims deadline checker",
  description: "Work out the deadline for an Amazon FBA reimbursement claim.",
  alternates: { canonical: "/tools/claims-deadline" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Amazon claims deadline checker" intro="Lost, damaged or short stock at Amazon? See the last day to claim and how long you have left." />
      <ClaimsDeadline />
    </main>
  );
}

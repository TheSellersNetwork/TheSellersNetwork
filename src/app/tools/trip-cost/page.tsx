import type { Metadata } from "next";
import { TripCost } from "@/components/tools/fee-tools";
import { ToolHeader } from "@/components/tools/tool-header";

export const metadata: Metadata = {
  title: "Sourcing trip cost",
  description: "The real cost of a sourcing trip: mileage at HMRC's rate, parking and fees against the haul's expected profit.",
  alternates: { canonical: "/tools/trip-cost" },
};

export default function Page() {
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Sourcing trip cost" intro="Is the car boot worth the drive? Put in the miles, parking and what you expect to make from the haul." />
      <TripCost />
    </main>
  );
}

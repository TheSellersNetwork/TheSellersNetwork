import type { Metadata } from "next";
import { TripCost, WorthMyTime } from "@/components/tools/fee-tools";
import { ToolHeader, ToolIntro } from "@/components/tools/tool-header";
import { ToolTabs } from "@/components/tools/tool-tabs";

export const metadata: Metadata = {
  title: "Is it worth it? Hourly rate on a flip and sourcing trip cost",
  description: "Work out your hourly rate on a flip against the National Living Wage, and the real cost of a sourcing trip: mileage at HMRC's rate, parking and fees against the haul's expected profit.",
  alternates: { canonical: "/tools/worth-it" },
};

export default async function Page({ searchParams }: PageProps<"/tools/worth-it">) {
  const { tab } = await searchParams;
  return (
    <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
      <ToolHeader title="Is it worth it?" intro="What one flip really paid you per hour, and whether a sourcing trip covers its costs." />
      <ToolTabs
        initial={typeof tab === "string" ? tab : undefined}
        label="Worth it tools"
        tabs={[
          {
            id: "flip",
            label: "One flip",
            content: (
              <>
                <ToolIntro>Add up the minutes an item really takes, from sourcing to the post office, and see what you earned per hour.</ToolIntro>
                <WorthMyTime />
              </>
            ),
          },
          {
            id: "trip",
            label: "Sourcing trip",
            content: (
              <>
                <ToolIntro>Is the car boot worth the drive? Put in the miles, parking and what you expect to make from the haul.</ToolIntro>
                <TripCost />
              </>
            ),
          },
        ]}
      />
    </main>
  );
}

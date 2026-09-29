import { FeeTimelineView } from "@/components/home/sections/fee-timeline-view";
import { getChanges } from "@/lib/content/changes";
import { ukDate } from "@/lib/content/schedule";
import { buildTimeline } from "@/lib/home/sections/fee-timeline";

/*
  Fee and policy changes on a line: the last six that have happened and every
  one still to come, with a Today marker. From content/changes, the same
  posts as the blog's change breakdowns. Renders nothing when there are none.
*/
export async function FeeTimeline() {
  const timeline = buildTimeline(await getChanges(), ukDate(new Date()));
  if (!timeline) return null;
  return <FeeTimelineView timeline={timeline} />;
}

import { CountUp } from "@/components/forum/count-up";
import { getCommunityStats } from "@/lib/forum/live-queries";

/* Four live numbers across the top of the community: what happened this week and who is here. */
export async function CommunityStats() {
  const s = await getCommunityStats();
  const items = [
    { label: "topics this week", value: s.topics_week },
    { label: "replies this week", value: s.replies_week },
    { label: "solved this week", value: s.solved_week, accent: true },
    { label: "here in the last hour", value: s.online_now, live: true },
  ];
  return (
    <dl className="forum-card grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4" aria-label="Community activity">
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-3">
          <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {item.live ? <span className="live-dot size-2 rounded-full bg-success" aria-hidden="true" /> : null}
            {item.label}
          </dt>
          <dd className={item.accent ? "text-2xl font-semibold tabular-nums text-success" : "text-2xl font-semibold tabular-nums"}>
            <CountUp value={item.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

import { CountUp } from "@/components/forum/count-up";
import { getCommunityStats } from "@/lib/forum/live-queries";
import { getCategories } from "@/lib/forum/queries";

/*
  Live numbers across the top: what happened this week and who is here.
  A figure that would read zero is left out, and totals that only ever grow
  (forums, members) fill the strip while the community is young.
*/
export async function CommunityStats() {
  const [s, categories] = await Promise.all([getCommunityStats(), getCategories()]);
  const forums = categories.filter((c) => !c.is_private).length;
  const allTopics = categories.reduce((n, c) => n + c.topic_count, 0);
  const candidates = [
    { label: "topics this week", value: s.topics_week },
    { label: "replies this week", value: s.replies_week },
    { label: "solved this week", value: s.solved_week, accent: true },
    { label: "here in the last hour", value: s.online_now, live: true },
    { label: "members", value: s.members >= 10 ? s.members : 0 },
    { label: "topics so far", value: s.topics_week > 0 ? 0 : allTopics },
    { label: "forums", value: forums },
  ];
  const items = candidates.filter((i) => i.value > 0).slice(0, 4);
  if (items.length === 0) return null;
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

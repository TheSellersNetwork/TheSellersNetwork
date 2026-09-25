import Link from "next/link";
import type { TopicListView, TopPeriod } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
  view: TopicListView;
  period: TopPeriod;
  showFollowing?: boolean;
};

const views: { id: TopicListView; label: string }[] = [
  { id: "latest", label: "Latest" },
  { id: "top", label: "Top" },
  { id: "unanswered", label: "Needs an answer" },
];

const periods: { id: TopPeriod; label: string }[] = [
  { id: "day", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
];

/* Latest, top and unanswered, with a period picker under Top. Plain links so it is crawlable. */
export function ViewTabs({ basePath, view, period, showFollowing }: Props) {
  const tabs = showFollowing ? [{ id: "following" as const, label: "Following" }, ...views] : views;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <nav aria-label="Topic views" className="flex gap-1 rounded-md bg-secondary p-1">
        {tabs.map((v) => (
          <Link
            key={v.id}
            href={`${basePath}?view=${v.id}`}
            aria-current={view === v.id ? "page" : undefined}
            className={cn(
              "rounded px-3 py-1 text-sm font-medium",
              view === v.id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>
      {view === "top" ? (
        <nav aria-label="Period" className="flex gap-1 text-sm">
          {periods.map((p) => (
            <Link
              key={p.id}
              href={`${basePath}?view=top&period=${p.id}`}
              aria-current={period === p.id ? "page" : undefined}
              className={cn("rounded px-2 py-1", period === p.id ? "bg-secondary font-medium" : "text-muted-foreground hover:text-foreground")}
            >
              {p.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

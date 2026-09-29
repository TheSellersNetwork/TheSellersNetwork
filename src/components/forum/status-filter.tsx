import Link from "next/link";
import { statusHints, statusLabels, TOPIC_STATUSES, withStatus, type TopicStatus } from "@/lib/forum/status";
import { cn } from "@/lib/utils";

/*
  Filter a topic list by status. Plain links carrying ?status= so it works
  without JavaScript, keeps the current view and period, and can be shared.
*/
export function StatusFilter({ href, status }: { href: string; status: TopicStatus | null }) {
  const options: { id: TopicStatus | null; label: string; hint?: string }[] = [
    { id: null, label: "Any status" },
    ...TOPIC_STATUSES.map((s) => ({ id: s, label: statusLabels[s], hint: statusHints[s] })),
  ];
  return (
    <nav aria-label="Filter by status" className="-mx-1 mb-4 flex gap-1 overflow-x-auto px-1 pb-1 text-sm" data-testid="status-filter">
      {options.map((o) => {
        const current = o.id === status;
        return (
          <Link
            key={o.label}
            href={withStatus(href, o.id)}
            aria-current={current ? "page" : undefined}
            title={o.hint}
            scroll={false}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center rounded-full border px-3 max-sm:min-h-11",
              current ? "border-foreground/30 bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

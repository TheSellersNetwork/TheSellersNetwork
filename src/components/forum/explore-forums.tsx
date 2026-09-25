import Link from "next/link";
import { CheckCircle2, MessageSquare, Minus, Plus } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getCategories, groupCategories } from "@/lib/forum/queries";
import { getCategoryOverview } from "@/lib/forum/overview-queries";
import { displayName, plural, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { Category } from "@/lib/db/types";

/*
  The community overview: one collapsible section per top-level group and a
  card per category showing its counts and latest post. Sections use native
  <details> so they work without JavaScript and remember nothing by design.
*/
export async function ExploreForums({ onlineIds }: { onlineIds?: Set<string> }) {
  const [categories, latest] = await Promise.all([getCategories(), getCategoryOverview()]);
  const groups = groupCategories(categories);

  return (
    <div className="space-y-3">
      {groups.map((group, i) => {
        const cards = group.children.length > 0 ? group.children : [group];
        return (
          <details key={group.id} open={i < 4} className="explore-group forum-card group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground [&::-webkit-details-marker]:hidden">
              <span className="h-4 w-1 rounded-full" style={{ background: `var(--cat-${group.colour})` }} aria-hidden="true" />
              <span className="flex-1">{group.name}</span>
              <span className="text-[11px] font-medium normal-case tracking-normal">{group.children.length > 0 ? `${group.children.length} forums` : ""}</span>
              <Plus className="size-4 group-open:hidden" aria-hidden="true" />
              <Minus className="hidden size-4 group-open:block" aria-hidden="true" />
            </summary>
            <div className="grid gap-3 px-3 pb-3 sm:grid-cols-2">
              {cards.map((c) => (
                <CategoryCard key={c.id} category={c} latest={latest.get(c.id) ?? null} onlineIds={onlineIds} />
              ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function CategoryCard({ category, latest, onlineIds }: { category: Category; latest: Awaited<ReturnType<typeof getCategoryOverview>> extends Map<string, infer T> ? T | null : never; onlineIds?: Set<string> }) {
  return (
    <div className="explore-card row-enter rounded-lg border bg-background/60 p-3 transition-colors hover:border-brand/60">
      <div className="flex items-start justify-between gap-2">
        <Link href={urls.category(category.slug)} className="font-semibold leading-snug hover:underline">
          {category.name}
        </Link>
        <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1" title="Topics">
            <MessageSquare className="size-3" aria-hidden="true" />
            {category.topic_count}
          </span>
          <span>{plural(category.post_count, "post")}</span>
        </span>
      </div>
      {latest ? (
        <div className="mt-2 flex items-center gap-2">
          <UserAvatar profile={latest.last_poster} size="sm" online={latest.last_poster ? onlineIds?.has(latest.last_poster.id) : false} />
          <div className="min-w-0 flex-1 text-xs">
            <Link href={urls.topic(latest)} className="line-clamp-1 font-medium text-foreground hover:underline">
              {latest.is_solved ? <CheckCircle2 className="mr-1 inline size-3 text-success" aria-label="Solved" /> : null}
              {latest.title}
            </Link>
            <p className="truncate text-muted-foreground">
              {timeAgo(latest.last_post_at)} ago · {displayName(latest.last_poster)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{category.description ?? ""}</p>
      )}
    </div>
  );
}

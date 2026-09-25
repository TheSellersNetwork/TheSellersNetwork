import Link from "next/link";
import { CheckCircle2, Lock, Pin } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { Button } from "@/components/ui/button";
import { SponsorSlot } from "@/components/partners/sponsor-slot";
import { timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { TopicRow } from "@/lib/db/types";

type Props = {
  topics: TopicRow[];
  nextCursor?: string | null;
  /* Base path and params for the "more" link. */
  moreHref?: (cursor: string) => string;
  emptyMessage?: string;
  showCategory?: boolean;
  /* When set, one sponsor row is placed after the fifth topic. */
  sponsorPage?: string;
  /* Topics with activity after this time get a New pill. */
  newSince?: string | null;
  /* Ids of members active in the last few minutes, for presence dots. */
  onlineIds?: Set<string>;
};

/*
  Topic rows: title, category bar, tags, reply count, last activity, up to
  three avatars. No excerpts, as the brief asks.
*/
export function TopicList({ topics, nextCursor, moreHref, emptyMessage, showCategory = true, sponsorPage, newSince, onlineIds }: Props) {
  if (topics.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? "Nothing here yet."}
      </div>
    );
  }

  return (
    <div>
      <ol className="forum-card divide-y rounded-lg border bg-card">
        {topics.map((topic, i) => (
          <li key={topic.id} className="contents">
            <TopicRowItem topic={topic} showCategory={showCategory} isNew={!!newSince && topic.last_post_at > newSince} onlineIds={onlineIds} />
            {sponsorPage && i === 4 ? (
              <div className="px-3 py-2 sm:px-4">
                <SponsorSlot slot="topic_list" page={sponsorPage} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
      {nextCursor && moreHref ? (
        <div className="mt-4 flex justify-center">
          <Button asChild variant="outline">
            <Link href={moreHref(nextCursor)} rel="next">
              Older topics
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TopicRowItem({ topic, showCategory, isNew, onlineIds }: { topic: TopicRow; showCategory: boolean; isNew: boolean; onlineIds?: Set<string> }) {
  const avatars = [topic.author, topic.last_poster].filter(
    (p, i, arr): p is NonNullable<typeof p> => !!p && arr.findIndex((x) => x?.id === p.id) === i,
  );
  const colour = topic.category?.colour ?? "general";

  return (
    <div className="topic-row flex items-center gap-3 px-3 sm:px-4">
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: `var(--cat-${colour})` }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link href={urls.topic(topic)} className="topic-title line-clamp-2 font-medium leading-snug hover:underline">
            {topic.title}
          </Link>
          <span className="flex shrink-0 items-center gap-1 pt-0.5 text-muted-foreground">
            {isNew ? <span className="unread-pill">New</span> : null}
            {topic.is_solved ? <CheckCircle2 className="tick-draw size-4 text-success" aria-label="Solved" /> : null}
            {topic.is_pinned ? <Pin className="size-4" aria-label="Pinned" /> : null}
            {topic.is_locked ? <Lock className="size-4" aria-label="Locked" /> : null}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          {showCategory && topic.category ? (
            <Link href={urls.category(topic.category.slug)} className="hover:underline">
              {topic.category.name}
            </Link>
          ) : null}
          {topic.tags.map((tag) => (
            <span key={tag.id} className="rounded bg-secondary px-1.5 py-0.5">
              {tag.name}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden -space-x-2 sm:flex">
        {avatars.slice(0, 3).map((p) => (
          <UserAvatar key={p.id} profile={p} size="sm" className="ring-2 ring-card" online={onlineIds?.has(p.id)} />
        ))}
      </div>
      <div className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground" aria-label={`${topic.reply_count} replies`}>
        {topic.reply_count}
      </div>
      <time dateTime={topic.last_post_at} className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
        {timeAgo(topic.last_post_at)}
      </time>
    </div>
  );
}

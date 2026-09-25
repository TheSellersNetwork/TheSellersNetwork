"use client";

import Link from "next/link";
import { useState } from "react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { displayName, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { RecentReply, RecentTopic } from "@/lib/forum/overview-queries";
import { cn } from "@/lib/utils";

type Props = { replies: RecentReply[]; topics: RecentTopic[]; onlineIds?: string[]; compact?: boolean };

/* New posts and New threads, side by side like the reference design. */
export function ActivityTabs({ replies, topics, onlineIds = [], compact }: Props) {
  const [tab, setTab] = useState<"posts" | "threads">("posts");
  const online = new Set(onlineIds);

  return (
    <div className={cn(!compact && "forum-card rail-card rounded-lg border bg-card p-4")}>
      <div role="tablist" aria-label="Recent activity" className="flex gap-4 border-b text-sm">
        {(
          [
            ["posts", "New posts"],
            ["threads", "New threads"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn("-mb-px border-b-2 pb-2 font-medium", tab === id ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <ul role="tabpanel" className="mt-3 space-y-3">
        {tab === "posts"
          ? replies.map((r) => (
              <li key={r.id} className="row-enter flex items-start gap-2.5">
                <UserAvatar profile={r.author} size="sm" online={!!r.author && online.has(r.author.id)} />
                <div className="min-w-0 text-sm">
                  {r.topic ? (
                    <Link href={urls.topic(r.topic, r.post_number)} className="line-clamp-2 font-medium leading-snug hover:underline">
                      {r.topic.title}
                    </Link>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {displayName(r.author)} replied {timeAgo(r.created_at)} ago
                  </p>
                </div>
              </li>
            ))
          : topics.map((t) => (
              <li key={t.id} className="row-enter flex items-start gap-2.5">
                <UserAvatar profile={t.author} size="sm" online={!!t.author && online.has(t.author.id)} />
                <div className="min-w-0 text-sm">
                  <Link href={urls.topic(t)} className="line-clamp-2 font-medium leading-snug hover:underline">
                    {t.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {displayName(t.author)} started {timeAgo(t.created_at)} ago · {t.reply_count} replies
                  </p>
                </div>
              </li>
            ))}
        {(tab === "posts" ? replies : topics).length === 0 ? <li className="text-sm text-muted-foreground">{tab === "posts" ? "No replies yet. Be the first." : "No topics yet."}</li> : null}
      </ul>
    </div>
  );
}

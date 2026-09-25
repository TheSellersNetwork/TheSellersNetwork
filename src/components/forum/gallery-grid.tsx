import Image from "next/image";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { displayName, plural, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { TopicRow } from "@/lib/db/types";

/* Photo tiles for gallery forums: the first image in the opening post becomes the tile. */
export function GalleryGrid({ topics, covers, emptyMessage }: { topics: TopicRow[]; covers: Map<string, string>; emptyMessage: string }) {
  if (topics.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((t) => {
        const cover = covers.get(t.id);
        return (
          <li key={t.id} className="forum-card row-enter overflow-hidden rounded-xl border bg-card">
            <Link href={urls.topic(t)} className="block">
              <div className="relative aspect-[4/3] bg-secondary">
                {cover ? (
                  <Image src={cover} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <ImageIcon className="size-8" aria-hidden="true" />
                  </div>
                )}
              </div>
            </Link>
            <div className="p-3">
              <Link href={urls.topic(t)} className="line-clamp-2 font-medium leading-snug hover:underline">
                {t.title}
              </Link>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <UserAvatar profile={t.author} size="xs" />
                <span className="truncate">{displayName(t.author)}</span>
                <span className="ml-auto shrink-0">
                  {plural(t.reply_count, "reply", "replies")} · {timeAgo(t.last_post_at)}
                </span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

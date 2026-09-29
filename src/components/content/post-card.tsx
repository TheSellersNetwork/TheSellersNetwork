import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { ImpactBadge, PlatformChip } from "@/components/changes/change-badges";
import { urls } from "@/lib/forum/urls";
import { formatChangeDate, type ChangeMeta } from "@/lib/tools/changes";
import { cn } from "@/lib/utils";

export type PostCardItem = {
  slug: string;
  title: string;
  excerpt: string;
  /* UK publish date, YYYY-MM-DD, or null for a draft. */
  date: string | null;
  /* UK date of the last update, if the post says it was updated after publishing. */
  updated: string | null;
  kind: "change" | "article";
  typeLabel: string;
  author: string;
  initials: string;
  minutes: number;
  replies: number;
  change?: ChangeMeta;
  scheduled?: string | null;
};

/*
  One post on the blog index. The whole card is a link target (the title's
  ::after covers it) so the tap area is generous on mobile.
*/
/* `featured` is the label shown on the large card at the top of the index ("Featured" or "Latest"). */
export function PostCard({ item, featured, headingLevel = 3 }: { item: PostCardItem; featured?: "Featured" | "Latest"; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article
      className={cn(
        "forum-card relative flex h-full flex-col rounded-lg border bg-card p-5 transition-colors hover:border-brand/60 focus-within:border-brand/60 motion-reduce:transition-none",
        featured && "sm:p-7",
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {item.change ? (
          <>
            <PlatformChip platform={item.change.platform} />
            <ImpactBadge impact={item.change.impact} />
          </>
        ) : (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs">{item.typeLabel}</span>
        )}
        {featured ? <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">{featured}</span> : null}
        {item.scheduled ? (
          <span className="rounded-full border border-brand/60 bg-brand/15 px-2.5 py-0.5 text-xs font-medium">Scheduled for {formatChangeDate(item.scheduled)}</span>
        ) : !item.date ? (
          <span className="rounded-full border border-dashed px-2.5 py-0.5 text-xs font-medium">Draft</span>
        ) : null}
      </div>
      <Heading className={cn("mt-3 font-serif font-semibold leading-snug", featured ? "text-2xl sm:text-3xl" : "text-lg")}>
        <Link href={urls.blogPost(item.slug)} className="after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {item.title}
        </Link>
      </Heading>
      <div className="flex-1">
        <p className={cn("mt-2 text-muted-foreground", featured ? "max-w-2xl text-base sm:text-lg" : "line-clamp-3 text-sm")}>{item.excerpt}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-[10px] font-semibold text-brand" aria-hidden="true">
          {item.initials}
        </span>
        <span className="font-medium text-foreground">{item.author}</span>
        <span aria-hidden="true">·</span>
        {item.date ? <time dateTime={item.date}>{formatChangeDate(item.date)}</time> : <span>Not dated</span>}
        {item.updated && item.updated !== item.date ? (
          <>
            <span aria-hidden="true">·</span>
            <span>
              Updated <time dateTime={item.updated}>{formatChangeDate(item.updated)}</time>
            </span>
          </>
        ) : null}
        <span aria-hidden="true">·</span>
        <span>{item.minutes} min read</span>
        {item.replies > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" aria-hidden="true" /> {item.replies}
            <span className="sr-only">{item.replies === 1 ? "reply" : "replies"}</span>
          </span>
        ) : null}
      </div>
    </article>
  );
}

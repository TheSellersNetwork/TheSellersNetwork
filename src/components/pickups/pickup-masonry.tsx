import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, MessageCircle, Package, Vote } from "lucide-react";
import { SoldStamp } from "@/components/pickups/sold-stamp";
import { gbp, multiple, pickupPlatforms, pickupSources, soldStampKey, type Pickup } from "@/lib/pickups";
import { displayName, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Pickups as a photo wall. CSS columns rather than a grid, so each photo keeps
  its own shape and nothing is cropped. Reading order runs down each column,
  which is fine here: the list is a wall of finds, not a ranked table.
*/
export function PickupMasonry({ pickups, showAuthor = true, className, label = "Pickups", heading = "h2" }: { pickups: Pickup[]; showAuthor?: boolean; className?: string; label?: string; heading?: "h2" | "h3" }) {
  return (
    <ul aria-label={label} className={cn("columns-2 gap-3 sm:columns-3 sm:gap-4", className)}>
      {pickups.map((p) => (
        <PickupTile key={p.id} p={p} showAuthor={showAuthor} heading={heading} />
      ))}
    </ul>
  );
}

export function PickupTile({ p, showAuthor = true, heading: H = "h2" }: { p: Pickup; showAuthor?: boolean; heading?: "h2" | "h3" }) {
  const x = multiple(p.paid, p.sold_price);
  const sold = p.sold_price !== null;
  return (
    <li className="group relative mb-3 break-inside-avoid overflow-hidden rounded-xl border bg-card transition-colors focus-within:border-brand hover:border-brand/60 motion-reduce:transition-none sm:mb-4">
      <div className="relative bg-secondary">
        {p.photo_url ? (
          <Image src={p.photo_url} alt={p.title} width={600} height={600} sizes="(min-width: 1024px) 240px, (min-width: 640px) 33vw, 50vw" className="h-auto w-full" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
            <Package className="size-10" aria-hidden="true" />
          </div>
        )}
        {sold ? <SoldStamp stampKey={soldStampKey(p)} multiple={x} className="absolute left-2 top-2" /> : null}
      </div>
      <div className="p-3">
        <H className="line-clamp-2 text-sm font-semibold leading-snug">
          <Link href={`/community/pickups/${p.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </Link>
        </H>
        <p className="mt-1 text-sm tabular-nums">
          Paid <strong>{gbp(p.paid)}</strong>
          {sold ? (
            <>
              {", "}sold <strong className="text-success">{gbp(p.sold_price)}</strong>
              <span className="text-muted-foreground"> on {pickupPlatforms[p.sold_platform ?? "other"]}</span>
            </>
          ) : p.expected !== null ? (
            <span className="text-muted-foreground">, hoping for {gbp(p.expected)}</span>
          ) : null}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {pickupSources[p.source_type]}
            {p.area ? `, ${p.area}` : ""}
          </span>
          {p.like_count > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" aria-hidden="true" />
              {p.like_count}<span className="sr-only"> nice find{p.like_count === 1 ? "" : "s"}</span>
            </span>
          ) : null}
          <TalkCounts p={p} />
        </p>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {showAuthor && p.author ? <span className="truncate">{displayName(p.author)}</span> : null}
          <span className="ml-auto shrink-0">{timeAgo(p.created_at)} ago</span>
        </p>
      </div>
    </li>
  );
}

/* Comment and "would you have bought it?" answer counts, shown only when there are some. */
export function TalkCounts({ p }: { p: Pickup }) {
  const comments = p.comment_count ?? 0;
  const votes = (p.vote_yes_count ?? 0) + (p.vote_no_count ?? 0);
  return (
    <>
      {comments > 0 ? (
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="size-3" aria-hidden="true" />
          {comments}
          <span className="sr-only"> comment{comments === 1 ? "" : "s"}</span>
        </span>
      ) : null}
      {votes > 0 ? (
        <span className="inline-flex items-center gap-1">
          <Vote className="size-3" aria-hidden="true" />
          {votes}
          <span className="sr-only"> {votes === 1 ? "answer" : "answers"} to would you have bought it</span>
        </span>
      ) : null}
    </>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Package } from "lucide-react";
import { gbp, multiple, pickupCategories, pickupPlatforms, pickupSources, type Pickup } from "@/lib/pickups";
import { timeAgo } from "@/lib/format";

export function PickupCard({ p }: { p: Pickup }) {
  const x = multiple(p.paid, p.sold_price);
  return (
    <li className="forum-card row-enter relative flex flex-col overflow-hidden rounded-xl border bg-card hover:border-brand/60">
      <div className="relative aspect-square bg-secondary">
        {p.photo_url ? (
          <Image src={p.photo_url} alt={p.title} fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-10" aria-hidden="true" />
          </div>
        )}
        {p.sold_price !== null ? (
          <span className="absolute left-2 top-2 rounded-full bg-success px-2 py-0.5 text-xs font-semibold text-white">Sold{x ? ` · ${x}` : ""}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug">
          <Link href={`/community/pickups/${p.id}`} className="after:absolute after:inset-0">
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm">
          Paid <strong>{gbp(p.paid)}</strong>
          {p.sold_price !== null ? (
            <>
              {" "}
              · sold <strong className="text-success">{gbp(p.sold_price)}</strong>
              <span className="text-muted-foreground"> on {pickupPlatforms[p.sold_platform ?? "other"]}</span>
            </>
          ) : p.expected !== null ? (
            <span className="text-muted-foreground"> · hoping for {gbp(p.expected)}</span>
          ) : null}
        </p>
        <p className="mt-auto flex flex-wrap items-center gap-x-2 pt-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {pickupSources[p.source_type]}
            {p.area ? `, ${p.area}` : ""}
          </span>
          <span>{pickupCategories[p.category]}</span>
          {p.like_count > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" aria-hidden="true" /> {p.like_count}
            </span>
          ) : null}
          <span className="ml-auto">{timeAgo(p.created_at)} ago</span>
        </p>
      </div>
    </li>
  );
}

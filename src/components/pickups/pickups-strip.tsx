import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Package } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { gbp, multiple, pickupSources, type Pickup } from "@/lib/pickups";
import { getPickups } from "@/lib/pickups-queries";
import { displayName, timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { TalkCounts } from "@/components/pickups/pickup-masonry";

/*
  Latest pickups for the home page: the photo, what was paid and what it sold
  for, where it was found and who found it. The multiple sits on the photo and
  shows on hover or keyboard focus; touch screens have no hover, so they see it
  all the time. With no pickups yet, it asks for the first one rather than
  showing made-up examples.
*/
export async function PickupsStrip() {
  const pickups = await getPickups({}, 8);

  return (
    <section aria-labelledby="pickups-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pickups-heading" className="text-2xl font-semibold tracking-tight">
            Latest pickups
          </h2>
          <p className="mt-1 text-muted-foreground">What members found, what they paid and what it went for.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/community/pickups/bolo" className="text-brand underline-offset-2 hover:underline">
            BOLO list
          </Link>
          <Link href="/community/pickups" className="inline-flex items-center gap-1 text-brand underline-offset-2 hover:underline">
            All pickups <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {pickups.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed bg-card p-6">
          <p className="font-medium">No pickups posted yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Found something good at a car boot or charity shop? Post a photo, what you paid and, once it sells, what it went for. Sold comps from real finds are what make the BOLO list.
          </p>
          <Link href="/community/pickups/new" className="mt-4 inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-primary-foreground hover:bg-brand-deep">
            Post the first pickup
          </Link>
        </div>
      ) : (
        <ul className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible" aria-label="Latest pickups">
          {pickups.map((p) => (
            <StripCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function StripCard({ p }: { p: Pickup }) {
  const x = multiple(p.paid, p.sold_price);
  return (
    <li className="group relative flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-card focus-within:border-brand hover:border-brand/60 lg:w-auto">
      <div className="relative aspect-square bg-secondary">
        {p.photo_url ? (
          <Image src={p.photo_url} alt="" fill sizes="(min-width: 1024px) 220px, 176px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-8" aria-hidden="true" />
          </div>
        )}
        {x ? (
          <span className="absolute inset-x-0 bottom-0 bg-foreground/85 px-2 py-1.5 text-sm font-semibold text-background opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none pointer-coarse:opacity-100">
            {x} what they paid
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/community/pickups/${p.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </Link>
        </h3>
        <p className="text-sm tabular-nums">
          Paid <strong>{gbp(p.paid)}</strong>
          {p.sold_price !== null ? (
            <>
              , sold <strong className="text-success">{gbp(p.sold_price)}</strong>
            </>
          ) : p.expected !== null ? (
            <span className="text-muted-foreground">, hoping for {gbp(p.expected)}</span>
          ) : null}
        </p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            {pickupSources[p.source_type]}
            {p.area ? `, ${p.area}` : ""}
          </span>
        </p>
        <p className="flex gap-2 text-xs text-muted-foreground empty:hidden">
          <TalkCounts p={p} />
        </p>
        {p.author ? (
          <p className="relative z-10 mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <UserAvatar profile={p.author} size="xs" link={false} />
            <Link href={urls.profile(p.author.username)} className="truncate hover:text-foreground hover:underline">
              {displayName(p.author)}
            </Link>
            <span className="ml-auto shrink-0">{timeAgo(p.created_at)} ago</span>
          </p>
        ) : null}
      </div>
    </li>
  );
}

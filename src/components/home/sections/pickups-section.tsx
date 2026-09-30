import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import { gbp, multiple, pickupSources, type Pickup } from "@/lib/pickups";
import { getPickups } from "@/lib/pickups-queries";

/*
  Pickups on the home page. With pickups: the latest six as small photo
  cards, a sideways row on phones and one or two neat rows when there is
  room. With none: how pickups work in three steps and one button, in less
  space than a big empty box.
*/
export async function PickupsSection({ pickups: given }: { pickups?: Pickup[] } = {}) {
  const pickups = (given ?? (await getPickups({}, 6).catch(() => []))).slice(0, 6);

  return (
    <section aria-labelledby="home-pickups-heading" className="@container" data-testid="pickups-section">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="home-pickups-heading" className="text-2xl font-semibold tracking-tight">
            {pickups.length > 0 ? "Latest pickups" : "Pickups"}
          </h2>
          <p className="mt-1 text-muted-foreground">What members found, what they paid and what it went for.</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/community/pickups/bolo" className="inline-flex min-h-11 items-center text-brand underline-offset-2 hover:underline sm:min-h-0">
            BOLO list
          </Link>
          {pickups.length > 0 ? (
            <Link href="/community/pickups" className="inline-flex min-h-11 items-center gap-1 text-brand underline-offset-2 hover:underline sm:min-h-0">
              All pickups <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

      {pickups.length === 0 ? (
        <div className="mt-4 rounded-xl border bg-card p-4 sm:p-5" data-testid="pickups-how">
          <h3 className="sr-only">How pickups work</h3>
          <ol className="grid gap-3 sm:grid-cols-3">
            {[
              ["Post a find", "A photo, where you found it and what you paid."],
              ["Mark it sold", "Add what it went for once it sells."],
              ["It feeds the BOLO list", "Brands with three or more sold comps go on the list."],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="text-sm">
                  <span className="font-medium">{title}</span>
                  <span className="block text-muted-foreground">{body}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link href="/community/pickups/new" className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85 sm:min-h-9">
            Post a pickup
          </Link>
        </div>
      ) : (
        <ul aria-label="Latest pickups" className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2 @xl:grid @xl:grid-cols-3 @xl:overflow-visible @xl:pb-0 @2xl:grid-cols-6">
          {pickups.map((p) => (
            <PickupCard key={p.id} p={p} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PickupCard({ p }: { p: Pickup }) {
  const x = multiple(p.paid, p.sold_price);
  return (
    <li className="group relative flex w-36 shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-card transition-colors focus-within:border-brand hover:border-brand/60 motion-reduce:transition-none @xl:w-auto">
      <div className="relative aspect-square bg-secondary">
        {p.photo_url ? (
          <Image src={p.photo_url} alt="" fill sizes="(min-width: 1024px) 180px, 144px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-7" aria-hidden="true" />
          </div>
        )}
        {p.sold_price !== null ? (
          <span className="absolute left-1.5 top-1.5 rounded bg-background/90 px-1.5 py-0.5 text-xs font-semibold text-success">Sold{x ? ` ${x}` : ""}</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2">
        <h3 className="line-clamp-2 text-xs font-medium leading-snug sm:text-sm">
          <Link href={`/community/pickups/${p.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </Link>
        </h3>
        <p className="mt-auto text-xs tabular-nums text-muted-foreground">
          Paid <span className="font-medium text-foreground">{gbp(p.paid)}</span>
          {p.sold_price !== null ? (
            <>
              , sold <span className="font-medium text-success">{gbp(p.sold_price)}</span>
            </>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {pickupSources[p.source_type]}
          {p.area ? `, ${p.area}` : ""}
        </p>
      </div>
    </li>
  );
}

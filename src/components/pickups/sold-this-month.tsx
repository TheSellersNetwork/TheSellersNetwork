import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { UserAvatar } from "@/components/forum/user-avatar";
import { gbp, multiple, ukMonthName, type Pickup } from "@/lib/pickups";
import { getSoldThisMonth } from "@/lib/pickups-queries";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";

/*
  This calendar month's sold pickups with the biggest multiples. Real rows
  only: until at least three pickups have sold this month the strip is not
  shown at all, rather than padded out with examples.
*/
export async function SoldThisMonth({ pickups: given }: { pickups?: Pickup[] } = {}) {
  const pickups = given ?? (await getSoldThisMonth());
  if (pickups.length === 0) return null;
  const month = ukMonthName();

  return (
    <section aria-labelledby="sold-month-heading" className="mt-6 rounded-xl border bg-card p-4">
      <h2 id="sold-month-heading" className="text-lg font-semibold tracking-tight">
        What sold in {month}
      </h2>
      <p className="text-sm text-muted-foreground">Members&rsquo; pickups sold this month, biggest multiple of the price paid first.</p>
      <ol className="-mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2" aria-label={`Top sold pickups in ${month}`}>
        {pickups.map((p, i) => (
          <SoldItem key={p.id} p={p} rank={i + 1} />
        ))}
      </ol>
    </section>
  );
}

function SoldItem({ p, rank }: { p: Pickup; rank: number }) {
  const x = multiple(p.paid, p.sold_price);
  return (
    <li className="group relative flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-lg border bg-background focus-within:border-brand hover:border-brand/60">
      <div className="relative aspect-square bg-secondary">
        {p.photo_url ? (
          <Image src={p.photo_url} alt="" fill sizes="160px" className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Package className="size-8" aria-hidden="true" />
          </div>
        )}
        {x ? (
          <span className="absolute bottom-2 left-2 rounded-md bg-success px-1.5 py-0.5 text-sm font-bold tabular-nums text-background">
            {x}
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">
          <Link href={`/community/pickups/${p.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            <span className="sr-only">Number {rank}: </span>
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </Link>
        </h3>
        <p className="text-sm tabular-nums">
          Paid <strong>{gbp(p.paid)}</strong>, sold <strong className="text-success">{gbp(p.sold_price)}</strong>
          {x ? <span className="sr-only">, {x} what was paid</span> : null}
        </p>
        {p.author ? (
          <p className="relative z-10 mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            <UserAvatar profile={p.author} size="xs" link={false} />
            <span>
              Found by{" "}
              <Link href={urls.profile(p.author.username)} className="hover:text-foreground hover:underline">
                {displayName(p.author)}
              </Link>
            </span>
          </p>
        ) : null}
      </div>
    </li>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { notFound } from "next/navigation";
import { MapPin, Package } from "lucide-react";
import { DeletePickup, MarkSold, NiceFind } from "@/components/pickups/pickup-actions";
import { UserAvatar } from "@/components/forum/user-avatar";
import { getCurrentUser } from "@/lib/auth";
import { getPickup } from "@/lib/pickups-queries";
import { gbp, multiple, pickupCategories, pickupPlatforms, pickupSources } from "@/lib/pickups";
import { displayName, longDate } from "@/lib/format";
import { siteConfig } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/community/pickups/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = await getPickup(id);
  if (!p) return {};
  const title = `${p.brand ? `${p.brand} ` : ""}${p.title} for ${gbp(p.paid)}`;
  return { title, description: `Picked up at a ${pickupSources[p.source_type].toLowerCase()} for ${gbp(p.paid)}.`, alternates: { canonical: `/community/pickups/${p.id}` } };
}

export default async function PickupPage({ params }: PageProps<"/community/pickups/[id]">) {
  const { id } = await params;
  const viewer = await getCurrentUser();
  const p = await getPickup(id, viewer?.id);
  if (!p) notFound();
  const own = viewer?.id === p.user_id;
  const x = multiple(p.paid, p.sold_price);
  const reportUrl = `/report?url=${encodeURIComponent(`${siteConfig.url}/pickups/${p.id}`)}`;

  return (
    <ForumShell source="/community/pickups" activeNav="pickups">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/community" className="hover:underline">
          Community
        </Link>
        {" / "}
        <Link href="/community/pickups" className="hover:underline">
          Pickups
        </Link>
      </nav>
      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border bg-secondary">
          {p.photo_url ? (
            <Image src={p.photo_url} alt={p.title} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Package className="size-16" aria-hidden="true" />
            </div>
          )}
        </div>
        <div>
          <h1 className="text-2xl font-semibold leading-tight tracking-tight">
            {p.brand ? `${p.brand}: ` : ""}
            {p.title}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" aria-hidden="true" />
              {pickupSources[p.source_type]}
              {p.area ? `, ${p.area}` : ""}
            </span>
            <Link href={`/community/pickups?category=${p.category}`} className="hover:underline">
              {pickupCategories[p.category]}
            </Link>
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Paid</dt>
              <dd className="text-xl font-semibold tabular-nums">{gbp(p.paid)}</dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">{p.sold_price !== null ? "Sold for" : "Hoping for"}</dt>
              <dd className={p.sold_price !== null ? "text-xl font-semibold tabular-nums text-success" : "text-xl font-semibold tabular-nums"}>
                {p.sold_price !== null ? gbp(p.sold_price) : p.expected !== null ? gbp(p.expected) : "?"}
              </dd>
            </div>
            <div className="rounded-lg bg-secondary p-3">
              <dt className="text-xs text-muted-foreground">Multiple</dt>
              <dd className="text-xl font-semibold tabular-nums">{x ?? multiple(p.paid, p.expected) ?? "?"}</dd>
            </div>
          </dl>
          {p.sold_price !== null ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sold on {pickupPlatforms[p.sold_platform ?? "other"]}
              {p.sold_at ? `, ${longDate(`${p.sold_at}T12:00:00Z`).split(" at")[0]}` : ""}. Before fees and postage.
            </p>
          ) : null}

          {p.note ? <p className="mt-6 whitespace-pre-line">{p.note}</p> : null}

          <div className="mt-6 flex items-center gap-3 text-sm">
            <UserAvatar profile={p.author} size="sm" />
            <span>
              {p.author ? (
                <Link href={`/community/u/${p.author.username}`} className="font-medium hover:underline">
                  {displayName(p.author)}
                </Link>
              ) : (
                "Deleted member"
              )}
              <span className="block text-xs text-muted-foreground">{longDate(p.created_at)}</span>
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <NiceFind id={p.id} liked={!!p.liked_by_me} count={p.like_count} signedIn={!!viewer} own={own} />
            {p.brand ? (
              <Link href={`/community/pickups?brand=${encodeURIComponent(p.brand)}`} className="text-sm underline">
                More {p.brand} pickups
              </Link>
            ) : null}
            {own ? <DeletePickup id={p.id} /> : null}
            {!own ? (
              <Link href={reportUrl} className="ml-auto text-xs text-muted-foreground underline">
                Report
              </Link>
            ) : null}
          </div>

          {own && p.sold_price === null ? (
            <div className="mt-6">
              <MarkSold id={p.id} />
            </div>
          ) : null}
        </div>
      </div>
    </ForumShell>
  );
}

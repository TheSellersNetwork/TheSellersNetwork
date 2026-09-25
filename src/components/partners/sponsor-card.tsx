"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { recordImpression } from "@/app/actions/placements";
import { track } from "@/lib/analytics/client";
import type { LivePlacement } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Props = { placement: LivePlacement; variant: "rail" | "row"; page: string };

/*
  A labelled sponsor unit. Impressions are recorded once the card is half
  visible; clicks go through /go/[id] so they are counted server-side.
*/
export function SponsorCard({ placement, variant, page }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const sent = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || sent.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !sent.current) {
          sent.current = true;
          void recordImpression(placement.id, page);
          track("sponsor_impression", { placement_id: placement.id, partner: placement.partner.slug, slot: placement.slot, page });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [placement.id, placement.partner.slug, placement.slot, page]);

  const href = `/go/${placement.id}`;
  const label = placement.partner.relationship === "affiliate" ? "Affiliate" : "Sponsored";

  return (
    <div ref={ref} className={cn("rounded-lg border bg-card", variant === "rail" ? "p-4" : "flex items-center gap-4 px-4 py-3")} aria-label={`${label}: ${placement.partner.name}`}>
      <div className={cn("flex items-center gap-3", variant === "row" && "min-w-0 flex-1")}>
        <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-background">
          {placement.partner.logo_url ? (
            <Image src={placement.partner.logo_url} alt="" width={40} height={40} className="size-full object-contain p-0.5" />
          ) : (
            <span className="font-semibold text-muted-foreground">{placement.partner.name.slice(0, 1)}</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {label} · {placement.partner.name}
          </p>
          <a href={href} rel="sponsored noopener" className="block font-semibold leading-snug hover:underline" onClick={() => track("sponsor_click", { placement_id: placement.id, partner: placement.partner.slug, slot: placement.slot, page })}>
            {placement.headline}
          </a>
          {variant === "rail" && placement.body ? <p className="mt-1 text-sm text-muted-foreground">{placement.body}</p> : null}
        </div>
      </div>
      <a href={href} rel="sponsored noopener" className={cn("text-sm font-medium text-brand underline underline-offset-2 hover:text-brand-deep", variant === "rail" ? "mt-3 inline-block" : "shrink-0")}>
        {placement.cta_label}
      </a>
    </div>
  );
}

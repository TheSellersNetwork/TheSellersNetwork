import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { LivePlacement, Partner, Placement, PlacementSlot } from "@/lib/db/types";

export const partnerCategories: { id: Partner["category"]; label: string }[] = [
  { id: "postage", label: "Postage and packaging" },
  { id: "bookkeeping", label: "Bookkeeping and tax" },
  { id: "sourcing", label: "Sourcing and stock" },
  { id: "software", label: "Software and automation" },
  { id: "other", label: "Other" },
];

export const relationshipLabels: Record<Partner["relationship"], string | null> = {
  partner: null,
  sponsored: "Sponsored",
  affiliate: "Affiliate link",
};

export const getPartners = cache(async (): Promise<Partner[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from("partners").select("*").eq("is_active", true).order("position").order("name");
  return (data ?? []) as Partner[];
});

/* One live placement for a slot, chosen by weighted random in the database. */
export const getLivePlacement = cache(async (slot: PlacementSlot): Promise<LivePlacement | null> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("live_placements", { p_slot: slot, p_limit: 1 });
  const placement = ((data ?? []) as Placement[])[0];
  if (!placement) return null;
  const { data: partner } = await supabase.from("partners").select("id, name, slug, url, logo_url, relationship").eq("id", placement.partner_id).maybeSingle();
  if (!partner) return null;
  return { ...placement, partner: partner as LivePlacement["partner"] };
});

export type PartnerAdminRow = Partner & {
  placements: (Placement & { impressions: number; clicks: number })[];
};

/* Everything for the staff page: partners, their placements and 30-day counts. */
export async function getPartnersForAdmin(): Promise<PartnerAdminRow[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: partners }, { data: placements }, { data: events }] = await Promise.all([
    supabase.from("partners").select("*").order("position").order("name"),
    supabase.from("placements").select("*").order("starts_at", { ascending: false }),
    supabase.from("placement_events").select("placement_id, kind").gte("created_at", since),
  ]);
  const counts = new Map<string, { impressions: number; clicks: number }>();
  for (const e of events ?? []) {
    const c = counts.get(e.placement_id as string) ?? { impressions: 0, clicks: 0 };
    if (e.kind === "click") c.clicks += 1;
    else c.impressions += 1;
    counts.set(e.placement_id as string, c);
  }
  return ((partners ?? []) as Partner[]).map((p) => ({
    ...p,
    placements: ((placements ?? []) as Placement[])
      .filter((pl) => pl.partner_id === p.id)
      .map((pl) => ({ ...pl, ...(counts.get(pl.id) ?? { impressions: 0, clicks: 0 }) })),
  }));
}

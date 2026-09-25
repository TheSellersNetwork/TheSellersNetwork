import { SponsorCard } from "@/components/partners/sponsor-card";
import { getLivePlacement } from "@/lib/partners/queries";
import type { PlacementSlot } from "@/lib/db/types";

/* Server wrapper: fetches one live placement for the slot, renders nothing when there is none. */
export async function SponsorSlot({ slot, page }: { slot: PlacementSlot; page: string }) {
  const placement = await getLivePlacement(slot);
  if (!placement) return null;
  return <SponsorCard placement={placement} variant={slot === "rail" ? "rail" : "row"} page={page} />;
}

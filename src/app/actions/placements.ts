"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/* A day-scoped hash of the IP so impressions dedupe without storing addresses. */
async function viewerHash(): Promise<string> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.PLACEMENT_HASH_SALT ?? "tsn";
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

export async function recordImpression(placementId: string, page: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(placementId)) return;
  const supabase = await createClient();
  await supabase.rpc("record_placement_event", { p_placement_id: placementId, p_kind: "impression", p_page: page, p_viewer_hash: await viewerHash() });
}

export async function recordClick(placementId: string, page: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(placementId)) return;
  const supabase = await createClient();
  await supabase.rpc("record_placement_event", { p_placement_id: placementId, p_kind: "click", p_page: page, p_viewer_hash: await viewerHash() });
}

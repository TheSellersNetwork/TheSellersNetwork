"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowAction, clientIp } from "@/lib/rate-limit";

/* A day-scoped hash of the IP so impressions dedupe without storing addresses. */
async function viewerHash(): Promise<string> {
  const ip = clientIp(await headers());
  const day = new Date().toISOString().slice(0, 10);
  const salt = process.env.PLACEMENT_HASH_SALT ?? "tsn";
  return createHash("sha256").update(`${salt}:${day}:${ip}`).digest("hex").slice(0, 32);
}

/* Sponsor numbers are recorded by the server only, and capped per visitor, so they cannot be inflated. */
async function record(placementId: string, kind: "impression" | "click", page: string) {
  if (!/^[0-9a-f-]{36}$/.test(placementId)) return;
  const hash = await viewerHash();
  if (!(await allowAction(`placement:${kind}:${hash}`, kind === "click" ? 20 : 200, "1 day"))) return;
  try {
    await createAdminClient().rpc("record_placement_event", { p_placement_id: placementId, p_kind: kind, p_page: page.slice(0, 200), p_viewer_hash: hash });
  } catch {
    // No service key locally.
  }
}

export async function recordImpression(placementId: string, page: string): Promise<void> {
  await record(placementId, "impression", page);
}

export async function recordClick(placementId: string, page: string): Promise<void> {
  await record(placementId, "click", page);
}

/*
  Shared types and labels for fee and policy changes. The changes themselves
  are MDX files in content/changes, loaded by src/lib/content/changes.ts.
  This file has no server imports so client components can use it.
*/

export type ChangePlatform = "ebay" | "amazon" | "vinted" | "etsy" | "depop" | "tiktok-shop" | "royal-mail" | "evri" | "hmrc" | "general";
export type ChangeStatus = "in-effect" | "coming" | "announced";
export type ChangeImpact = "high" | "medium" | "low";

export type ChangeMeta = {
  slug: string;
  title: string;
  platform: ChangePlatform;
  date: string;
  announced: string | null;
  status: ChangeStatus;
  impact: ChangeImpact;
  affects: string[];
  summary: string;
  source: string;
  sources: { title: string; url: string }[];
  forum: string;
  guides: string[];
  questions: string[];
  discussion: string | null;
  author: string;
};

export const platformLabels: Record<ChangePlatform, string> = {
  ebay: "eBay",
  amazon: "Amazon",
  vinted: "Vinted",
  etsy: "Etsy",
  depop: "Depop",
  "tiktok-shop": "TikTok Shop",
  "royal-mail": "Royal Mail",
  evri: "Evri",
  hmrc: "HMRC",
  general: "Everyone",
};

/* Category colour token for each platform, from tokens.css. */
export const platformColours: Record<ChangePlatform, string> = {
  ebay: "ebay",
  amazon: "amazon",
  vinted: "vinted",
  etsy: "etsy",
  depop: "website",
  "tiktok-shop": "live",
  "royal-mail": "general",
  evri: "general",
  hmrc: "general",
  general: "general",
};

export const impactLabels: Record<ChangeImpact, string> = {
  high: "Big change",
  medium: "Worth knowing",
  low: "Minor",
};

/* Status worked out from the date, so "coming" becomes "in effect" on the day without editing the file. */
export function effectiveStatus(c: Pick<ChangeMeta, "status" | "date">, today = new Date()): ChangeStatus {
  if (c.status === "announced") return "announced";
  return c.date > today.toISOString().slice(0, 10) ? "coming" : "in-effect";
}

export function formatChangeDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

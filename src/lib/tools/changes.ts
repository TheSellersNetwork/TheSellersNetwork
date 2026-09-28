import changes from "../../../content/policy-changes.json";

/*
  Fee and policy changes for UK sellers, newest first. Each entry links to the
  platform's own announcement or help page. Add new ones to
  content/policy-changes.json; the newsletter and the tracker page read it.
*/

export type ChangePlatform = "ebay" | "amazon" | "vinted" | "etsy" | "depop" | "tiktok-shop" | "royal-mail" | "evri" | "hmrc" | "general";

export type PolicyChange = { date: string; platform: ChangePlatform; title: string; summary: string; url: string; note?: string };

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

export function getPolicyChanges(): PolicyChange[] {
  return [...(changes as PolicyChange[])].sort((a, b) => b.date.localeCompare(a.date));
}

/*
  Site-wide configuration. Values that Tom is likely to change live here
  rather than being scattered through components.
*/

export type Brand = "navy" | "teal" | "slate" | "forest";

export const siteConfig = {
  name: "The Sellers Network",
  shortName: "Sellers Network",
  description:
    "A free forum for UK resellers on eBay, Amazon, Vinted, Whatnot, TikTok Shop and more. Straight answers, real numbers, no selling in the threads.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /* Chosen 25 September 2026: slate and electric blue. Other options remain at /brand for staff. */
  brand: (process.env.NEXT_PUBLIC_BRAND as Brand | undefined) ?? "slate",
  /* Marketplaces a member can pick during onboarding. Order is display order. */
  marketplaces: [
    { id: "ebay", label: "eBay" },
    { id: "amazon", label: "Amazon" },
    { id: "vinted", label: "Vinted" },
    { id: "etsy", label: "Etsy" },
    { id: "depop", label: "Depop" },
    { id: "facebook", label: "Facebook Marketplace" },
    { id: "own_website", label: "Own website or Shopify" },
    { id: "live", label: "Live selling (Whatnot, eBay Live, TikTok Live)" },
    { id: "other", label: "Other" },
  ],
} as const;

export type MarketplaceId = (typeof siteConfig.marketplaces)[number]["id"];

/*
  Site-wide configuration. Values that Tom is likely to change live here
  rather than being scattered through components.
*/

export type Brand = "navy" | "teal" | "slate" | "forest";

export const siteConfig = {
  name: "The Sellers Network",
  shortName: "Sellers Network",
  description:
    "The community for UK resellers. Real numbers, moderated answers and no selling in threads.",
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
    { id: "other", label: "Other" },
  ],
} as const;

export type MarketplaceId = (typeof siteConfig.marketplaces)[number]["id"];

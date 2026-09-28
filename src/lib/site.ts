/*
  Site-wide configuration. Values the owner is likely to change live here
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
  /*
    Who runs the site, shown on /about, /privacy, /terms and in the footer
    (E-Commerce Regulations 2002, reg 6). Set these in the environment once
    decided; pages show only what is set and fall back to the contact form.
  */
  legal: {
    operator: process.env.NEXT_PUBLIC_LEGAL_NAME || null,
    address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || null,
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
    companyNumber: process.env.NEXT_PUBLIC_COMPANY_NUMBER || null,
    icoNumber: process.env.NEXT_PUBLIC_ICO_NUMBER || null,
  },
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

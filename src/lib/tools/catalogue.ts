/* Every tool on /tools, grouped. Icons are names looked up on the page. `includes` lists what is inside a page that holds several tools. */

export type ToolIcon = "calculator" | "clock" | "tags" | "percent" | "tag" | "image" | "truck" | "calendar" | "file" | "coins" | "sheet" | "shield";

export type Tool = { href: string; title: string; description: string; icon: ToolIcon; badge?: string; includes?: string[] };

export const toolGroups: { title: string; tools: Tool[] }[] = [
  {
    title: "Money",
    tools: [
      {
        href: "/tools/calculator",
        title: "Fee and profit calculator",
        description: "What you keep after fees on eBay, Vinted, Depop, Etsy, Amazon, Amazon FBA, TikTok Shop, Whatnot and eBay Live, side by side or one platform at a time.",
        icon: "calculator",
        badge: "Most used",
        includes: ["Compare every platform at one price", "A calculator for each platform", "Amazon FBA profit and ROI", "Lowest offer you can accept", "eBay shop and live show planner"],
      },
      {
        href: "/tools/worth-it",
        title: "Is it worth it?",
        description: "Your real hourly rate on a flip against the National Living Wage, and whether a sourcing trip covers its mileage, parking and fees.",
        icon: "clock",
        includes: ["Hourly rate on one flip", "Sourcing trip cost"],
      },
      {
        href: "/tools/pricing",
        title: "Pricing",
        description: "What to list at from the sold prices you found, when to drop the price, bulk price changes, Amazon repricer floors and book lookups.",
        icon: "tags",
        includes: ["Sold prices summariser", "Stock ageing and price drops", "Bulk price change", "Amazon repricer floor prices", "ISBN checker"],
      },
      {
        href: "/tools/tax",
        title: "Tax and HMRC",
        description: "Self Assessment dates and thresholds from GOV.UK, whether your platforms will report you, and VAT sums for growing sellers.",
        icon: "percent",
        includes: ["Tax dates and thresholds", "Will my platform report me?", "VAT threshold, margin scheme and Flat Rate"],
      },
    ],
  },
  {
    title: "Selling",
    tools: [
      { href: "/tools/listing-builder", title: "Listing builder and copy pack", description: "One form, ready-to-paste titles, descriptions and tags for eBay, Vinted, Depop and Etsy, within each character limit.", icon: "tag" },
      { href: "/tools/background-remover", title: "Photo background remover", description: "White or clear backgrounds and square crops for listing photos, done on your device.", icon: "image" },
      {
        href: "/tools/postage",
        title: "Postage finder",
        description: "The cheapest Royal Mail and Evri service for your size and weight, and every Royal Mail, Evri and Parcelforce service your parcel fits.",
        icon: "truck",
        includes: ["Cheapest service", "Parcel size checker"],
      },
      { href: "/tools/calendar", title: "Reseller calendar", description: "Pokémon and Lego dates, sale days, fee changes and tax deadlines, with a calendar you can subscribe to.", icon: "calendar" },
    ],
  },
  {
    title: "Paperwork",
    tools: [
      {
        href: "/tools/sales-reports",
        title: "Sales reports and profit",
        description: "Upload the sales reports from your selling accounts and see sales, fees and profit by month and UK tax year. Nothing leaves your browser.",
        icon: "file",
        includes: ["Profit and loss from eBay, Amazon, Etsy, Depop, TikTok Shop or Whatnot", "Amazon settlement summariser"],
      },
      {
        href: "/tools/amazon-claims",
        title: "Amazon claims",
        description: "Find FBA stock lost or damaged in the warehouse and refunds never returned, with the last day to claim for each.",
        icon: "coins",
        includes: ["Reimbursement checker from your reports", "Claim deadline for one date"],
      },
      { href: "/tools/downloads", title: "Free spreadsheets", description: "Bookkeeping, stock tracker and sourcing log.", icon: "sheet" },
      { href: "/tools/scam-check", title: "Is this buyer a scam?", description: "A quick checklist for suspicious messages from buyers.", icon: "shield" },
    ],
  },
];

/* The platform pages of the fee and profit calculator, at /tools/calculator/<slug>, in switcher order. */
export const calculatorSlugs = ["ebay", "vinted", "depop", "etsy", "amazon", "amazon-fba", "tiktok-shop", "whatnot", "ebay-live"] as const;
export type CalculatorSlug = (typeof calculatorSlugs)[number];

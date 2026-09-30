/* Every tool on /tools, grouped. Icons are names looked up on the page. `includes` lists what is inside a page that holds several tools. */

export type ToolIcon = "calculator" | "clock" | "tags" | "percent" | "tag" | "image" | "truck" | "calendar" | "file" | "coins" | "sheet" | "shield" | "boxes" | "message" | "crop";

/* `keywords` are extra words for instant search only; they are not shown. */
export type Tool = { href: string; title: string; description: string; icon: ToolIcon; badge?: string; includes?: string[]; keywords?: string };

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
        description: "What an item is worth, what to list at from the sold prices you found, when to drop the price, bulk price changes, Amazon repricer floors and book lookups.",
        icon: "tags",
        includes: ["Sold prices summariser", "What's it worth? search links", "Stock ageing and price drops", "Bulk price change", "Amazon repricer floor prices", "ISBN checker"],
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
        description: "The cheapest Royal Mail and Evri service for your size and weight, every Royal Mail, Evri and Parcelforce service your parcel fits, and the settings for printing labels.",
        icon: "truck",
        includes: ["Cheapest service", "Parcel size checker", "Label printing settings"],
      },
      {
        href: "/tools/postage/christmas-last-posting-dates",
        title: "Christmas last posting dates",
        description: "The last day to post with Royal Mail, Parcelforce, Evri, InPost and DPD for delivery before Christmas, from each carrier's own website, with a countdown to the next cut-off.",
        icon: "calendar",
        keywords: "christmas xmas last posting dates cut-off deadline royal mail evri inpost yodel dpd parcelforce december",
      },
      {
        href: "/tools/label-cropper",
        title: "Shipping label cropper",
        description: "Crop the label out of A4 label PDFs, screenshots or photos and print it on 4x6, A6 or 100 x 150 mm labels, or 2 or 4 to an A4 sheet. Done on your device, so addresses never leave it.",
        icon: "crop",
        keywords: "crop resize shipping postage label pdf 4x6 6x4 a6 thermal printer",
      },
      {
        href: "/tools/vinted-label-cropper",
        title: "Vinted label cropper",
        description: "Turn a Vinted Evri or InPost label PDF or screenshot into a 4x6 thermal label, A6, or A4 sheets, with notes on which Vinted carriers need no printer at all.",
        icon: "crop",
        keywords: "vinted label print crop resize 4x6 6x4 a6 thermal printer evri inpost royal mail qr code",
      },
      {
        href: "/tools/buyer-messages",
        title: "Buyer message templates",
        description: "Polite replies to low offers, returns, items not received, requests to pay off the platform and more. Fill in the blanks and copy.",
        icon: "message",
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
      {
        href: "/tools/stock-tracker",
        title: "Stock tracker",
        description: "Your stock list with SKUs, costs, where each item is listed and what it made, with stock value, profit this month and tax year, and how long things have sat. Saved only on your device.",
        icon: "boxes",
      },
      { href: "/tools/downloads", title: "Free spreadsheets", description: "Bookkeeping, stock tracker and sourcing log.", icon: "sheet" },
      { href: "/tools/scam-check", title: "Is this buyer a scam?", description: "A quick checklist for suspicious messages from buyers.", icon: "shield" },
    ],
  },
];

/* The platform pages of the fee and profit calculator, at /tools/calculator/<slug>, in switcher order. */
export const calculatorSlugs = ["ebay", "vinted", "depop", "etsy", "amazon", "amazon-fba", "tiktok-shop", "whatnot", "ebay-live"] as const;
export type CalculatorSlug = (typeof calculatorSlugs)[number];

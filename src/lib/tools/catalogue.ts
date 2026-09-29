/* Every tool on /tools, grouped. Icons are names looked up on the page. */

export type ToolIcon = "scale" | "calculator" | "handshake" | "box" | "clock" | "car" | "radio" | "truck" | "package" | "file" | "calendar" | "receipt" | "shield" | "percent" | "history" | "sheet" | "book" | "tag" | "tags" | "trending" | "barcode" | "alarm" | "store" | "image" | "chart" | "floor" | "coins";

export type Tool = { href: string; title: string; description: string; icon: ToolIcon; badge?: string };

export const toolGroups: { title: string; tools: Tool[] }[] = [
  {
    title: "Fees and profit",
    tools: [
      { href: "/tools/where-to-sell", title: "Where should I sell this?", description: "One price, every platform: what you actually keep on eBay, Vinted, Depop, Etsy, TikTok Shop, Whatnot, Amazon and more.", icon: "scale", badge: "Most used" },
      { href: "/tools/fees/ebay", title: "eBay fee calculator", description: "Final value fee by category, per-order fee, regulatory fee and Promoted Listings.", icon: "calculator" },
      { href: "/tools/fees/vinted", title: "Vinted fee calculator", description: "What you keep, and what the buyer pays on top.", icon: "calculator" },
      { href: "/tools/fees/depop", title: "Depop fee calculator", description: "Payment processing and Boosted listings.", icon: "calculator" },
      { href: "/tools/fees/etsy", title: "Etsy fee calculator", description: "Every Etsy fee on one sale, including Offsite Ads.", icon: "calculator" },
      { href: "/tools/fees/tiktok-shop", title: "TikTok Shop fee calculator", description: "Commission on the sale including postage.", icon: "calculator" },
      { href: "/tools/fees/whatnot", title: "Whatnot fee calculator", description: "Commission, processing and VAT on fees.", icon: "calculator" },
      { href: "/tools/fees/ebay-live", title: "eBay Live fee calculator", description: "Capped commission and processing.", icon: "calculator" },
      { href: "/tools/fees/amazon", title: "Amazon fee calculator (you post it)", description: "Referral fees by category when you fulfil orders yourself.", icon: "calculator" },
      { href: "/tools/fba-calculator", title: "Amazon FBA profit calculator", description: "Referral, fulfilment, fuel surcharge, storage and VAT, with ROI and the most you can pay.", icon: "box" },
      { href: "/tools/repricer-floors", title: "Amazon repricer floor prices", description: "The lowest and highest price for every SKU from your costs and target profit, ready for Amazon's free Automate Pricing.", icon: "floor", badge: "New" },
      { href: "/tools/offer-calculator", title: "Lowest offer calculator", description: "The lowest offer you can accept and still make your profit.", icon: "handshake" },
      { href: "/tools/worth-my-time", title: "Is it worth my time?", description: "Your real hourly rate on a flip, against the National Living Wage.", icon: "clock" },
      { href: "/tools/trip-cost", title: "Sourcing trip cost", description: "Mileage, parking and fees against what the haul will make.", icon: "car" },
      { href: "/tools/show-planner", title: "Live show planner", description: "Lowest safe starting bids for Whatnot, eBay Live and TikTok shows.", icon: "radio" },
    ],
  },
  {
    title: "Your numbers and tax",
    tools: [
      { href: "/tools/profit-report", title: "Profit and loss from your sales reports", description: "Upload your eBay, Amazon, Etsy, Depop, TikTok or Whatnot report. Nothing leaves your browser.", icon: "file", badge: "New" },
      { href: "/tools/amazon-settlement", title: "Amazon settlement summariser", description: "Turn an Amazon settlement report into sales, fees, refunds and reserves, with a journal file for your bookkeeping.", icon: "receipt", badge: "New" },
      { href: "/tools/amazon-reimbursements", title: "Amazon reimbursement checker", description: "Find lost, damaged and unreturned units Amazon may owe you for, with the claim deadline for each.", icon: "coins", badge: "New" },
      { href: "/tools/reporting-check", title: "Will my platform report me to HMRC?", description: "Your sales on each platform against the reporting limits.", icon: "shield" },
      { href: "/tools/tax-dates", title: "Tax dates and thresholds", description: "Self Assessment deadlines and the numbers that matter, from GOV.UK.", icon: "calendar" },
      { href: "/tools/vat", title: "VAT calculators", description: "Threshold tracker, margin scheme and Flat Rate sums.", icon: "percent" },
      { href: "/tools/downloads", title: "Free spreadsheets", description: "Bookkeeping, stock tracker and sourcing log.", icon: "sheet" },
    ],
  },
  {
    title: "Listing and stock",
    tools: [
      { href: "/tools/listing-builder", title: "Listing builder and copy pack", description: "One form, ready-to-paste titles, descriptions and tags for eBay, Vinted, Depop and Etsy, within each character limit.", icon: "tag", badge: "New" },
      { href: "/tools/sold-comps", title: "Sold comps summariser", description: "Paste the sold prices you found and get the median, the range and what you keep after fees.", icon: "chart", badge: "New" },
      { href: "/tools/background-remover", title: "Photo background remover", description: "White or clear backgrounds and square crops for listing photos, done on your device.", icon: "image", badge: "New" },
      { href: "/tools/bulk-price", title: "Bulk price change", description: "Change prices across a listings file with rounding and a floor.", icon: "tags" },
      { href: "/tools/stock-ageing", title: "Stock ageing and price-drop planner", description: "Break-even price and when to mark it down.", icon: "trending" },
      { href: "/tools/isbn", title: "ISBN checker and book lookup", description: "Check an ISBN and find the edition.", icon: "barcode" },
      { href: "/tools/ebay-shop", title: "Is an eBay shop worth it?", description: "Listing fees with and without a shop.", icon: "store" },
    ],
  },
  {
    title: "Postage",
    tools: [
      { href: "/tools/postage-finder", title: "Cheapest postage finder", description: "Royal Mail and Evri services for your size and weight, cheapest first.", icon: "truck" },
      { href: "/tools/parcel-size", title: "Parcel size checker", description: "Every Royal Mail, Evri and Parcelforce service your parcel fits.", icon: "package" },
    ],
  },
  {
    title: "Staying safe and informed",
    tools: [
      { href: "/tools/scam-check", title: "Is this buyer a scam?", description: "A quick checklist for suspicious messages.", icon: "shield" },
      { href: "/tools/claims-deadline", title: "Amazon claims deadline", description: "The last day to claim for lost or damaged stock.", icon: "alarm" },
      { href: "/tools/calendar", title: "Reseller calendar", description: "Pokémon and Lego dates, sale days, fee changes and tax deadlines, with a calendar you can subscribe to.", icon: "calendar", badge: "New" },
      { href: "/blog?type=changes", title: "Fee and policy changes", description: "Every change on every platform, in plain English.", icon: "history" },
      { href: "/tools/glossary", title: "Seller glossary", description: "FBA, BSR, VeRO, INR and the rest, in plain words.", icon: "book" },
    ],
  },
];

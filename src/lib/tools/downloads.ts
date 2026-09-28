/* Free spreadsheets in public/downloads, each tied to the guide that explains how to use it. Rebuild with `npm run downloads:build`. */

export type DownloadFile = {
  id: "bookkeeping" | "stock" | "sourcing";
  title: string;
  file: string;
  description: string;
  sheets: string[];
  guide: { slug: string; title: string };
};

export const downloads: DownloadFile[] = [
  {
    id: "bookkeeping",
    title: "Bookkeeping spreadsheet",
    file: "/downloads/reseller-bookkeeping.xlsx",
    description: "Sales and expenses in one place, with profit per sale and totals by platform for any UK tax year.",
    sheets: ["Sales", "Expenses", "Summary by tax year and platform"],
    guide: { slug: "bookkeeping-and-tax-for-resellers", title: "Bookkeeping and tax for UK resellers" },
  },
  {
    id: "stock",
    title: "Stock tracker",
    file: "/downloads/stock-tracker.xlsx",
    description: "Every item you own, where it is listed and for how long. Flags anything that has sat too long so you can reprice or move it.",
    sheets: ["Stock, with days listed and an action flag"],
    guide: { slug: "stale-stock", title: "Stale stock: define it, mark it down, move it or write it off" },
  },
  {
    id: "sourcing",
    title: "Sourcing log",
    file: "/downloads/sourcing-log.xlsx",
    description: "Log each buy with the expected and actual profit. After a few months it shows which places are worth your Saturday.",
    sheets: ["Log, with expected profit and ROI", "By source comparison"],
    guide: { slug: "sourcing-for-resale", title: "Sourcing stock for resale in the UK" },
  },
];

export const tools = [
  { href: "/tools/parcel-size", title: "Parcel size checker", description: "Enter the size and weight. See which Royal Mail, Evri and Parcelforce services take it.", icon: "package" },
  { href: "/tools/tax-dates", title: "Tax dates and thresholds", description: "Self Assessment deadlines, platform reporting and the numbers that matter, from GOV.UK.", icon: "calendar" },
  { href: "/blog?type=changes", title: "Fee and policy changes", description: "Every change on eBay, Amazon, Vinted, Royal Mail and HMRC, broken down in plain English with what to do.", icon: "history" },
  { href: "/tools/downloads", title: "Free spreadsheets", description: "Bookkeeping, stock tracker and sourcing log. Excel, Numbers or Google Sheets.", icon: "sheet" },
  { href: "/tools/glossary", title: "Seller glossary", description: "FBA, BSR, VeRO, INR and the rest, in plain words.", icon: "book" },
] as const;

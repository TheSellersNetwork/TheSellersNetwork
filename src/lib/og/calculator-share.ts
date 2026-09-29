/*
  Shareable fee calculator results. The inputs travel in the query string
  (/tools/calculator/ebay?price=20&postage=0&postcost=3.2&cost=5), so the page
  opens with the same figures and the share card shows the same result.
  Pure, with no server imports: the calculator, its page and the image route
  all use it.
*/

import { calculate, platforms, type PlatformId, type Result, type Sale } from "@/lib/tools/fees";
import { calculatorSlugs, type CalculatorSlug } from "@/lib/tools/catalogue";

export type SharedInputs = {
  price: number;
  /* What the buyer pays you for postage. */
  postage: number;
  /* What the label and packaging cost you. */
  postageCost: number;
  /* What you paid for the item. */
  cost: number;
  /* eBay or Amazon category id, where the calculator has one. */
  category: string | null;
  /* True when "Add VAT to fees" is unticked. */
  noVat: boolean;
};

export const shareKeys = { price: "price", postage: "postage", postageCost: "postcost", cost: "cost", category: "cat", noVat: "novat" } as const;

type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

function read(q: QueryLike, key: string): string | undefined {
  if (q instanceof URLSearchParams) return q.get(key) ?? undefined;
  const v = q[key];
  return Array.isArray(v) ? v[0] : v;
}

/* A money amount from the query: 0 to 100,000, rounded to the penny. Anything else is null. */
export function readAmount(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === "") return null;
  const n = Number(raw.replace(/[£,\s]/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 100000) return null;
  return Math.round(n * 100) / 100;
}

/* The shared inputs, or null when the query has no usable selling price. */
export function parseShared(q: QueryLike): SharedInputs | null {
  const price = readAmount(read(q, shareKeys.price));
  if (price === null || price <= 0) return null;
  const cat = read(q, shareKeys.category);
  return {
    price,
    postage: readAmount(read(q, shareKeys.postage)) ?? 0,
    postageCost: readAmount(read(q, shareKeys.postageCost)) ?? 0,
    cost: readAmount(read(q, shareKeys.cost)) ?? 0,
    category: cat && /^[a-z0-9_-]{1,40}$/.test(cat) ? cat : null,
    noVat: read(q, shareKeys.noVat) === "1",
  };
}

/* The query string for a set of inputs, without the leading "?". Zero amounts and defaults are left out. */
export function sharedQuery(i: SharedInputs): string {
  const p = new URLSearchParams();
  p.set(shareKeys.price, String(i.price));
  if (i.postage > 0) p.set(shareKeys.postage, String(i.postage));
  if (i.postageCost > 0) p.set(shareKeys.postageCost, String(i.postageCost));
  if (i.cost > 0) p.set(shareKeys.cost, String(i.cost));
  if (i.category) p.set(shareKeys.category, i.category);
  if (i.noVat) p.set(shareKeys.noVat, "1");
  return p.toString();
}

/* The shared inputs as the strings the calculator's fields hold. */
export function sharedFieldValues(i: SharedInputs) {
  return { price: String(i.price), postageCharged: String(i.postage), postageCost: String(i.postageCost), itemCost: String(i.cost) };
}

/* Each calculator page: its short platform name, full title and fee engine id (FBA has its own calculator). */
export const calculatorPages: Record<CalculatorSlug, { platform: string; title: string; id: PlatformId | null }> = {
  ebay: { platform: "eBay", title: "eBay fee calculator", id: "ebay_business" },
  vinted: { platform: "Vinted", title: "Vinted fee calculator", id: "vinted" },
  depop: { platform: "Depop", title: "Depop fee calculator", id: "depop" },
  etsy: { platform: "Etsy", title: "Etsy fee calculator", id: "etsy" },
  amazon: { platform: "Amazon", title: "Amazon fee calculator (you post it)", id: "amazon_fbm" },
  "amazon-fba": { platform: "Amazon FBA", title: "Amazon FBA profit calculator", id: null },
  "tiktok-shop": { platform: "TikTok Shop", title: "TikTok Shop fee calculator", id: "tiktok_shop" },
  whatnot: { platform: "Whatnot", title: "Whatnot fee calculator", id: "whatnot" },
  "ebay-live": { platform: "eBay Live", title: "eBay Live fee calculator", id: "ebay_live" },
};

export function isCalculatorSlug(s: string | null | undefined): s is CalculatorSlug {
  return !!s && (calculatorSlugs as readonly string[]).includes(s);
}

export function toSale(i: SharedInputs, platform: PlatformId): Sale {
  const category = i.category ?? undefined;
  return {
    price: i.price,
    postageCharged: platform === "vinted" ? 0 : i.postage,
    postageCost: i.postageCost,
    itemCost: i.cost,
    ebayCategory: platform === "ebay_business" ? category : undefined,
    amazonCategory: platform === "amazon_fbm" ? category : undefined,
    vatOnFees: !i.noVat,
  };
}

export const gbp = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const gbp2 = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });

export type PlatformExample = { headline: string; result: Result; fees: string; receive: string; profit: string; showProfit: boolean };

/* One platform: "Sell for £20 on eBay, keep £16.62". */
export function platformExample(slug: CalculatorSlug, i: SharedInputs): PlatformExample | null {
  const page = calculatorPages[slug];
  if (!page.id) return null;
  const result = calculate(page.id, toSale(i, page.id));
  return {
    headline: `Sell for ${gbp(i.price)} on ${page.platform}, keep ${gbp2(result.youReceive)}`,
    result,
    fees: gbp2(result.fees),
    receive: gbp2(result.youReceive),
    profit: gbp2(result.profit),
    showProfit: i.cost > 0 || i.postageCost > 0,
  };
}

/* Every platform at one price, best profit first. eBay's private seller rate is left out, as on the page by default. */
export function compareExample(i: SharedInputs, limit = 4) {
  const rows = platforms
    .filter((p) => p.id !== "ebay_private")
    .map((p) => ({ name: p.name, result: calculate(p.id, toSale(i, p.id)) }))
    .sort((a, b) => b.result.profit - a.result.profit);
  return { headline: `Sell for ${gbp(i.price)}: what you keep on each platform`, rows: rows.slice(0, limit).map((r) => ({ name: r.name, receive: gbp2(r.result.youReceive), profit: gbp2(r.result.profit) })) };
}

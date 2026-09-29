/*
  The fee calculator's inputs as plain data: reading them from a link, writing
  them back into one, recomputing a saved calculation with today's fees, and
  comparing two items. Pure, with no server or React imports, so the pages,
  server actions and unit tests can all use it.
*/

import { calculate, fbaFees, feeData, platforms, type PlatformId, type Sale } from "@/lib/tools/fees";
import { calculatorPages, readAmount, sharedQuery, type SharedInputs } from "@/lib/og/calculator-share";
import type { CalculatorSlug } from "@/lib/tools/catalogue";

/* Which calculator a saved calculation came from: one platform, every platform at one price, or Amazon FBA. */
export type CalcKind = PlatformId | "all" | "amazon_fba";

export const calcKinds: readonly CalcKind[] = ["all", ...platforms.map((p) => p.id), "amazon_fba"];

export function isCalcKind(v: unknown): v is CalcKind {
  return typeof v === "string" && (calcKinds as readonly string[]).includes(v);
}

/* The options only some platforms have. All off by default. */
export type PlatformExtras = {
  promoted: number;
  boost: boolean;
  offsite: boolean;
  reduced: boolean;
  individual: boolean;
};

export type PlatformInputs = SharedInputs & PlatformExtras;

export type FbaInputs = {
  price: number;
  cost: number;
  inbound: number;
  prep: number;
  fulfil: number;
  category: string;
  months: number;
  cubic: number;
  peak: boolean;
};

export type CalcInputs = PlatformInputs | FbaInputs;

/* A result in the few numbers a saved calculation keeps. `best` is the winning platform on the "every platform" view. */
export type Outcome = { fees: number; youReceive: number; profit: number; margin: number | null; best?: string };

type QueryLike = URLSearchParams | Record<string, string | string[] | undefined>;

function read(q: QueryLike, key: string): string | undefined {
  if (q instanceof URLSearchParams) return q.get(key) ?? undefined;
  const v = q[key];
  return Array.isArray(v) ? v[0] : v;
}

const flag = (q: QueryLike, key: string) => read(q, key) === "1";
const r2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: unknown, lo: number, hi: number, fallback: number) => (typeof n === "number" && Number.isFinite(n) && n >= lo && n <= hi ? r2(n) : fallback);
const categoryOk = (c: unknown): c is string => typeof c === "string" && /^[a-z0-9_-]{1,40}$/.test(c);

export const noExtras: PlatformExtras = { promoted: 0, boost: false, offsite: false, reduced: false, individual: false };

/* ---- Links ---- */

export const extraKeys = { promoted: "promo", boost: "boost", offsite: "offsite", reduced: "reduced", individual: "indiv" } as const;

/* The platform-only options carried in a link (?promo=5&boost=1). */
export function readExtras(q: QueryLike): PlatformExtras {
  const promo = readAmount(read(q, extraKeys.promoted));
  return {
    promoted: promo !== null && promo <= 100 ? promo : 0,
    boost: flag(q, extraKeys.boost),
    offsite: flag(q, extraKeys.offsite),
    reduced: flag(q, extraKeys.reduced),
    individual: flag(q, extraKeys.individual),
  };
}

/* Only the options that apply to this platform, so links stay short. */
export function extrasQuery(platform: PlatformId, e: PlatformExtras): string {
  const p = new URLSearchParams();
  if (platform === "ebay_business" && e.promoted > 0) p.set(extraKeys.promoted, String(e.promoted));
  if (platform === "depop" && e.boost) p.set(extraKeys.boost, "1");
  if (platform === "etsy" && e.offsite) p.set(extraKeys.offsite, "1");
  if ((platform === "whatnot" || platform === "ebay_live") && e.reduced) p.set(extraKeys.reduced, "1");
  if (platform === "amazon_fbm" && e.individual) p.set(extraKeys.individual, "1");
  return p.toString();
}

export const fbaDefaults: FbaInputs = {
  price: 15,
  cost: 6,
  inbound: 0.3,
  prep: 0.2,
  fulfil: feeData.amazon.fbaExamples[7]?.fee ?? feeData.amazon.fbaExamples[0].fee,
  category: "toys",
  months: 2,
  cubic: 0.05,
  peak: false,
};

const fbaKeys = { price: "price", cost: "cost", inbound: "inbound", prep: "prep", fulfil: "fee", category: "fcat", months: "months", cubic: "cubic", peak: "peak" } as const;

/* FBA figures from a link, or null when the link has no selling price. Missing figures take the calculator's defaults. */
export function readFba(q: QueryLike): FbaInputs | null {
  const price = readAmount(read(q, fbaKeys.price));
  if (price === null || price <= 0) return null;
  const amount = (key: string, fallback: number, max = 100000) => {
    const v = readAmount(read(q, key));
    return v === null || v > max ? fallback : v;
  };
  const cat = read(q, fbaKeys.category);
  return {
    price,
    cost: amount(fbaKeys.cost, 0),
    inbound: amount(fbaKeys.inbound, 0),
    prep: amount(fbaKeys.prep, 0),
    fulfil: amount(fbaKeys.fulfil, fbaDefaults.fulfil, 1000),
    category: categoryOk(cat) && feeData.amazon.referral.some((c) => c.id === cat) ? cat : fbaDefaults.category,
    months: amount(fbaKeys.months, 0, 120),
    cubic: amount(fbaKeys.cubic, 0, 1000),
    peak: flag(q, fbaKeys.peak),
  };
}

export function fbaQuery(i: FbaInputs): string {
  const p = new URLSearchParams();
  p.set(fbaKeys.price, String(i.price));
  if (i.cost > 0) p.set(fbaKeys.cost, String(i.cost));
  if (i.inbound > 0) p.set(fbaKeys.inbound, String(i.inbound));
  if (i.prep > 0) p.set(fbaKeys.prep, String(i.prep));
  p.set(fbaKeys.fulfil, String(i.fulfil));
  p.set(fbaKeys.category, i.category);
  if (i.months > 0) p.set(fbaKeys.months, String(i.months));
  if (i.cubic > 0) p.set(fbaKeys.cubic, String(i.cubic));
  if (i.peak) p.set(fbaKeys.peak, "1");
  return p.toString();
}

/* The calculator page for each fee engine platform. eBay private and Facebook have no page of their own. */
export function slugFor(platform: PlatformId): CalculatorSlug | null {
  const hit = (Object.entries(calculatorPages) as [CalculatorSlug, { id: PlatformId | null }][]).find(([, v]) => v.id === platform);
  return hit ? hit[0] : null;
}

/* The calculator address that opens with these figures filled in. */
export function openHref(kind: CalcKind, inputs: CalcInputs): string {
  if (kind === "amazon_fba") return `/tools/calculator/amazon-fba?${fbaQuery(inputs as FbaInputs)}`;
  const i = inputs as PlatformInputs;
  if (kind === "all") return `/tools/calculator?${sharedQuery(i)}`;
  const slug = slugFor(kind);
  if (!slug) return `/tools/calculator?${sharedQuery(i)}`;
  const q = [sharedQuery(i), extrasQuery(kind, i)].filter(Boolean).join("&");
  return `/tools/calculator/${slug}?${q}`;
}

/* ---- Names ---- */

export function kindLabel(kind: CalcKind): string {
  if (kind === "all") return "every platform";
  if (kind === "amazon_fba") return "Amazon FBA";
  const slug = slugFor(kind);
  if (slug) return calculatorPages[slug].platform;
  return platforms.find((p) => p.id === kind)?.name ?? kind;
}

export const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
const gbpShort = (n: number) =>
  n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/* "£20 on eBay" */
export function defaultName(kind: CalcKind, inputs: CalcInputs): string {
  return `${gbpShort(inputs.price)} on ${kindLabel(kind)}`;
}

/* ---- Results ---- */

export function toPlatformSale(platform: PlatformId, i: PlatformInputs): Sale {
  return {
    price: i.price,
    postageCharged: platform === "vinted" ? 0 : i.postage,
    postageCost: i.postageCost,
    itemCost: i.cost,
    ebayCategory: platform === "ebay_business" && i.category ? i.category : "general",
    amazonCategory: platform === "amazon_fbm" && i.category ? i.category : "other",
    vatOnFees: !i.noVat,
    promotedPercent: platform === "ebay_business" ? i.promoted : 0,
    depopBoost: platform === "depop" && i.boost,
    etsyOffsiteAds: platform === "etsy" && i.offsite,
    reducedRate: (platform === "whatnot" || platform === "ebay_live") && i.reduced,
    amazonIndividual: platform === "amazon_fbm" && i.individual,
  };
}

const marginOf = (profit: number, price: number) => (price > 0 ? Math.round((profit / price) * 1000) / 10 : null);

export function fbaOutcome(i: FbaInputs): Outcome & { roi: number | null } {
  const f = fbaFees(i.price, i.fulfil, i.category, i.months, i.cubic, i.peak);
  const youReceive = r2(i.price - f.total);
  const profit = r2(youReceive - i.cost - i.inbound - i.prep);
  return { fees: f.total, youReceive, profit, margin: marginOf(profit, i.price), roi: i.cost > 0 ? Math.round((profit / i.cost) * 1000) / 10 : null };
}

/* The result for a set of inputs with the fees we hold today. */
export function outcome(kind: CalcKind, inputs: CalcInputs): Outcome {
  if (kind === "amazon_fba") {
    const { fees, youReceive, profit, margin } = fbaOutcome(inputs as FbaInputs);
    return { fees, youReceive, profit, margin };
  }
  const i = inputs as PlatformInputs;
  if (kind === "all") {
    // Every platform at this price, as the "where should I sell" view shows it, best profit first.
    const best = platforms
      .filter((p) => p.id !== "ebay_private")
      .map((p) => ({ p, r: calculate(p.id, { ...toPlatformSale(p.id, { ...i, ...noExtras }), ebayCategory: i.category ?? "general", amazonCategory: undefined }) }))
      .sort((a, b) => b.r.profit - a.r.profit)[0];
    return { fees: best.r.fees, youReceive: best.r.youReceive, profit: best.r.profit, margin: marginOf(best.r.profit, i.price), best: best.p.name };
  }
  const r = calculate(kind, toPlatformSale(kind, i));
  return { fees: r.fees, youReceive: r.youReceive, profit: r.profit, margin: marginOf(r.profit, i.price) };
}

/* True when today's fees give a different result from the one saved. */
export function outcomeChanged(saved: Partial<Outcome> | null | undefined, now: Outcome): boolean {
  if (!saved || typeof saved.fees !== "number" || typeof saved.profit !== "number") return false;
  return Math.abs(saved.fees - now.fees) >= 0.005 || Math.abs(saved.profit - now.profit) >= 0.005 || (saved.best !== undefined && saved.best !== now.best);
}

/* ---- Checking stored or submitted inputs ---- */

/* Inputs from the database or a form, checked and clamped. Null when they cannot be used. */
export function cleanInputs(kind: CalcKind, raw: unknown): CalcInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const price = clamp(o.price, 0.01, 100000, NaN);
  if (!Number.isFinite(price)) return null;
  if (kind === "amazon_fba") {
    return {
      price,
      cost: clamp(o.cost, 0, 100000, 0),
      inbound: clamp(o.inbound, 0, 100000, 0),
      prep: clamp(o.prep, 0, 100000, 0),
      fulfil: clamp(o.fulfil, 0, 1000, fbaDefaults.fulfil),
      category: categoryOk(o.category) ? o.category : fbaDefaults.category,
      months: clamp(o.months, 0, 120, 0),
      cubic: clamp(o.cubic, 0, 1000, 0),
      peak: o.peak === true,
    };
  }
  return {
    price,
    postage: clamp(o.postage, 0, 100000, 0),
    postageCost: clamp(o.postageCost, 0, 100000, 0),
    cost: clamp(o.cost, 0, 100000, 0),
    category: categoryOk(o.category) ? o.category : null,
    noVat: o.noVat === true,
    promoted: clamp(o.promoted, 0, 100, 0),
    boost: o.boost === true,
    offsite: o.offsite === true,
    reduced: o.reduced === true,
    individual: o.individual === true,
  };
}

/* ---- Compare two items ---- */

export type CompareItem = { platform: PlatformId; price: number; postage: number; postageCost: number; cost: number; category: string | null };
export type CompareState = { a: CompareItem; b: CompareItem; noVat: boolean };

export const compareDefaults: CompareState = {
  a: { platform: "ebay_business", price: 25, postage: 3.5, postageCost: 3.2, cost: 5, category: null },
  b: { platform: "vinted", price: 25, postage: 0, postageCost: 0, cost: 5, category: null },
  noVat: false,
};

const platformIds = platforms.map((p) => p.id) as string[];

function readItem(q: QueryLike, prefix: "a" | "b", fallback: CompareItem): CompareItem {
  const platform = read(q, `${prefix}_platform`);
  const price = readAmount(read(q, `${prefix}_price`));
  const cat = read(q, `${prefix}_cat`);
  return {
    platform: platform && platformIds.includes(platform) ? (platform as PlatformId) : fallback.platform,
    price: price !== null && price > 0 ? price : fallback.price,
    postage: readAmount(read(q, `${prefix}_postage`)) ?? (price !== null ? 0 : fallback.postage),
    postageCost: readAmount(read(q, `${prefix}_postcost`)) ?? (price !== null ? 0 : fallback.postageCost),
    cost: readAmount(read(q, `${prefix}_cost`)) ?? (price !== null ? 0 : fallback.cost),
    category: categoryOk(cat) ? cat : null,
  };
}

export function readCompare(q: QueryLike): CompareState {
  return { a: readItem(q, "a", compareDefaults.a), b: readItem(q, "b", compareDefaults.b), noVat: flag(q, "novat") };
}

export function compareQuery(s: CompareState): string {
  const p = new URLSearchParams();
  for (const prefix of ["a", "b"] as const) {
    const it = s[prefix];
    p.set(`${prefix}_platform`, it.platform);
    p.set(`${prefix}_price`, String(it.price));
    if (it.postage > 0) p.set(`${prefix}_postage`, String(it.postage));
    if (it.postageCost > 0) p.set(`${prefix}_postcost`, String(it.postageCost));
    if (it.cost > 0) p.set(`${prefix}_cost`, String(it.cost));
    if (it.category) p.set(`${prefix}_cat`, it.category);
  }
  if (s.noVat) p.set("novat", "1");
  return p.toString();
}

export function compareItemOutcome(it: CompareItem, noVat: boolean): Outcome & { feeShare: number | null } {
  const inputs: PlatformInputs = { price: it.price, postage: it.postage, postageCost: it.postageCost, cost: it.cost, category: it.category, noVat, ...noExtras };
  const o = outcome(it.platform, inputs);
  return { ...o, feeShare: it.price > 0 ? Math.round((o.fees / it.price) * 1000) / 10 : null };
}

/* Which item does better on a row, where higher is better unless `lowerIsBetter`. */
export function better(a: number | null, b: number | null, lowerIsBetter = false): "a" | "b" | null {
  if (a === null || b === null || Math.abs(a - b) < 0.005) return null;
  return (lowerIsBetter ? a < b : a > b) ? "a" : "b";
}

/* ---- The embeddable calculator ---- */

export type EmbedTheme = "light" | "dark";
export const readTheme = (v: string | string[] | undefined): EmbedTheme => ((Array.isArray(v) ? v[0] : v) === "dark" ? "dark" : "light");

/* The platforms the embed can show, by calculator page address. FBA has too many inputs for a small frame. */
export const embedSlugs = (Object.entries(calculatorPages) as [CalculatorSlug, { id: PlatformId | null; platform: string; title: string }][])
  .filter(([, v]) => v.id !== null)
  .map(([slug, v]) => ({ slug, id: v.id as PlatformId, platform: v.platform, title: v.title }));

export function readEmbedPlatform(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return embedSlugs.find((e) => e.slug === s) ?? null;
}


import fees from "../../../content/fees.json";

/*
  One fee engine for every calculator. Figures live in content/fees.json with
  their official sources and the date they were checked, so the daily change
  monitor can update one file and every tool follows.
*/

export const feeData = fees;
export type FeeData = typeof fees;

export type PlatformId = "ebay_private" | "ebay_business" | "vinted" | "depop" | "etsy" | "tiktok_shop" | "whatnot" | "ebay_live" | "facebook_collection" | "amazon_fbm";

export const platforms: { id: PlatformId; name: string; source: string; note?: string }[] = [
  { id: "ebay_private", name: "eBay (private seller)", source: fees.ebayPrivate.source, note: "Only if you are selling your own things. Buying to resell makes you a business seller." },
  { id: "ebay_business", name: "eBay (business seller)", source: fees.ebayBusiness.source },
  { id: "vinted", name: "Vinted", source: fees.vinted.source, note: "Vinted says standard accounts are for selling your own things; resellers need Vinted Pro, whose terms may differ." },
  { id: "depop", name: "Depop", source: fees.depop.source },
  { id: "etsy", name: "Etsy", source: fees.etsy.source, note: "Vintage (20 years or older) and craft supplies only for resold items." },
  { id: "tiktok_shop", name: "TikTok Shop", source: fees.tiktokShop.source, note: "Selling second-hand items on TikTok Shop UK is by invitation only." },
  { id: "whatnot", name: "Whatnot", source: fees.whatnot.source },
  { id: "ebay_live", name: "eBay Live", source: fees.ebayLive.source },
  { id: "amazon_fbm", name: "Amazon (you post it)", source: fees.amazon.source },
  { id: "facebook_collection", name: "Facebook Marketplace (collection)", source: "https://www.facebook.com/marketplace/", note: "No fee on cash-on-collection sales. The fee on shipped sales could not be confirmed, so it is not shown." },
];

export type Sale = {
  price: number;
  /* What the buyer pays you for postage (0 if postage is free or the buyer pays the carrier). */
  postageCharged: number;
  /* What the label and packaging cost you. */
  postageCost: number;
  itemCost: number;
  ebayCategory?: string;
  amazonCategory?: string;
  amazonIndividual?: boolean;
  depopBoost?: boolean;
  etsyOffsiteAds?: boolean;
  usdToGbp?: number;
  reducedRate?: boolean;
  /* Add UK VAT to fees that are charged plus VAT (true unless you reclaim it). */
  vatOnFees?: boolean;
  /* eBay Promoted Listings: the ad rate you chose, as a percentage of the total. */
  promotedPercent?: number;
  /* eBay: where the buyer's delivery address is. Anywhere but "uk" adds the international fee. */
  ebayDestination?: EbayDestination;
  /* eBay: sent through eBay International Shipping, which waives the international fee. */
  ebayIntlShipping?: boolean;
  /* eBay: listed or sold on another eBay site, so eBay converts the money and takes a charge. */
  ebayCurrencyConversion?: boolean;
  /* Whatnot: the category of the show or listing, and your tier (0 = Standard) from your last four weeks of sales. */
  whatnotCategory?: string;
  whatnotTier?: number;
  /* Whatnot: the order is in a category covered by the no-commission-above-£1,500 offer. */
  whatnotHighValue?: boolean;
  /* The day the sale happens, for fees that change on a set date. Defaults to today. */
  on?: Date;
};

export type EbayDestination = "uk" | "europe" | "us_ca" | "other";

export const whatnotTiers = fees.whatnot.tiers.map((t, i, all) => ({
  index: i,
  name: t.name,
  /* "£10,000 to £19,999 in four weeks" */
  range: i === all.length - 1 ? `£${t.from.toLocaleString("en-GB")} or more` : `£${t.from.toLocaleString("en-GB")} to £${(all[i + 1].from - 1).toLocaleString("en-GB")}`,
}));

/* Whatnot's commission rate for a category and tier. Unknown categories use "Other", unknown tiers use Standard. */
export function whatnotRate(category?: string, tier?: number): { percent: number; category: string; tier: string } {
  const cats = fees.whatnot.categories;
  const cat = cats.find((c) => c.id === category) ?? cats[0];
  const t = Number.isInteger(tier) && tier! >= 0 && tier! < fees.whatnot.tiers.length ? tier! : 0;
  return { percent: cat.rates[t], category: cat.name, tier: fees.whatnot.tiers[t].name };
}
export const ebayDestinations: { id: EbayDestination; name: string }[] = [
  { id: "uk", name: "UK" },
  ...fees.ebayBusiness.international.map((r) => ({ id: r.id as EbayDestination, name: r.name })),
];

/* Today's date in the UK as YYYY-MM-DD, so a fee change lands at midnight London time. */
function londonDay(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/* eBay's seller currency conversion charge on a given day (2.5%, rising to 2.75% on 1 December 2026). */
export function ebayCurrencyConversionPercent(on: Date = new Date()): number {
  const day = londonDay(on);
  let percent = fees.ebayInternational.currencyConversionPercent;
  for (const c of [...fees.ebayInternational.currencyConversionChanges].sort((a, b) => a.from.localeCompare(b.from))) {
    if (day >= c.from) percent = c.percent;
  }
  return percent;
}

/* The international fee and currency conversion lines for an eBay sale, private or business. */
function ebayAbroadLines(s: Sale, total: number, business: boolean): { lines: Line[]; vatable: number; notes: string[] } {
  const lines: Line[] = [];
  const notes: string[] = [];
  let vatable = 0;
  const dest = s.ebayDestination ?? "uk";
  if (dest !== "uk") {
    if (s.ebayIntlShipping) {
      notes.push("International fee waived: the order goes through eBay International Shipping.");
    } else if (business) {
      const region = fees.ebayBusiness.international.find((r) => r.id === dest) ?? fees.ebayBusiness.international[fees.ebayBusiness.international.length - 1];
      const fee = pct(total, region.percent);
      lines.push({ label: `International fee (${region.name}, ${region.percent}%)`, amount: fee });
      vatable += fee;
    } else {
      lines.push({ label: `International fee (${fees.ebayPrivate.internationalPercent}%)`, amount: pct(total, fees.ebayPrivate.internationalPercent) });
    }
  }
  if (s.ebayCurrencyConversion) {
    const rate = ebayCurrencyConversionPercent(s.on);
    lines.push({ label: `Currency conversion charge (${rate}%)`, amount: pct(total, rate) });
    notes.push("eBay takes the currency conversion charge inside its exchange rate, so it shows as a lower payout rather than a separate fee.");
  }
  return { lines, vatable, notes };
}

export type Line = { label: string; amount: number };
export type Result = {
  platform: PlatformId;
  lines: Line[];
  fees: number;
  /* What the buyer pays in total, where we know it. */
  buyerPays: number | null;
  youReceive: number;
  profit: number;
  notes: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (n: number, p: number) => (n * p) / 100;

function tiered(total: number, c: { percent: number; tierThreshold?: number; percentAbove?: number }) {
  if (c.tierThreshold && total > c.tierThreshold) return pct(c.tierThreshold, c.percent) + pct(total - c.tierThreshold, c.percentAbove ?? c.percent);
  return pct(total, c.percent);
}

export function calculate(platform: PlatformId, s: Sale): Result {
  const total = s.price + s.postageCharged;
  const lines: Line[] = [];
  const notes: string[] = [];
  let vatable = 0;
  let buyerPays: number | null = total;
  let received = total;

  switch (platform) {
    case "ebay_private": {
      notes.push("No selling fee for private sellers in most categories; buyers pay a Buyer Protection fee on top.");
      const abroad = ebayAbroadLines(s, total, false);
      lines.push(...abroad.lines);
      notes.push(...abroad.notes);
      break;
    }
    case "ebay_business": {
      const cats = fees.ebayBusiness.categories as { id: string; name: string; percent: number; wholeSaleThreshold?: number; percentAtThreshold?: number; tierThreshold?: number; percentAbove?: number }[];
      const cat = cats.find((c) => c.id === s.ebayCategory) ?? cats[0];
      const fvf = cat.wholeSaleThreshold && s.price >= cat.wholeSaleThreshold ? pct(total, cat.percentAtThreshold ?? cat.percent) : tiered(total, cat);
      lines.push({ label: `Final value fee (${cat.name})`, amount: fvf });
      lines.push({ label: "Per-order fee", amount: total > 10 ? fees.ebayBusiness.perOrderOver10 : fees.ebayBusiness.perOrder10OrUnder });
      lines.push({ label: "Regulatory operating fee", amount: pct(total, fees.ebayBusiness.regulatoryPercent) });
      if (s.promotedPercent) lines.push({ label: `Promoted Listings (${s.promotedPercent}%)`, amount: pct(total, s.promotedPercent) });
      vatable = lines.reduce((t, l) => t + l.amount, 0);
      const abroad = ebayAbroadLines(s, total, true);
      lines.push(...abroad.lines);
      vatable += abroad.vatable;
      notes.push(...abroad.notes);
      break;
    }
    case "ebay_live": {
      const rate = s.reducedRate ? fees.ebayLive.commissionPercentReduced : fees.ebayLive.commissionPercent;
      lines.push({ label: `Commission (${rate}%)`, amount: Math.min(pct(total, rate), fees.ebayLive.commissionCap) });
      lines.push({ label: "Payment processing", amount: pct(total, fees.ebayLive.processingPercent) + fees.ebayLive.processingFixed });
      vatable = lines.reduce((t, l) => t + l.amount, 0);
      break;
    }
    case "vinted": {
      // The buyer pays postage to the carrier and the Buyer Protection fee; the seller keeps the item price.
      received = s.price;
      buyerPays = s.price + pct(s.price, fees.vinted.buyerProtectionPercent) + fees.vinted.buyerProtectionFixed;
      notes.push(`The buyer pays postage and a Buyer Protection fee (about ${fees.vinted.buyerProtectionPercent}% + £${fees.vinted.buyerProtectionFixed.toFixed(2)}).`);
      break;
    }
    case "depop":
      lines.push({ label: "Payment processing", amount: pct(total, fees.depop.processingPercent) + fees.depop.processingFixed });
      if (s.depopBoost) lines.push({ label: `Boosted listing (${fees.depop.boostPercent}%)`, amount: pct(s.price, fees.depop.boostPercent) });
      notes.push("Buyers also pay a marketplace fee on top of your price.");
      break;
    case "etsy": {
      const rate = s.usdToGbp ?? 0.75;
      lines.push({ label: "Listing fee", amount: fees.etsy.listingFeeUsd * rate });
      lines.push({ label: `Transaction fee (${fees.etsy.transactionPercent}%)`, amount: pct(total, fees.etsy.transactionPercent) });
      lines.push({ label: "Payment processing", amount: pct(total, fees.etsy.processingPercent) + fees.etsy.processingFixed });
      lines.push({ label: "Regulatory operating fee", amount: pct(total, fees.etsy.regulatoryPercent) });
      if (s.etsyOffsiteAds) lines.push({ label: `Offsite Ads (${fees.etsy.offsiteAdsPercent}%)`, amount: pct(total, fees.etsy.offsiteAdsPercent) });
      vatable = lines.reduce((t, l) => t + l.amount, 0);
      break;
    }
    case "tiktok_shop":
      lines.push({ label: `Commission (${fees.tiktokShop.commissionPercent}%, VAT included)`, amount: pct(total, fees.tiktokShop.commissionPercent) });
      break;
    case "whatnot": {
      // Older links used "reduced" for coins.
      const w = whatnotRate(s.whatnotCategory ?? (s.reducedRate ? "coins" : undefined), s.whatnotTier);
      const hv = fees.whatnot.highValue.threshold;
      const commissionable = s.whatnotHighValue ? Math.min(s.price, hv) : s.price;
      lines.push({ label: `Commission (${w.category}, ${w.tier}, ${w.percent}% on the item price)`, amount: pct(commissionable, w.percent) });
      if (s.whatnotHighValue && s.price > hv) notes.push(`No commission on the £${(s.price - hv).toLocaleString("en-GB", { maximumFractionDigits: 2 })} above £${hv.toLocaleString("en-GB")} (Whatnot's high-value offer, which can end at any time).`);
      lines.push({ label: "Payment processing", amount: pct(total, fees.whatnot.processingPercent) + fees.whatnot.processingFixed });
      vatable = lines.reduce((t, l) => t + l.amount, 0);
      break;
    }
    case "amazon_fbm": {
      type Ref = { id: string; name: string; percent?: number; bands?: { upTo: number | null; percent: number }[]; tierThreshold?: number; percentAbove?: number; minimum?: number; closingFeeUnder5?: number; closingFee5Plus?: number };
      const refs = fees.amazon.referral as Ref[];
      const ref = refs.find((x) => x.id === s.amazonCategory) ?? refs[refs.length - 1];
      let referral = ref.bands
        ? pct(total, (ref.bands.find((b) => b.upTo === null || s.price <= b.upTo) ?? ref.bands[ref.bands.length - 1]).percent)
        : tiered(total, { percent: ref.percent ?? 15, tierThreshold: ref.tierThreshold, percentAbove: ref.percentAbove });
      if (ref.minimum) referral = Math.max(referral, ref.minimum);
      lines.push({ label: `Referral fee (${ref.name})`, amount: referral });
      if (ref.closingFeeUnder5) lines.push({ label: "Closing fee", amount: s.price < 5 ? ref.closingFeeUnder5 : (ref.closingFee5Plus ?? 0) });
      if (s.amazonIndividual) lines.push({ label: "Per-item fee (Individual plan)", amount: fees.amazon.individualPerItem });
      const sub = lines.reduce((t, l) => t + l.amount, 0);
      lines.push({ label: `Digital services fee (${fees.amazon.digitalServicesPercent}% of fees)`, amount: pct(sub, fees.amazon.digitalServicesPercent) });
      vatable = lines.reduce((t, l) => t + l.amount, 0);
      if (!s.amazonIndividual) notes.push(`Professional plan: £${fees.amazon.professionalMonthly} a month, not included here.`);
      break;
    }
    case "facebook_collection":
      buyerPays = s.price;
      received = s.price;
      notes.push("Cash or bank transfer on collection: no platform fee.");
      break;
  }

  if (s.vatOnFees !== false && vatable > 0) lines.push({ label: `VAT on fees (${fees.vatRate}%)`, amount: pct(vatable, fees.vatRate) });
  const feeTotal = r2(lines.reduce((t, l) => t + l.amount, 0));
  const youReceive = r2(received - feeTotal);
  const postageCost = platform === "vinted" || platform === "facebook_collection" ? 0 : s.postageCost;
  return {
    platform,
    lines: lines.map((l) => ({ ...l, amount: r2(l.amount) })),
    fees: feeTotal,
    buyerPays: buyerPays === null ? null : r2(buyerPays),
    youReceive,
    profit: r2(youReceive - postageCost - s.itemCost),
    notes,
  };
}

/*
  The lowest price at which profitAt(price) reaches the target, by halving the
  gap between 0 and £100,000. Assumes profit rises with price, which holds
  between fee band edges; callers with stepped fees should check the edges.
*/
export function solveMinimum(profitAt: (price: number) => number, targetProfit: number, from = 0): number | null {
  let lo = from;
  let hi = 100000;
  if (profitAt(hi) < targetProfit) return null;
  if (profitAt(lo) >= targetProfit) return Math.ceil(lo * 100) / 100;
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    if (profitAt(mid) >= targetProfit) hi = mid;
    else lo = mid;
  }
  // Round up to the penny, allowing for floating-point dust, then make sure the penny price still works.
  let p = Math.ceil(Math.round(hi * 1e6) / 1e4) / 100;
  if (profitAt(p) < targetProfit) p = Math.round((p + 0.01) * 100) / 100;
  return p;
}

/* The lowest price that still leaves the target profit. */
export function minimumPrice(platform: PlatformId, s: Omit<Sale, "price">, targetProfit: number): number | null {
  return solveMinimum((price) => calculate(platform, { ...s, price }).profit, targetProfit);
}

/* FBA fees on one unit. VAT on fees is added unless vatOnFees is false (for sellers who reclaim it). */
export function fbaFees(price: number, fulfilment: number, category: string, months: number, cubicFeet: number, peak: boolean, vatOnFees = true) {
  const referral = calculate("amazon_fbm", { price, postageCharged: 0, postageCost: 0, itemCost: 0, amazonCategory: category, vatOnFees: false });
  const referralFee = referral.lines.filter((l) => !/Digital services/.test(l.label)).reduce((t, l) => t + l.amount, 0);
  const fuel = pct(fulfilment, fees.amazon.fuelSurchargePercent);
  const storage = cubicFeet * months * (peak ? fees.amazon.storagePerCubicFoot.octDec : fees.amazon.storagePerCubicFoot.janSep);
  const beforeDst = referralFee + fulfilment + fuel + storage;
  const dst = pct(referralFee + fulfilment + fuel, fees.amazon.digitalServicesPercent);
  const vat = vatOnFees ? pct(beforeDst + dst, fees.vatRate) : 0;
  return { referralFee: r2(referralFee), fulfilment: r2(fulfilment), fuel: r2(fuel), storage: r2(storage), dst: r2(dst), vat: r2(vat), total: r2(beforeDst + dst + vat) };
}

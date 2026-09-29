import { parse } from "csv-parse/browser/esm/sync";
import { calculate, fbaFees, feeData, solveMinimum } from "./fees";

/*
  Minimum and maximum prices for Amazon's Automate Pricing, worked out from
  the seller's own costs and Amazon's fees in content/fees.json. Runs in the
  browser only.

  Output columns follow Amazon's Automate Pricing flat file template for the
  UK (Flat.File.AutomatePricing.uk.xls, downloaded from Amazon's seller
  templates on 29 September 2026): sku, minimum-seller-allowed-price,
  maximum-seller-allowed-price, rule-name, rule-action. The template says all
  fields are needed to put a SKU on a rule, rule-name must match the rule
  exactly, and rule-action is START or STOP. Amazon may change the template,
  so the page tells sellers to paste into the one they download.
*/

export type Fulfilment = "FBA" | "FBM";

export type SkuInput = {
  sku: string;
  cost: number;
  price: number | null;
  category: string;
  fulfilment: Fulfilment;
  /* The FBA fulfilment fee per unit, typed in or taken from a size tier. */
  fbaFee: number | null;
  /* Per unit: postage and packaging for FBM, shipping to Amazon and prep for FBA. */
  otherCosts: number;
  months: number;
  cubicFeet: number;
  notes: string[];
};

export type Rule = { kind: "profit" | "roi"; value: number };

export type Settings = {
  rule: Rule;
  vatOnFees: boolean;
  peak: boolean;
  maxMode: "multiple" | "current";
  maxFactor: number;
};

export type FloorRow = {
  input: SkuInput;
  target: number;
  min: number | null;
  max: number | null;
  feesAtMin: number | null;
  profitAtMin: number | null;
  problems: string[];
};

type Ref = { id: string; name: string; bands?: { upTo: number | null; percent: number }[]; closingFeeUnder5?: number };
const referral = feeData.amazon.referral as Ref[];
const r2 = (n: number) => Math.round(n * 100) / 100;

export function toNumber(s: string | undefined | null): number | null {
  if (s === undefined || s === null) return null;
  const t = String(s).replace(/[£,\s]/g, "").replace(/^gbp/i, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function matchCategory(s: string): string | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  const exact = referral.find((c) => c.id === t || c.name.toLowerCase() === t);
  if (exact) return exact.id;
  const partial = referral.find((c) => c.name.toLowerCase().includes(t) || t.includes(c.id));
  return partial?.id ?? null;
}

export function matchFulfilment(s: string): Fulfilment | null {
  const t = s.trim().toLowerCase();
  if (/^(fba|afn|amazon)/.test(t) || t.includes("amazon")) return "FBA";
  if (/^(fbm|mfn|merchant|default|seller|self)/.test(t)) return "FBM";
  return null;
}

export function matchSizeTier(s: string): number | null {
  const t = s.trim().toLowerCase();
  if (!t) return null;
  const tier = feeData.amazon.fbaExamples.find((x) => x.tier.toLowerCase() === t) ?? feeData.amazon.fbaExamples.find((x) => x.tier.toLowerCase().includes(t));
  return tier?.fee ?? null;
}

/* Header names we accept for each field, compared with case, spaces and punctuation removed. */
export const columnAliases: Record<string, string[]> = {
  sku: ["sku", "sellersku", "msku", "merchantsku"],
  cost: ["cost", "costprice", "unitcost", "costperunit", "buyprice", "cogs"],
  price: ["price", "currentprice", "yourprice", "sellingprice", "listingprice"],
  category: ["category", "referralcategory", "productcategory"],
  fulfilment: ["fulfilment", "fulfillment", "fulfilmentchannel", "fulfillmentchannel", "channel", "fbafbm"],
  fbaFee: ["fbafee", "fbafees", "fulfilmentfee", "fulfillmentfee", "fbafulfilmentfee", "fbafulfillmentfee"],
  sizeTier: ["sizetier", "tier"],
  otherCosts: ["othercosts", "othercost", "extracosts", "postage", "postagecost", "shipping", "shippingcost", "prep"],
  months: ["months", "storagemonths", "monthsinstorage"],
  cubicFeet: ["cubicfeet", "cubicfeetperunit", "cuft", "volume"],
};

export const templateHeaders = ["sku", "cost", "price", "category", "fulfilment", "fba-fee", "size-tier", "other-costs", "months", "cubic-feet"];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Defaults = { category: string; fulfilment: Fulfilment; fbaFee: number | null; otherCosts: number; months: number; cubicFeet: number };

export function parseSkus(text: string, d: Defaults): { rows: SkuInput[]; columns: Record<string, string | null>; skipped: string[] } {
  const clean = text.replace(/^﻿/, "");
  const first = clean.split(/\r?\n/)[0] ?? "";
  const delimiter = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  let records: string[][] = [];
  try {
    records = parse(clean, { delimiter, relax_column_count: true, skip_empty_lines: true, trim: true, relax_quotes: true }) as string[][];
  } catch {
    return { rows: [], columns: {}, skipped: ["The file could not be read as CSV or tab-separated text."] };
  }
  if (!records.length) return { rows: [], columns: {}, skipped: [] };
  const headers = records[0];
  const columns: Record<string, string | null> = {};
  const index: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(columnAliases)) {
    const i = headers.findIndex((h) => aliases.includes(norm(h)));
    columns[field] = i >= 0 ? headers[i] : null;
    if (i >= 0) index[field] = i;
  }
  const rows: SkuInput[] = [];
  const skipped: string[] = [];
  records.slice(1).forEach((rec, n) => {
    const get = (f: string) => (index[f] === undefined ? "" : (rec[index[f]] ?? "").trim());
    const sku = get("sku");
    const cost = toNumber(get("cost"));
    if (!sku && rec.every((c) => !c.trim())) return;
    if (!sku || cost === null) {
      skipped.push(`Row ${n + 2}: ${!sku ? "no SKU" : `no cost price for ${sku}`}.`);
      return;
    }
    const notes: string[] = [];
    let category = d.category;
    if (get("category")) {
      const c = matchCategory(get("category"));
      if (c) category = c;
      else notes.push(`Category "${get("category")}" not recognised, so the default was used.`);
    }
    let fulfilment = d.fulfilment;
    if (get("fulfilment")) {
      const f = matchFulfilment(get("fulfilment"));
      if (f) fulfilment = f;
      else notes.push(`Fulfilment "${get("fulfilment")}" not recognised, so the default was used.`);
    }
    let fbaFee = toNumber(get("fbaFee"));
    if (fbaFee === null && get("sizeTier")) {
      fbaFee = matchSizeTier(get("sizeTier"));
      if (fbaFee === null) notes.push(`Size tier "${get("sizeTier")}" not recognised.`);
    }
    rows.push({
      sku,
      cost,
      price: toNumber(get("price")),
      category,
      fulfilment,
      fbaFee: fbaFee ?? d.fbaFee,
      otherCosts: toNumber(get("otherCosts")) ?? d.otherCosts,
      months: toNumber(get("months")) ?? d.months,
      cubicFeet: toNumber(get("cubicFeet")) ?? d.cubicFeet,
      notes,
    });
  });
  return { rows, columns, skipped };
}

/* Prices where Amazon's fee steps up or down in one go, so profit can dip just above them. */
export function breakpoints(category: string): number[] {
  const ref = referral.find((c) => c.id === category);
  const out: number[] = [];
  for (const b of ref?.bands ?? []) if (b.upTo !== null) out.push(b.upTo);
  if (ref?.closingFeeUnder5) out.push(5);
  return out.sort((a, b) => a - b);
}

export function profitAt(input: SkuInput, price: number, s: Pick<Settings, "vatOnFees" | "peak">): { profit: number; fees: number } {
  if (input.fulfilment === "FBA") {
    const f = fbaFees(price, input.fbaFee ?? 0, input.category, input.months, input.cubicFeet, s.peak, s.vatOnFees);
    return { profit: price - f.total - input.cost - input.otherCosts, fees: f.total };
  }
  const r = calculate("amazon_fbm", { price, postageCharged: 0, postageCost: input.otherCosts, itemCost: input.cost, amazonCategory: input.category, vatOnFees: s.vatOnFees });
  return { profit: r.profit, fees: r.fees };
}

/*
  The lowest price that meets the rule and stays met above it. Referral bands
  (clothing at 5% up to £15, then 10% of the whole price) can make profit
  drop just above a band edge, so we check each edge and move the floor up
  past any that break the rule.
*/
export function floorPrice(input: SkuInput, target: number, s: Pick<Settings, "vatOnFees" | "peak">): number | null {
  const f = (p: number) => profitAt(input, p, s).profit;
  let c = solveMinimum(f, target);
  if (c === null) return null;
  const bps = breakpoints(input.category);
  for (let guard = 0; guard < bps.length * 2 + 1; guard += 1) {
    const current = c;
    const failing = bps.flatMap((bp) => [bp, r2(bp + 0.01)]).filter((p) => p >= current && f(p) < target);
    if (!failing.length) break;
    const next = solveMinimum(f, target, Math.max(...failing));
    if (next === null) return null;
    c = next;
  }
  return c;
}

export function computeFloors(rows: SkuInput[], s: Settings): FloorRow[] {
  return rows.map((input) => {
    const problems = [...input.notes];
    const target = r2(s.rule.kind === "profit" ? s.rule.value : (input.cost * s.rule.value) / 100);
    if (input.fulfilment === "FBA" && input.fbaFee === null) {
      problems.push("No FBA fee: add an fba-fee or size-tier column, or set a default.");
      return { input, target, min: null, max: null, feesAtMin: null, profitAtMin: null, problems };
    }
    const min = floorPrice(input, target, s);
    if (min === null) {
      problems.push("No price meets the rule.");
      return { input, target, min: null, max: null, feesAtMin: null, profitAtMin: null, problems };
    }
    const at = profitAt(input, min, s);
    let max: number | null;
    if (s.maxMode === "multiple") max = r2(min * s.maxFactor);
    else if (input.price === null) {
      max = null;
      problems.push("No current price, so no maximum.");
    } else max = r2(input.price * s.maxFactor);
    if (max !== null && max < min) {
      problems.push("The maximum worked out below the minimum, so it is set to the minimum.");
      max = min;
    }
    if (input.price !== null && input.price < min) problems.push(`Current price ${input.price.toFixed(2)} is below this minimum.`);
    return { input, target, min, max, feesAtMin: r2(at.fees), profitAtMin: r2(at.profit), problems };
  });
}

const cell = (c: string, delimiter: string) => (c.includes(delimiter) || /["\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c);

/* The file for Amazon's Automate Pricing upload. Rows without a minimum and maximum are left out. */
export function amazonFile(rows: FloorRow[], ruleName: string, delimiter: "," | "\t" = ","): string {
  const withRule = ruleName.trim().length > 0;
  const head = ["sku", "minimum-seller-allowed-price", "maximum-seller-allowed-price", ...(withRule ? ["rule-name", "rule-action"] : [])];
  const lines = rows
    .filter((r) => r.min !== null && r.max !== null)
    .map((r) => [r.input.sku, r.min!.toFixed(2), r.max!.toFixed(2), ...(withRule ? [ruleName.trim(), "START"] : [])]);
  return [head, ...lines].map((l) => l.map((c) => cell(c, delimiter)).join(delimiter)).join("\r\n");
}

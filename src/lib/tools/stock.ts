import { parseCsv, parseDate, parseMoney, toCsv } from "./sales-report";

/*
  The stock tracker's records and sums. Everything here is pure so it can be
  tested; the component keeps the list in the browser (localStorage) and never
  sends it anywhere. Dates are stored as YYYY-MM-DD strings.
*/

export const STOCK_STORAGE_KEY = "tsn-stock-tracker-v1";

export const stockStatuses = ["in_stock", "listed", "sold", "returned", "written_off"] as const;
export type StockStatus = (typeof stockStatuses)[number];

export const statusLabels: Record<StockStatus, string> = {
  in_stock: "In stock",
  listed: "Listed",
  sold: "Sold",
  returned: "Returned",
  written_off: "Written off",
};

/* The words the free stock tracker spreadsheet uses in its Status column, so an export opens cleanly there. */
const spreadsheetStatus: Record<StockStatus, string> = {
  in_stock: "Not listed",
  listed: "Listed",
  sold: "Sold",
  returned: "Returned",
  written_off: "Written off",
};

export const stockSources = ["Car boot sale", "Charity shop", "Online (eBay, Vinted and similar)", "Auction", "Clearance or retail", "Wholesale or pallet", "House clearance", "Own things", "Other"] as const;

export const stockPlatforms = ["eBay", "Vinted", "Depop", "Etsy", "Amazon", "Facebook Marketplace", "TikTok Shop", "Whatnot", "eBay Live", "Own website", "Other"] as const;

export type StockItem = {
  id: string;
  sku: string;
  item: string;
  location: string;
  source: string;
  bought: string;
  cost: number | null;
  platforms: string[];
  listed: string;
  price: number | null;
  status: StockStatus;
  soldPrice: number | null;
  soldOn: string;
  fees: number | null;
  postage: number | null;
  notes: string;
};

export function emptyItem(id: string): StockItem {
  return { id, sku: "", item: "", location: "", source: "", bought: "", cost: null, platforms: [], listed: "", price: null, status: "in_stock", soldPrice: null, soldOn: "", fees: null, postage: null, notes: "" };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/* ---- SKUs ---- */

/*
  The next stock number, following the storage and stock numbers guide:
  sequential numbers starting at 1001, never reused. If the most recent SKU
  has a prefix (C1004, B-0017, 2610-003), the suggestion keeps that prefix and
  its zero padding. Numbers already used with the same prefix are skipped.
*/
export function suggestSku(existing: string[]): string {
  const parsed = existing
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => /^(.*?)(\d+)$/.exec(s))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ prefix: m[1], digits: m[2], n: Number(m[2]) }));
  if (!parsed.length) return "1001";
  const last = parsed[parsed.length - 1];
  const same = parsed.filter((p) => p.prefix === last.prefix);
  const next = Math.max(...same.map((p) => p.n)) + 1;
  const width = last.digits.startsWith("0") ? last.digits.length : 0;
  return `${last.prefix}${String(next).padStart(width, "0")}`;
}

/* ---- Dates ---- */

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const dayNumber = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 : null;
};

/* Days from buying to selling, or to today if it has not sold. Null without a date bought. */
export function daysHeld(it: StockItem, today: string): number | null {
  const from = dayNumber(it.bought);
  if (from === null) return null;
  const to = dayNumber(it.status === "sold" && it.soldOn ? it.soldOn : today);
  return to === null ? null : Math.max(0, Math.round(to - from));
}

/* Days since it was listed, as the spreadsheet's Days listed column works it out. */
export function daysListed(it: StockItem, today: string): number | null {
  const from = dayNumber(it.listed);
  if (from === null) return null;
  if (it.status === "sold") {
    const to = dayNumber(it.soldOn);
    return to === null ? null : Math.max(0, Math.round(to - from));
  }
  const to = dayNumber(today);
  return to === null ? null : Math.max(0, Math.round(to - from));
}

/* First day of the UK tax year that contains the date: 6 April. */
export function taxYearStart(today: string): string {
  const [y, m, d] = today.split("-").map(Number);
  const start = m > 4 || (m === 4 && d >= 6) ? y : y - 1;
  return `${start}-04-06`;
}

export const taxYearLabel = (today: string) => {
  const start = Number(taxYearStart(today).slice(0, 4));
  return `${start} to ${String(start + 1).slice(2)}`;
};

/* ---- Money ---- */

/* Profit on a sold item: sold price less cost, fees and postage. Null if it has not sold. */
export function profit(it: StockItem): number | null {
  if (it.status !== "sold" || it.soldPrice === null) return null;
  return r2(it.soldPrice - (it.cost ?? 0) - (it.fees ?? 0) - (it.postage ?? 0));
}

export type StockTotals = {
  held: number;
  stockValue: number;
  soldThisMonth: number;
  salesThisMonth: number;
  profitThisMonth: number;
  soldThisTaxYear: number;
  profitThisTaxYear: number;
  writtenOff: number;
  writtenOffCost: number;
};

const unsold = (s: StockStatus) => s === "in_stock" || s === "listed" || s === "returned";

export function totals(items: StockItem[], today: string): StockTotals {
  const month = today.slice(0, 7);
  const tyStart = taxYearStart(today);
  const t: StockTotals = { held: 0, stockValue: 0, soldThisMonth: 0, salesThisMonth: 0, profitThisMonth: 0, soldThisTaxYear: 0, profitThisTaxYear: 0, writtenOff: 0, writtenOffCost: 0 };
  for (const it of items) {
    if (unsold(it.status)) {
      t.held += 1;
      t.stockValue += it.cost ?? 0;
    } else if (it.status === "written_off") {
      t.writtenOff += 1;
      t.writtenOffCost += it.cost ?? 0;
    } else if (it.status === "sold" && it.soldOn) {
      const p = profit(it) ?? 0;
      if (it.soldOn.slice(0, 7) === month) {
        t.soldThisMonth += 1;
        t.salesThisMonth += it.soldPrice ?? 0;
        t.profitThisMonth += p;
      }
      if (it.soldOn >= tyStart && it.soldOn <= today) {
        t.soldThisTaxYear += 1;
        t.profitThisTaxYear += p;
      }
    }
  }
  for (const k of ["stockValue", "salesThisMonth", "profitThisMonth", "profitThisTaxYear", "writtenOffCost"] as const) t[k] = r2(t[k]);
  return t;
}

export const ageBands = [
  { id: "0-30", label: "Up to 30 days", min: 0, max: 30 },
  { id: "31-60", label: "31 to 60 days", min: 31, max: 60 },
  { id: "61-90", label: "61 to 90 days", min: 61, max: 90 },
  { id: "90+", label: "Over 90 days", min: 91, max: Infinity },
] as const;

/* Unsold stock grouped by days held, with the money tied up in each group. Items with no date bought are counted apart. */
export function ageing(items: StockItem[], today: string) {
  const bands = ageBands.map((b) => ({ ...b, count: 0, cost: 0 }));
  let undated = 0;
  for (const it of items) {
    if (!unsold(it.status)) continue;
    const d = daysHeld(it, today);
    if (d === null) {
      undated += 1;
      continue;
    }
    const b = bands.find((x) => d >= x.min && d <= x.max)!;
    b.count += 1;
    b.cost = r2(b.cost + (it.cost ?? 0));
  }
  return { bands, undated };
}

/* ---- Search and filters ---- */

export type StockFilter = { query: string; status: StockStatus | "all" | "unsold"; platform: string; source: string };

export function filterItems(items: StockItem[], f: StockFilter): StockItem[] {
  const q = f.query.trim().toLowerCase();
  return items.filter((it) => {
    if (f.status === "unsold" ? !unsold(it.status) : f.status !== "all" && it.status !== f.status) return false;
    if (f.platform && !it.platforms.includes(f.platform)) return false;
    if (f.source && it.source !== f.source) return false;
    if (q && ![it.sku, it.item, it.location, it.source, it.notes, it.platforms.join(" ")].join(" ").toLowerCase().includes(q)) return false;
    return true;
  });
}

/* ---- Export and import ---- */

/*
  CSV columns: the free stock tracker spreadsheet's columns first, in its order
  (SKU to Date sold, then Days listed and Profit), then the extra details this
  tracker keeps. Profit here is after fees and postage when those are filled in.
*/
export const csvHeaders = [
  "SKU",
  "Item",
  "Location",
  "Bought on",
  "Cost",
  "Listed on",
  "Date listed",
  "Asking price",
  "Status",
  "Sold price",
  "Date sold",
  "Days listed",
  "Profit",
  "Source",
  "Fees",
  "Postage",
  "Days held",
  "Notes",
] as const;

const money = (n: number | null) => (n === null ? "" : n.toFixed(2));
const ukDate = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");

export function toStockCsv(items: StockItem[], today: string): string {
  const rows: string[][] = [[...csvHeaders]];
  for (const it of items) {
    rows.push([
      it.sku,
      it.item,
      it.location,
      ukDate(it.bought),
      money(it.cost),
      it.platforms.join(", "),
      ukDate(it.listed),
      money(it.price),
      spreadsheetStatus[it.status],
      money(it.soldPrice),
      ukDate(it.soldOn),
      String(daysListed(it, today) ?? ""),
      money(profit(it)),
      it.source,
      money(it.fees),
      money(it.postage),
      String(daysHeld(it, today) ?? ""),
      it.notes,
    ]);
  }
  // toCsv quotes commas, quotes and line breaks. A leading = + - @ is prefixed so a spreadsheet never runs it as a formula.
  return toCsv(rows.map((r) => r.map((c) => (/^[=+\-@]/.test(c) && !/^-?\d/.test(c) ? `'${c}` : c))));
}

export function toStockJson(items: StockItem[]): string {
  return JSON.stringify({ format: "tsn-stock-tracker", version: 1, items }, null, 2);
}

function readStatus(v: string | undefined): StockStatus {
  const s = (v ?? "").trim().toLowerCase();
  if (s === "sold") return "sold";
  if (s === "listed") return "listed";
  if (s === "returned") return "returned";
  if (s === "written off" || s === "written_off" || s === "writtenoff") return "written_off";
  return "in_stock";
}

const readMoney = (v: string | undefined) => (v === undefined || v.trim() === "" ? null : r2(parseMoney(v)));
const readDate = (v: string | undefined) => {
  const d = parseDate(v);
  return d ? d.toISOString().slice(0, 10) : "";
};
const text = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? r2(v) : null);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

/* Reads a CSV from this tracker or the free spreadsheet (matched by column name, so column order does not matter). */
export function fromStockCsv(csv: string, makeId: () => string): StockItem[] {
  const { rows } = parseCsv(csv);
  const pick = (row: Record<string, string>, name: string) => {
    const key = Object.keys(row).find((k) => k.trim().toLowerCase() === name.toLowerCase());
    return key ? row[key]?.replace(/^'(?=[=+\-@])/, "") : undefined;
  };
  return rows
    .map((row) => ({
      ...emptyItem(makeId()),
      sku: text(pick(row, "SKU"), 60),
      item: text(pick(row, "Item")),
      location: text(pick(row, "Location"), 120),
      bought: readDate(pick(row, "Bought on")),
      cost: readMoney(pick(row, "Cost")),
      platforms: (pick(row, "Listed on") ?? "")
        .split(/[,;/]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 12),
      listed: readDate(pick(row, "Date listed")),
      price: readMoney(pick(row, "Asking price")),
      status: readStatus(pick(row, "Status")),
      soldPrice: readMoney(pick(row, "Sold price")),
      soldOn: readDate(pick(row, "Date sold")),
      source: text(pick(row, "Source"), 120),
      fees: readMoney(pick(row, "Fees")),
      postage: readMoney(pick(row, "Postage")),
      notes: text(pick(row, "Notes"), 2000),
    }))
    .filter((it) => it.sku || it.item);
}

/* Reads a JSON backup from this tracker. Anything that is not the expected shape is dropped rather than trusted. */
export function fromStockJson(json: string, makeId: () => string, keepIds = false): StockItem[] {
  const data = JSON.parse(json) as unknown;
  const list = Array.isArray(data) ? data : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items) ? (data as { items: unknown[] }).items : null;
  if (!list) throw new Error("This file is not a stock tracker backup.");
  return list
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      id: keepIds && typeof x.id === "string" && x.id ? x.id.slice(0, 64) : makeId(),
      sku: text(x.sku, 60),
      item: text(x.item),
      location: text(x.location, 120),
      source: text(x.source, 120),
      bought: date(x.bought),
      cost: num(x.cost),
      platforms: Array.isArray(x.platforms) ? x.platforms.filter((p): p is string => typeof p === "string").slice(0, 12) : [],
      listed: date(x.listed),
      price: num(x.price),
      status: stockStatuses.includes(x.status as StockStatus) ? (x.status as StockStatus) : "in_stock",
      soldPrice: num(x.soldPrice),
      soldOn: date(x.soldOn),
      fees: num(x.fees),
      postage: num(x.postage),
      notes: text(x.notes, 2000),
    }))
    .filter((it) => it.sku || it.item);
}

/* Reads whatever was saved in the browser; a damaged or missing store gives an empty list. */
export function loadStock(raw: string | null, makeId: () => string): StockItem[] {
  if (!raw) return [];
  try {
    return fromStockJson(raw, makeId, true);
  } catch {
    return [];
  }
}

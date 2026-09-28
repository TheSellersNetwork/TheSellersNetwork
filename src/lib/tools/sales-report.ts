import { parse } from "csv-parse/browser/esm/sync";

/*
  Profit and loss from a seller's own sales report CSV (eBay, Amazon, Etsy,
  Depop, TikTok Shop, Whatnot, or anything with dates and amounts). Runs in
  the browser only: files are never uploaded. Column names differ by platform
  and change over time, so we guess the mapping from the headers and let the
  member correct it rather than hard-coding one format.
*/

export type Row = Record<string, string>;
export type Mapping = {
  date: string | null;
  item: string | null;
  gross: string | null;
  fees: string[];
  postage: string | null;
  net: string | null;
  type: string | null;
};
export type Summary = {
  rows: number;
  gross: number;
  fees: number;
  postage: number;
  net: number;
  byMonth: { key: string; count: number; gross: number; fees: number; net: number }[];
  byTaxYear: { key: string; count: number; gross: number; fees: number; net: number }[];
  byCalendarYear: { key: string; count: number; gross: number }[];
  skipped: number;
};

export function parseCsv(text: string): { headers: string[]; rows: Row[] } {
  // Some exports start with a few lines of notes before the real header row: find the first row that looks like a header.
  const lines = text.replace(/^﻿/, "").split(/\r?\n/);
  let start = 0;
  for (let i = 0; i < Math.min(lines.length, 20); i += 1) {
    const cells = lines[i].split(",").filter((c) => c.trim()).length;
    if (cells >= 3) {
      start = i;
      break;
    }
  }
  const records = parse(lines.slice(start).join("\n"), { columns: true, skip_empty_lines: true, relax_column_count: true, relax_quotes: true, trim: true, bom: true }) as Row[];
  const headers = records.length ? Object.keys(records[0]) : [];
  return { headers, rows: records };
}

const find = (headers: string[], patterns: RegExp[], exclude?: RegExp) => {
  for (const p of patterns) {
    const hit = headers.find((h) => p.test(h) && !(exclude && exclude.test(h)));
    if (hit) return hit;
  }
  return null;
};

/* Best guess at which column is which, from common header names across platforms. */
export function guessMapping(headers: string[]): Mapping {
  const fees = headers.filter((h) => /fee|commission|charge/i.test(h) && !/postage|shipping|delivery/i.test(h) && !/rate|%|percent/i.test(h));
  return {
    date: find(headers, [/^(sale|order|transaction|payment)?\s*(creation\s*)?date/i, /date/i, /time/i]),
    item: find(headers, [/item title/i, /^title$/i, /product name/i, /^item$/i, /description/i, /title/i, /item|product/i]),
    gross: find(headers, [/gross/i, /item subtotal/i, /sale price/i, /^total$/i, /order total/i, /sold for/i, /^price$/i, /product sales/i, /amount/i], /net|fee|postage|shipping/i),
    fees,
    postage: find(headers, [/postage (charged|paid by buyer)/i, /shipping (charged|paid)/i, /postage/i, /shipping/i, /delivery/i], /fee|label|cost/i),
    net: find(headers, [/^net/i, /net amount/i, /payout/i, /you (earned|received)/i, /total \(gbp\)/i, /^total$/i]),
    type: find(headers, [/^type$/i, /transaction type/i, /status/i]),
  };
}

/* "£1,234.56", "-£3.00", "(3.00)", "3.00 GBP", "1.234,56" */
export function parseMoney(value: string | undefined): number {
  if (!value) return 0;
  let v = value.trim();
  if (!v || v === "--") return 0;
  const negative = /^\(.*\)$/.test(v) || /^-/.test(v) || /-\s*$/.test(v);
  v = v.replace(/[()£$€\s]|GBP|EUR|USD/gi, "").replace(/^-|-$/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(v)) v = v.replace(/\./g, "").replace(",", ".");
  else v = v.replace(/,/g, "");
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return negative ? -Math.abs(n) : n;
}

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/* UK exports mostly use day first. Returns null if the date cannot be read. */
export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(v);
  if (m) {
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(Date.UTC(year, +m[2] - 1, +m[1]));
  }
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[a-z]*[\s-,]+(\d{2,4})/.exec(v);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(Date.UTC(year, MONTHS[m[2].toLowerCase()], +m[1]));
  }
  m = /^([A-Za-z]{3})[a-z]*\s+(\d{1,2}),?\s+(\d{4})/.exec(v);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[1].toLowerCase()], +m[2]));
  return null;
}

/* UK tax year label, e.g. 6 April 2026 to 5 April 2027 is "2026 to 27". */
export function taxYear(d: Date): string {
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() > 3 || (d.getUTCMonth() === 3 && d.getUTCDate() >= 6) ? y : y - 1;
  return `${start} to ${String(start + 1).slice(2)}`;
}

export function summarise(rows: Row[], mapping: Mapping, includeTypes: Set<string> | null): Summary {
  const month = new Map<string, { count: number; gross: number; fees: number; net: number }>();
  const tax = new Map<string, { count: number; gross: number; fees: number; net: number }>();
  const cal = new Map<string, { count: number; gross: number }>();
  let gross = 0;
  let fees = 0;
  let postage = 0;
  let net = 0;
  let counted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (mapping.type && includeTypes && !includeTypes.has(row[mapping.type] ?? "")) continue;
    const d = mapping.date ? parseDate(row[mapping.date]) : null;
    if (!d) {
      skipped += 1;
      continue;
    }
    const g = mapping.gross ? parseMoney(row[mapping.gross]) : 0;
    // Fees are shown as positive costs, however the export signs them.
    const f = mapping.fees.reduce((s, c) => s + Math.abs(parseMoney(row[c])), 0);
    const p = mapping.postage ? parseMoney(row[mapping.postage]) : 0;
    const n = mapping.net ? parseMoney(row[mapping.net]) : g + p - f;
    gross += g;
    fees += f;
    postage += p;
    net += n;
    counted += 1;

    const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    for (const [map, key] of [
      [month, mk],
      [tax, taxYear(d)],
    ] as const) {
      const e = map.get(key) ?? { count: 0, gross: 0, fees: 0, net: 0 };
      e.count += 1;
      e.gross += g;
      e.fees += f;
      e.net += n;
      map.set(key, e);
    }
    const ck = String(d.getUTCFullYear());
    const c = cal.get(ck) ?? { count: 0, gross: 0 };
    c.count += 1;
    c.gross += g;
    cal.set(ck, c);
  }

  const sorted = <T,>(m: Map<string, T>) => Array.from(m, ([key, v]) => ({ key, ...v })).sort((a, b) => a.key.localeCompare(b.key));
  return { rows: counted, gross, fees, postage, net, byMonth: sorted(month), byTaxYear: sorted(tax), byCalendarYear: sorted(cal), skipped };
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map((c) => (typeof c === "number" ? c.toFixed(2) : /[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}

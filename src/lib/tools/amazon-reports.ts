import { parse } from "csv-parse/browser/esm/sync";
import { addDays, CUSTOMER_RETURN_WINDOW, daysBetween, WAREHOUSE_CLAIM_DAYS } from "./claims";

/*
  Readers for the reports Amazon Seller Central lets you download, used by the
  settlement summariser and the reimbursement checker. Everything runs in the
  browser; files are never uploaded.

  Amazon's files come tab-delimited (.txt) or comma-delimited (.csv), sometimes
  with a byte order mark, sometimes with a few lines of notes above the header,
  and the same column can be spelt "FulfillmentCenter", "Fulfilment centre" or
  "fulfillment-center-id". So we match headers loosely: lower case, UK and US
  spellings folded together, and everything that is not a letter or digit
  removed. Columns are listed below with the name Amazon documents.
*/

export type Row = Record<string, string>;
export type Table = {
  /* Headers exactly as they appear in the file. */
  headers: string[];
  /* Rows keyed by normalised header (see `normaliseHeader`). */
  rows: Row[];
  delimiter: "\t" | ",";
};

export function normaliseHeader(h: string): string {
  return h
    .replace(/^﻿/, "")
    .toLowerCase()
    .replace(/fulfilment/g, "fulfillment")
    .replace(/centre/g, "center")
    .replace(/[^a-z0-9]/g, "");
}

function detectDelimiter(text: string): "\t" | "," {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .slice(0, 10);
  const tabs = lines.reduce((n, l) => n + (l.split("\t").length - 1), 0);
  const commas = lines.reduce((n, l) => n + (l.split(",").length - 1), 0);
  return tabs >= 2 && tabs >= commas / 3 ? "\t" : ",";
}

/* Reads a report into rows. Skips note lines above the header: the header is the first line with at least four filled cells. */
export function readReport(text: string): Table {
  const clean = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(clean);
  const records = parse(clean, {
    delimiter,
    // Tab files from Amazon are not quoted, and product titles can contain a stray quote mark.
    quote: delimiter === "\t" ? false : '"',
    relax_column_count: true,
    relax_quotes: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as string[][];
  const start = records.findIndex((r) => r.filter((c) => c && c.trim()).length >= 4);
  if (start < 0) return { headers: [], rows: [], delimiter };
  const headers = records[start].map((h) => h.trim());
  const keys = headers.map(normaliseHeader);
  const rows: Row[] = [];
  for (const rec of records.slice(start + 1)) {
    if (!rec.some((c) => c && c.trim())) continue;
    const row: Row = {};
    keys.forEach((k, i) => {
      if (k && !(k in row)) row[k] = (rec[i] ?? "").trim();
    });
    rows.push(row);
  }
  return { headers, rows, delimiter };
}

/* The first of `aliases` present in the table, as a normalised key. */
export function findColumn(table: Table, aliases: readonly string[]): string | null {
  const have = new Set(table.headers.map(normaliseHeader));
  for (const a of aliases) {
    const k = normaliseHeader(a);
    if (have.has(k)) return k;
  }
  return null;
}

export function cell(row: Row, key: string | null): string {
  return key ? (row[key] ?? "") : "";
}

/* "£1,234.56", "-1234.56", "(3.00)", "3.00 GBP", "1.234,56", "12,50". Returns null when blank or unreadable. */
export function parseAmount(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  let v = value.trim();
  if (!v || v === "--" || v === "-") return null;
  const negative = /^\(.*\)$/.test(v) || /^[^\d]*[-−]/.test(v) || /[-−]\s*$/.test(v);
  v = v.replace(/[()£$€\s ]|GBP|EUR|USD/gi, "").replace(/[-−]/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(v) || /^\d+,\d{1,2}$/.test(v))
    v = v.replace(/\./g, "").replace(",", ".");
  else v = v.replace(/,/g, "");
  if (!v) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export type DateOrder = "dmy" | "mdy";

const utc = (y: number, m: number, d: number) => {
  const year = y < 100 ? 2000 + y : y;
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(year, m, d));
  return date.getUTCMonth() === m ? date : null;
};

/*
  Dates in the shapes Amazon uses: "2026-03-14", "2026-03-14T09:30:00+00:00",
  "2026-03-14 09:30:00 UTC", "14.03.2026 09:30:00 UTC" (UK and EU settlement
  files), "14/03/2026", "03/14/2026", "14 Mar 2026 09:30:00 UTC" and
  "Mar 14, 2026 9:30:00 AM PDT". The time is ignored. Slashed dates are read
  day first unless `order` says otherwise or the numbers only make sense one way.
*/
export function parseReportDate(
  value: string | undefined | null,
  order: DateOrder = "dmy",
): Date | null {
  if (!value) return null;
  const v = value.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(v);
  if (m) return utc(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(v);
  if (m) return utc(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(v);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const dayFirst = a > 12 ? true : b > 12 ? false : order === "dmy";
    return dayFirst ? utc(+m[3], b - 1, a) : utc(+m[3], a - 1, b);
  }
  m = /^(\d{1,2})[\s-]([A-Za-z]{3})[A-Za-z]*\.?[\s,-]+(\d{2,4})/.exec(v);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined)
    return utc(+m[3], MONTHS[m[2].toLowerCase()], +m[1]);
  m = /^([A-Za-z]{3})[A-Za-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(v);
  if (m && MONTHS[m[1].toLowerCase()] !== undefined)
    return utc(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

/* For slashed dates like 03/04/2026: which way round does this column go? Ambiguous when every value could be either. */
export function detectDateOrder(values: string[]): { order: DateOrder; ambiguous: boolean } {
  let slashed = 0;
  for (const raw of values) {
    const m = /^(\d{1,2})[/-](\d{1,2})[/-]\d{2,4}/.exec(raw.trim());
    if (!m) continue;
    slashed += 1;
    if (+m[1] > 12) return { order: "dmy", ambiguous: false };
    if (+m[2] > 12) return { order: "mdy", ambiguous: false };
  }
  return { order: "dmy", ambiguous: slashed > 0 };
}

export function formatDate(d: Date | null): string {
  if (!d) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

const pence = (n: number) => Math.round(n * 100);

export function toCsv(rows: (string | number)[][]): string {
  const esc = (c: string | number) => {
    if (typeof c === "number") return c.toFixed(2);
    // Guard against spreadsheet formula injection from values that came out of a file.
    const s = /^[=+@]/.test(c) || (/^-/.test(c) && !/^-?\d/.test(c)) ? `'${c}` : c;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Which report is this?                                               */
/* ------------------------------------------------------------------ */

export type ReportKind =
  | "settlement"
  | "ledger"
  | "adjustments"
  | "reimbursements"
  | "returns"
  | "transactions"
  | "unknown";

export const REPORT_NAMES: Record<ReportKind, string> = {
  settlement: "Settlement report (flat file V2)",
  ledger: "Inventory Ledger report, detailed view",
  adjustments: "Inventory Adjustments report",
  reimbursements: "Reimbursements report",
  returns: "FBA customer returns report",
  transactions: "Date range transaction report",
  unknown: "Not recognised",
};

export function detectKind(table: Table): ReportKind {
  const has = (...names: string[]) => names.every((n) => findColumn(table, [n]) !== null);
  if (has("settlement-id", "amount-description")) return "settlement";
  if (has("reimbursement-id")) return "reimbursements";
  if (has("return-date", "order-id") || has("return-date", "detailed-disposition"))
    return "returns";
  if (has("Event Type", "FNSKU") || has("EventType", "FNSKU")) return "ledger";
  if (has("adjusted-date") || has("transaction-item-id", "reason")) return "adjustments";
  if (has("type", "order id") && (has("date/time") || has("settlement id"))) return "transactions";
  return "unknown";
}

/* ------------------------------------------------------------------ */
/* Settlement report                                                   */
/* ------------------------------------------------------------------ */

/*
  Settlement report, flat file V2 (SP-API GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE_V2).
  Column names as documented by Amazon. The first data row carries the
  settlement totals; every other row is one amount on one transaction.
*/
export const SETTLEMENT_COLUMNS = {
  settlementId: ["settlement-id"],
  start: ["settlement-start-date"],
  end: ["settlement-end-date"],
  deposit: ["deposit-date"],
  total: ["total-amount"],
  currency: ["currency"],
  transactionType: ["transaction-type"],
  orderId: ["order-id"],
  amountType: ["amount-type"],
  amountDescription: ["amount-description"],
  amount: ["amount"],
  posted: ["posted-date", "posted-date-time"],
  sku: ["sku"],
  quantity: ["quantity-purchased"],
  fulfillment: ["fulfillment-id"],
} as const;

export const SETTLEMENT_REQUIRED = [
  "settlementId",
  "total",
  "amountType",
  "amountDescription",
  "amount",
] as const;

export type SettlementCategory =
  | "sales"
  | "shipping"
  | "promotions"
  | "refunds"
  | "salesTax"
  | "referralFees"
  | "fbaFees"
  | "otherFees"
  | "vatOnFees"
  | "advertising"
  | "reimbursements"
  | "previousReserve"
  | "currentReserve"
  | "other";

export const SETTLEMENT_CATEGORIES: { id: SettlementCategory; label: string; account: string }[] = [
  { id: "sales", label: "Sales (item price)", account: "Amazon sales" },
  { id: "shipping", label: "Shipping charged to buyers", account: "Amazon shipping income" },
  { id: "promotions", label: "Promotions and discounts", account: "Amazon promotions" },
  { id: "refunds", label: "Refunds to buyers", account: "Amazon refunds" },
  {
    id: "salesTax",
    label: "VAT and tax on sales (including any Amazon collected and withheld)",
    account: "VAT on Amazon sales",
  },
  { id: "referralFees", label: "Referral fees (commission)", account: "Amazon selling fees" },
  {
    id: "fbaFees",
    label: "FBA fees (fulfilment, storage and similar)",
    account: "Amazon FBA fees",
  },
  {
    id: "otherFees",
    label: "Other Amazon fees (subscription and similar)",
    account: "Amazon other fees",
  },
  {
    id: "vatOnFees",
    label: "VAT on Amazon fees (where the file shows it)",
    account: "VAT on Amazon fees",
  },
  { id: "advertising", label: "Advertising", account: "Advertising" },
  { id: "reimbursements", label: "Reimbursements from Amazon", account: "Amazon reimbursements" },
  {
    id: "previousReserve",
    label: "Reserve released from the last settlement",
    account: "Amazon reserve",
  },
  { id: "currentReserve", label: "Reserve held back this settlement", account: "Amazon reserve" },
  { id: "other", label: "Other", account: "Amazon other" },
];

const REFUND_LIKE = /refund|chargeback|a-to-z|atoz|guarantee|safe-?t/i;

/*
  Puts one settlement line into a group, from its transaction-type, amount-type
  and amount-description. Amazon does not publish a complete list of these
  values, so this matches on words, and anything unrecognised goes to "Other"
  where you can see it.
*/
export function classifySettlementLine(
  transactionType: string,
  amountType: string,
  amountDescription: string,
): SettlementCategory {
  const t = transactionType.toLowerCase();
  const a = amountType.toLowerCase();
  const d = amountDescription.toLowerCase();
  const all = `${t} ${a} ${d}`;
  if (/previous reserve/.test(d)) return "previousReserve";
  if (/current reserve|reserve amount|unavailable balance/.test(d)) return "currentReserve";
  if (/advertis|sponsored/.test(all)) return "advertising";
  if (
    /reimburs|warehouse_damage|warehouse_lost|missing_from_inbound|compensated_clawback|free_replacement_refund|customer_return|reversal_reimbursement/.test(
      `${a} ${d}`,
    )
  )
    return "reimbursements";

  const priceLike =
    /itemprice|promotion|withheld|marketplacefacilitator/.test(a.replace(/[^a-z]/g, "")) ||
    /marketplacefacilitator|lowvaluegoods/.test(d.replace(/[^a-z]/g, ""));
  if (priceLike) {
    if (/tax|vat/.test(`${a} ${d}`)) return "salesTax";
    if (REFUND_LIKE.test(t)) return "refunds";
    if (/promotion/.test(a)) return "promotions";
    if (/shipping|postage/.test(d)) return "shipping";
    return "sales";
  }

  const feeLike =
    /fee|commission|chargeback/.test(a) ||
    /fee|commission|chargeback/.test(d) ||
    /servicefee|service fee/.test(t);
  if (feeLike) {
    if (/vat|tax/.test(d)) return "vatOnFees";
    if (/commission|referral|closing/.test(d)) return "referralFees";
    if (
      /fba|fulfil|fulfill|storage|removal|disposal|inbound|placement|transportation|weightbased|pick|pack|label|chargeback|returns? processing/.test(
        d.replace(/\s+/g, " "),
      )
    )
      return "fbaFees";
    return "otherFees";
  }
  return "other";
}

export type SettlementDetail = {
  category: SettlementCategory;
  transactionType: string;
  amountType: string;
  amountDescription: string;
  count: number;
  amount: number;
};

export type Settlement = {
  id: string;
  start: Date | null;
  end: Date | null;
  deposit: Date | null;
  currency: string;
  /* The settlement total from the file, or null if the totals row was missing. */
  total: number | null;
  totals: Record<SettlementCategory, number>;
  sumOfLines: number;
  /* sumOfLines minus total, in pounds. Zero when they agree to the penny. */
  difference: number | null;
  lineCount: number;
  details: SettlementDetail[];
};

export type SettlementResult = {
  settlements: Settlement[];
  found: string[];
  missing: string[];
  skipped: number;
};

const emptyTotals = (): Record<SettlementCategory, number> =>
  Object.fromEntries(SETTLEMENT_CATEGORIES.map((c) => [c.id, 0])) as Record<
    SettlementCategory,
    number
  >;

export function summariseSettlements(tables: Table[]): SettlementResult {
  const byId = new Map<
    string,
    {
      s: Settlement;
      p: Record<SettlementCategory, number>;
      sumP: number;
      details: Map<string, SettlementDetail & { p: number }>;
    }
  >();
  const found = new Set<string>();
  const missing = new Set<string>();
  let skipped = 0;

  for (const table of tables) {
    const col = Object.fromEntries(
      Object.entries(SETTLEMENT_COLUMNS).map(([k, aliases]) => [k, findColumn(table, aliases)]),
    ) as Record<keyof typeof SETTLEMENT_COLUMNS, string | null>;
    for (const [k, v] of Object.entries(col)) {
      if (v) found.add(SETTLEMENT_COLUMNS[k as keyof typeof SETTLEMENT_COLUMNS][0]);
    }
    for (const k of SETTLEMENT_REQUIRED) if (!col[k]) missing.add(SETTLEMENT_COLUMNS[k][0]);
    if (SETTLEMENT_REQUIRED.some((k) => !col[k])) continue;

    for (const row of table.rows) {
      const id = cell(row, col.settlementId) || "unknown";
      let entry = byId.get(id);
      if (!entry) {
        entry = {
          s: {
            id,
            start: null,
            end: null,
            deposit: null,
            currency: "",
            total: null,
            totals: emptyTotals(),
            sumOfLines: 0,
            difference: null,
            lineCount: 0,
            details: [],
          },
          p: emptyTotals(),
          sumP: 0,
          details: new Map(),
        };
        byId.set(id, entry);
      }
      const s = entry.s;
      const total = parseAmount(cell(row, col.total));
      if (total !== null && s.total === null) {
        s.total = total;
        s.start = parseReportDate(cell(row, col.start));
        s.end = parseReportDate(cell(row, col.end));
        s.deposit = parseReportDate(cell(row, col.deposit));
        s.currency = cell(row, col.currency);
      }
      const amount = parseAmount(cell(row, col.amount));
      const at = cell(row, col.amountType);
      const ad = cell(row, col.amountDescription);
      if (amount === null) {
        if (total === null) skipped += 1;
        continue;
      }
      const tt = cell(row, col.transactionType);
      const category = classifySettlementLine(tt, at, ad);
      entry.p[category] += pence(amount);
      entry.sumP += pence(amount);
      s.lineCount += 1;
      const key = `${category}|${tt}|${at}|${ad}`;
      const d = entry.details.get(key) ?? {
        category,
        transactionType: tt,
        amountType: at,
        amountDescription: ad,
        count: 0,
        amount: 0,
        p: 0,
      };
      d.count += 1;
      d.p += pence(amount);
      entry.details.set(key, d);
    }
  }

  const settlements = Array.from(byId.values()).map(({ s, p, sumP, details }) => {
    for (const c of SETTLEMENT_CATEGORIES) s.totals[c.id] = p[c.id] / 100;
    s.sumOfLines = sumP / 100;
    s.difference = s.total === null ? null : (sumP - pence(s.total)) / 100;
    s.details = Array.from(details.values())
      .map(({ p: dp, ...rest }) => ({ ...rest, amount: dp / 100 }))
      .sort(
        (x, y) =>
          SETTLEMENT_CATEGORIES.findIndex((c) => c.id === x.category) -
            SETTLEMENT_CATEGORIES.findIndex((c) => c.id === y.category) ||
          Math.abs(y.amount) - Math.abs(x.amount),
      );
    return s;
  });
  settlements.sort((a, b) => (a.end?.getTime() ?? 0) - (b.end?.getTime() ?? 0));
  return { settlements, found: Array.from(found), missing: Array.from(missing), skipped };
}

export function settlementSummaryCsv(settlements: Settlement[]): string {
  const rows: (string | number)[][] = [
    ["Settlement ID", "Start", "End", "Deposit date", "Currency", "Group", "Amount"],
  ];
  for (const s of settlements) {
    const base = [s.id, formatDate(s.start), formatDate(s.end), formatDate(s.deposit), s.currency];
    for (const c of SETTLEMENT_CATEGORIES)
      if (s.totals[c.id] !== 0) rows.push([...base, c.label, s.totals[c.id]]);
    rows.push([...base, "Total of the lines", s.sumOfLines]);
    rows.push([...base, "Settlement total in the file", s.total === null ? "" : s.total]);
  }
  return toCsv(rows);
}

/*
  A journal-style CSV: one line per group with money in it, then a line for
  the payout that takes the total back off, so each settlement's lines add up
  to zero. Amounts keep Amazon's signs: positive is money to you.
*/
export function settlementJournalCsv(
  settlements: Settlement[],
  accounts: Record<SettlementCategory, string>,
  payoutAccount: string,
): string {
  const rows: (string | number)[][] = [["Date", "Account", "Description", "Amount"]];
  for (const s of settlements) {
    const date = formatDate(s.deposit ?? s.end);
    for (const c of SETTLEMENT_CATEGORIES) {
      if (s.totals[c.id] === 0) continue;
      rows.push([
        date,
        accounts[c.id] || c.account,
        `Amazon settlement ${s.id}: ${c.label}`,
        s.totals[c.id],
      ]);
    }
    rows.push([date, payoutAccount, `Amazon settlement ${s.id}: payout`, -s.sumOfLines]);
  }
  return toCsv(rows);
}

/* ------------------------------------------------------------------ */
/* Reimbursement checker                                               */
/* ------------------------------------------------------------------ */

/*
  Inventory Ledger report, detailed view (SP-API GET_LEDGER_DETAIL_VIEW_DATA):
  Date, FNSKU, ASIN, MSKU, Title, EventType, ReferenceID, Quantity,
  FulfillmentCenter, Disposition, Reason, Country, ReconciledQuantity,
  UnreconciledQuantity. The Seller Central download spells them with spaces
  ("Event Type", "Reconciled Quantity"); both match.

  The older Inventory Adjustments report is no longer documented by Amazon; we
  read the column names it used to have (adjusted-date, transaction-item-id,
  fnsku, sku, product-name, fulfillment-center-id, quantity, reason,
  disposition) where they are present.
*/
export const LEDGER_COLUMNS = {
  date: ["Date", "adjusted-date", "Date and Time"],
  fnsku: ["FNSKU", "Fulfillment Network SKU", "Fulfilment network SKU (FNSKU)"],
  asin: ["ASIN"],
  sku: ["MSKU", "sku", "Merchant SKU"],
  title: ["Title", "product-name"],
  eventType: ["Event Type", "EventType"],
  reference: ["Reference ID", "ReferenceID", "transaction-item-id"],
  quantity: ["Quantity"],
  disposition: ["Disposition"],
  reason: ["Reason"],
  unreconciled: ["Unreconciled Quantity", "UnreconciledQuantity"],
} as const;

/*
  Adjustment reason codes, from Amazon's Inventory Ledger report help page
  ("Adjustment types and reason codes"). The download shows codes; the online
  view shows the description, so we accept either.
*/
export const REASON_CODES = {
  lost: {
    codes: ["M", "5"],
    text: /inventory misplaced|misplaced|lost/i,
    meaning: "Inventory misplaced",
  },
  damaged: {
    codes: ["6", "7", "E", "H", "K", "U"],
    text: /damaged at amazon fulfil+ment cent(er|re)|warehouse damaged/i,
    meaning: "Damaged at Amazon fulfilment centre",
  },
  found: { codes: ["F", "N"], text: /inventory found|found/i, meaning: "Inventory found" },
} as const;

export function reasonGroup(reason: string): "lost" | "damaged" | "found" | null {
  const r = reason.trim();
  if (!r) return null;
  for (const g of ["lost", "damaged", "found"] as const) {
    if ((REASON_CODES[g].codes as readonly string[]).includes(r.toUpperCase())) return g;
  }
  if (r.length <= 2) return null;
  for (const g of ["damaged", "found", "lost"] as const) if (REASON_CODES[g].text.test(r)) return g;
  return null;
}

/* Reimbursements report (SP-API GET_FBA_REIMBURSEMENTS_DATA). */
export const REIMBURSEMENT_COLUMNS = {
  date: ["approval-date"],
  id: ["reimbursement-id"],
  orderId: ["amazon-order-id"],
  reason: ["reason"],
  sku: ["sku"],
  fnsku: ["fnsku"],
  asin: ["asin"],
  title: ["product-name"],
  quantity: ["quantity-reimbursed-total"],
  cash: ["quantity-reimbursed-cash"],
  inventory: ["quantity-reimbursed-inventory"],
  amount: ["amount-total"],
} as const;

/* FBA customer returns report (SP-API GET_FBA_FULFILLMENT_CUSTOMER_RETURNS_DATA). */
export const RETURNS_COLUMNS = {
  date: ["return-date"],
  orderId: ["order-id"],
  sku: ["sku"],
  asin: ["asin"],
  fnsku: ["fnsku"],
  title: ["product-name"],
  quantity: ["quantity"],
  disposition: ["detailed-disposition"],
  status: ["status"],
} as const;

/*
  Date range transaction report (Payments, Reports Repository). Not documented
  column by column by Amazon; these are the headers the UK download uses.
*/
export const TRANSACTION_COLUMNS = {
  date: ["date/time"],
  type: ["type"],
  orderId: ["order id"],
  sku: ["sku"],
  quantity: ["quantity"],
  fulfillment: ["fulfillment", "fulfilment"],
  title: ["description"],
} as const;

type Cols<T extends Record<string, readonly string[]>> = Record<keyof T, string | null>;
function columns<T extends Record<string, readonly string[]>>(table: Table, spec: T): Cols<T> {
  return Object.fromEntries(
    Object.entries(spec).map(([k, aliases]) => [k, findColumn(table, aliases)]),
  ) as Cols<T>;
}

export type FlagKind = "lost" | "damaged" | "return";
export type ClaimStatus = "claim-now" | "too-early" | "deadline-passed";

export type Flag = {
  kind: FlagKind;
  date: Date;
  sku: string;
  fnsku: string;
  asin: string;
  title: string;
  orderId: string;
  reference: string;
  quantity: number;
  reason: string;
  claimFrom: Date;
  deadline: Date;
  daysLeft: number;
  status: ClaimStatus;
};

export type CheckInput = {
  ledger?: Table[];
  reimbursements?: Table[];
  returns?: Table[];
  settlements?: Table[];
  transactions?: Table[];
};

export type CheckOptions = {
  today: Date;
  /* How to read slashed dates such as 03/04/2026 when a file does not make it clear. */
  dateOrder?: DateOrder;
};

export type CheckResult = {
  flags: Flag[];
  notes: string[];
  ambiguousDates: boolean;
  counts: { lostOrDamagedEvents: number; refunds: number; reimbursements: number; returns: number };
};

/* A reimbursement or found adjustment dated this many days before the loss still counts towards it (reports are not always in step). */
export const MATCH_GRACE_DAYS = 7;

type Credit = { date: Date; remaining: number };

function resolveOrder(
  tables: Table[],
  dateKeys: (string | null)[],
  fallback: DateOrder,
): { order: DateOrder; ambiguous: boolean } {
  const values: string[] = [];
  tables.forEach((t, i) => {
    const k = dateKeys[i];
    if (k) for (const r of t.rows.slice(0, 2000)) values.push(r[k] ?? "");
  });
  const d = detectDateOrder(values);
  return d.ambiguous ? { order: fallback, ambiguous: true } : d;
}

function status(today: Date, from: Date, deadline: Date): ClaimStatus {
  if (daysBetween(today, deadline) < 0) return "deadline-passed";
  if (daysBetween(today, from) > 0) return "too-early";
  return "claim-now";
}

export function checkReimbursements(input: CheckInput, options: CheckOptions): CheckResult {
  const today = options.today;
  const fallback = options.dateOrder ?? "dmy";
  const notes: string[] = [];
  const flags: Flag[] = [];
  let ambiguousDates = false;

  const ledger = input.ledger ?? [];
  const reimb = input.reimbursements ?? [];
  const returns = input.returns ?? [];
  const settlements = input.settlements ?? [];
  const transactions = input.transactions ?? [];

  // Product details by SKU and FNSKU, from whichever file has them, to fill gaps in the flags.
  const products = new Map<string, { sku: string; fnsku: string; asin: string; title: string }>();
  const remember = (sku: string, fnsku: string, asin: string, title: string) => {
    for (const key of [sku && `s:${sku}`, fnsku && `f:${fnsku}`]) {
      if (!key) continue;
      const p = products.get(key) ?? { sku: "", fnsku: "", asin: "", title: "" };
      products.set(key, {
        sku: p.sku || sku,
        fnsku: p.fnsku || fnsku,
        asin: p.asin || asin,
        title: p.title || title,
      });
    }
  };

  /* Reimbursements: those with an order ID are matched to refunds, the rest to warehouse losses. */
  const warehouseCredits = new Map<string, Credit[]>();
  const orderReimbursed = new Map<string, number>();
  let reimbursementCount = 0;
  const rCols = reimb.map((t) => columns(t, REIMBURSEMENT_COLUMNS));
  const rOrder = resolveOrder(
    reimb,
    rCols.map((c) => c.date),
    fallback,
  );
  ambiguousDates ||= rOrder.ambiguous;
  reimb.forEach((t, i) => {
    const c = rCols[i];
    for (const row of t.rows) {
      const qty =
        parseAmount(cell(row, c.quantity)) ??
        (parseAmount(cell(row, c.cash)) ?? 0) + (parseAmount(cell(row, c.inventory)) ?? 0);
      if (!(qty > 0)) continue;
      reimbursementCount += 1;
      const sku = cell(row, c.sku);
      const fnsku = cell(row, c.fnsku);
      remember(sku, fnsku, cell(row, c.asin), cell(row, c.title));
      const orderId = cell(row, c.orderId);
      if (orderId) {
        for (const key of [`${orderId}|${sku}`, `${orderId}|`])
          orderReimbursed.set(key, (orderReimbursed.get(key) ?? 0) + qty);
        continue;
      }
      const date = parseReportDate(cell(row, c.date), rOrder.order);
      if (!date) continue;
      const credit = { date, remaining: qty };
      for (const key of [fnsku && `f:${fnsku}`, sku && `s:${sku}`])
        if (key) warehouseCredits.set(key, [...(warehouseCredits.get(key) ?? []), credit]);
    }
  });

  /* Ledger: lost and damaged events, plus found events as credits. */
  type Event = { flag: Flag; open: number; trusted: boolean };
  const events: Event[] = [];
  const lCols = ledger.map((t) => columns(t, LEDGER_COLUMNS));
  const lOrder = resolveOrder(
    ledger,
    lCols.map((c) => c.date),
    fallback,
  );
  ambiguousDates ||= lOrder.ambiguous;
  ledger.forEach((t, i) => {
    const c = lCols[i];
    if (!c.reason || !c.quantity || !c.date) {
      notes.push(
        "One inventory file has no Reason, Quantity or Date column, so we could not check it for lost or damaged stock.",
      );
      return;
    }
    for (const row of t.rows) {
      const eventType = cell(row, c.eventType);
      if (c.eventType && eventType && !/adjust/i.test(eventType)) continue;
      const group = reasonGroup(cell(row, c.reason));
      if (!group) continue;
      const qty = parseAmount(cell(row, c.quantity));
      const date = parseReportDate(cell(row, c.date), lOrder.order);
      if (qty === null || !date) continue;
      const sku = cell(row, c.sku);
      const fnsku = cell(row, c.fnsku);
      remember(sku, fnsku, cell(row, c.asin), cell(row, c.title));
      if (group === "found") {
        if (qty <= 0) continue;
        const credit = { date, remaining: qty };
        for (const key of [fnsku && `f:${fnsku}`, sku && `s:${sku}`])
          if (key) warehouseCredits.set(key, [...(warehouseCredits.get(key) ?? []), credit]);
        continue;
      }
      if (qty >= 0) continue;
      const unreconciled = c.unreconciled ? parseAmount(cell(row, c.unreconciled)) : null;
      const trusted = unreconciled !== null;
      const open = trusted ? Math.min(Math.abs(unreconciled!), Math.abs(qty)) : Math.abs(qty);
      const deadline = addDays(date, WAREHOUSE_CLAIM_DAYS);
      const code = cell(row, c.reason);
      events.push({
        open,
        trusted,
        flag: {
          kind: group,
          date,
          sku,
          fnsku,
          asin: cell(row, c.asin),
          title: cell(row, c.title),
          orderId: "",
          reference: cell(row, c.reference),
          quantity: Math.abs(qty),
          reason:
            code.length <= 2 ? `${REASON_CODES[group].meaning} (code ${code.toUpperCase()})` : code,
          claimFrom: date,
          deadline,
          daysLeft: daysBetween(today, deadline),
          status: status(today, date, deadline),
        },
      });
    }
  });

  // Oldest first, each event takes the earliest credit for the same FNSKU (or SKU) dated no more than a week before it.
  events.sort((a, b) => a.flag.date.getTime() - b.flag.date.getTime());
  for (const [, list] of warehouseCredits) list.sort((a, b) => a.date.getTime() - b.date.getTime());
  for (const e of events) {
    // Amazon's own Unreconciled Quantity already allows for found and reimbursed units.
    if (!e.trusted) {
      const seen = new Set<Credit>();
      const { fnsku, sku } = e.flag;
      const pool = [
        ...(fnsku ? (warehouseCredits.get(`f:${fnsku}`) ?? []) : []),
        ...(sku ? (warehouseCredits.get(`s:${sku}`) ?? []) : []),
      ]
        .filter((cr) => (seen.has(cr) ? false : (seen.add(cr), true)))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      for (const cr of pool) {
        if (e.open <= 0) break;
        if (cr.remaining <= 0 || daysBetween(e.flag.date, cr.date) < -MATCH_GRACE_DAYS) continue;
        const take = Math.min(cr.remaining, e.open);
        cr.remaining -= take;
        e.open -= take;
      }
    }
    if (e.open > 0) flags.push({ ...e.flag, quantity: e.open });
  }

  /* Refunds on FBA orders, from settlement and transaction reports. */
  const refunds = new Map<
    string,
    { orderId: string; sku: string; date: Date; quantity: number; title: string }
  >();
  const addRefund = (orderId: string, sku: string, date: Date, qty: number, title: string) => {
    const key = `${orderId}|${sku}`;
    const r = refunds.get(key);
    if (!r) refunds.set(key, { orderId, sku, date, quantity: qty, title });
    else {
      if (date < r.date) r.date = date;
      r.quantity = Math.max(r.quantity, qty);
      r.title ||= title;
    }
  };
  settlements.forEach((t) => {
    const c = columns(t, SETTLEMENT_COLUMNS);
    const order = resolveOrder([t], [c.posted], fallback);
    ambiguousDates ||= order.ambiguous;
    for (const row of t.rows) {
      if (!/refund/i.test(cell(row, c.transactionType))) continue;
      if (/^mfn$/i.test(cell(row, c.fulfillment))) continue;
      const orderId = cell(row, c.orderId);
      const date = parseReportDate(cell(row, c.posted), order.order);
      if (!orderId || !date) continue;
      const q = parseAmount(cell(row, c.quantity));
      addRefund(orderId, cell(row, c.sku), date, q && q > 0 ? Math.abs(q) : 1, "");
    }
  });
  transactions.forEach((t) => {
    const c = columns(t, TRANSACTION_COLUMNS);
    const order = resolveOrder([t], [c.date], fallback);
    ambiguousDates ||= order.ambiguous;
    for (const row of t.rows) {
      if (!/^refund$/i.test(cell(row, c.type))) continue;
      if (c.fulfillment && /seller|merchant|mfn/i.test(cell(row, c.fulfillment))) continue;
      const orderId = cell(row, c.orderId);
      const date = parseReportDate(cell(row, c.date), order.order);
      if (!orderId || !date) continue;
      const q = parseAmount(cell(row, c.quantity));
      addRefund(
        orderId,
        cell(row, c.sku),
        date,
        q && q !== 0 ? Math.abs(q) : 1,
        cell(row, c.title),
      );
    }
  });

  /* Returns received back at Amazon. */
  const returned = new Map<string, number>();
  let returnCount = 0;
  returns.forEach((t) => {
    const c = columns(t, RETURNS_COLUMNS);
    for (const row of t.rows) {
      const orderId = cell(row, c.orderId);
      if (!orderId) continue;
      const qty = Math.abs(parseAmount(cell(row, c.quantity)) ?? 1) || 1;
      const sku = cell(row, c.sku);
      returnCount += 1;
      remember(sku, cell(row, c.fnsku), cell(row, c.asin), cell(row, c.title));
      for (const key of [`${orderId}|${sku}`, `${orderId}|`])
        returned.set(key, (returned.get(key) ?? 0) + qty);
    }
  });

  if (refunds.size && !returns.length) {
    notes.push(
      "Add your FBA customer returns report to check refunds. Without it we cannot tell which refunded items came back.",
    );
  } else if (refunds.size) {
    for (const r of refunds.values()) {
      const back = r.sku
        ? (returned.get(`${r.orderId}|${r.sku}`) ?? 0)
        : (returned.get(`${r.orderId}|`) ?? 0);
      const paid = r.sku
        ? (orderReimbursed.get(`${r.orderId}|${r.sku}`) ?? 0)
        : (orderReimbursed.get(`${r.orderId}|`) ?? 0);
      const open = r.quantity - back - paid;
      if (open <= 0) continue;
      const claimFrom = addDays(r.date, CUSTOMER_RETURN_WINDOW.opensAfterDays);
      const deadline = addDays(r.date, CUSTOMER_RETURN_WINDOW.closesAfterDays);
      const p = products.get(`s:${r.sku}`);
      flags.push({
        kind: "return",
        date: r.date,
        sku: r.sku,
        fnsku: p?.fnsku ?? "",
        asin: p?.asin ?? "",
        title: r.title || p?.title || "",
        orderId: r.orderId,
        reference: "",
        quantity: open,
        reason: "Customer refunded, no return found",
        claimFrom,
        deadline,
        daysLeft: daysBetween(today, deadline),
        status: status(today, claimFrom, deadline),
      });
    }
  } else if (returns.length && !settlements.length && !transactions.length) {
    notes.push(
      "Add a settlement report or date range transaction report so we can see which orders were refunded.",
    );
  }

  if (!ledger.length && (reimb.length || returns.length)) {
    notes.push(
      "Add your Inventory Ledger report (detailed view) to check for lost or damaged stock.",
    );
  }

  // Fill in missing product details.
  for (const f of flags) {
    const p = (f.fnsku && products.get(`f:${f.fnsku}`)) || (f.sku && products.get(`s:${f.sku}`));
    if (!p) continue;
    f.sku ||= p.sku;
    f.fnsku ||= p.fnsku;
    f.asin ||= p.asin;
    f.title ||= p.title;
  }

  flags.sort(
    (a, b) => a.deadline.getTime() - b.deadline.getTime() || a.date.getTime() - b.date.getTime(),
  );
  return {
    flags,
    notes,
    ambiguousDates,
    counts: {
      lostOrDamagedEvents: events.length,
      refunds: refunds.size,
      reimbursements: reimbursementCount,
      returns: returnCount,
    },
  };
}

export const FLAG_LABELS: Record<FlagKind, string> = {
  lost: "Lost in warehouse",
  damaged: "Damaged in warehouse",
  return: "Refund, no return",
};
export const STATUS_LABELS: Record<ClaimStatus, string> = {
  "claim-now": "Can claim now",
  "too-early": "Too early to claim",
  "deadline-passed": "Deadline passed",
};

export function flagsCsv(flags: Flag[]): string {
  const rows: (string | number)[][] = [
    [
      "Type",
      "Event date",
      "SKU",
      "FNSKU",
      "ASIN",
      "Title",
      "Order ID",
      "Reference ID",
      "Quantity",
      "Reason",
      "Claim from",
      "Claim by",
      "Status",
    ],
  ];
  for (const f of flags) {
    rows.push([
      FLAG_LABELS[f.kind],
      formatDate(f.date),
      f.sku,
      f.fnsku,
      f.asin,
      f.title,
      f.orderId,
      f.reference,
      String(f.quantity),
      f.reason,
      formatDate(f.claimFrom),
      formatDate(f.deadline),
      STATUS_LABELS[f.status],
    ]);
  }
  return toCsv(rows);
}

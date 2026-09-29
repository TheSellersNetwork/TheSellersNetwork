import {
  checkReimbursements,
  classifySettlementLine,
  detectDateOrder,
  detectKind,
  flagsCsv,
  normaliseHeader,
  parseAmount,
  parseReportDate,
  readReport,
  reasonGroup,
  settlementJournalCsv,
  settlementSummaryCsv,
  SETTLEMENT_CATEGORIES,
  summariseSettlements,
  toCsv,
  type SettlementCategory,
} from "./amazon-reports";
import { CLAIM_KINDS, CUSTOMER_RETURN_WINDOW } from "./claims";

/* Every fixture below is made-up test data. */

const tsv = (rows: string[][]) => rows.map((r) => r.join("\t")).join("\n");
const iso = (d: Date | null) => d?.toISOString().slice(0, 10);

const SETTLEMENT_HEADER = [
  "settlement-id",
  "settlement-start-date",
  "settlement-end-date",
  "deposit-date",
  "total-amount",
  "currency",
  "transaction-type",
  "order-id",
  "merchant-order-id",
  "adjustment-id",
  "shipment-id",
  "marketplace-name",
  "amount-type",
  "amount-description",
  "amount",
  "fulfillment-id",
  "posted-date",
  "posted-date-time",
  "order-item-code",
  "merchant-order-item-id",
  "merchant-adjustment-item-id",
  "sku",
  "quantity-purchased",
  "promotion-id",
];

function settlementLine(p: Partial<Record<string, string>>): string[] {
  return SETTLEMENT_HEADER.map((h) => p[h] ?? "");
}

const line = (
  tt: string,
  order: string,
  at: string,
  ad: string,
  amount: string,
  extra: Partial<Record<string, string>> = {},
) =>
  settlementLine({
    "settlement-id": "TEST-001",
    "transaction-type": tt,
    "order-id": order,
    "amount-type": at,
    "amount-description": ad,
    amount,
    "fulfillment-id": "AFN",
    "posted-date": "05.03.2026",
    sku: "FAKE-SKU-1",
    ...extra,
  });

const SETTLEMENT =
  "﻿" +
  tsv([
    SETTLEMENT_HEADER,
    settlementLine({
      "settlement-id": "TEST-001",
      "settlement-start-date": "01.03.2026 00:00:00 UTC",
      "settlement-end-date": "15.03.2026 00:00:00 UTC",
      "deposit-date": "17.03.2026 00:00:00 UTC",
      "total-amount": "1,062.53",
      currency: "GBP",
    }),
    line("Order", "000-0000000-0000001", "ItemPrice", "Principal", "1,200.00", {
      "quantity-purchased": "1",
    }),
    line("Order", "000-0000000-0000001", "ItemPrice", "Shipping", "4.99"),
    line("Order", "000-0000000-0000001", "Promotion", "Shipping", "-4.99"),
    line("Order", "000-0000000-0000001", "ItemFees", "Commission", "-180.00"),
    line("Order", "000-0000000-0000001", "ItemFees", "FBAPerUnitFulfillmentFee", "-3.20"),
    line("Refund", "000-0000000-0000002", "ItemPrice", "Principal", "-20.00"),
    line("Refund", "000-0000000-0000002", "ItemFees", "RefundCommission", "0.60"),
    line("other-transaction", "", "other-transaction", "Storage Fee", "-1.10"),
    line("other-transaction", "", "other-transaction", "Subscription Fee", "-25.00"),
    line("ServiceFee", "", "Cost of Advertising", "TransactionTotalAmount", "-12.40"),
    line("other-transaction", "", "FBA Inventory Reimbursement", "WAREHOUSE_DAMAGE", "8.63"),
    line("other-transaction", "", "other-transaction", "Previous Reserve Amount Balance", "50.00"),
    line("other-transaction", "", "other-transaction", "Current Reserve Amount", "(55.00)"),
    line("other-transaction", "", "other-transaction", "Something new", "100.00"),
  ]);

describe("reading Amazon report files", () => {
  it("normalises headers across spellings", () => {
    expect(normaliseHeader("﻿settlement-id")).toBe("settlementid");
    expect(normaliseHeader("Fulfilment centre")).toBe(normaliseHeader("FulfillmentCenter"));
    expect(normaliseHeader("Event Type")).toBe(normaliseHeader("EventType"));
  });

  it("reads a tab file with a byte order mark", () => {
    const t = readReport(SETTLEMENT);
    expect(t.delimiter).toBe("\t");
    expect(t.headers[0]).toBe("settlement-id");
    expect(t.rows).toHaveLength(15);
    expect(detectKind(t)).toBe("settlement");
  });

  it("reads a comma file with notes above the header and quoted commas", () => {
    const csv = [
      '"Includes Amazon Marketplace, Fulfilment by Amazon (FBA), and Amazon Webstore transactions"',
      '"All amounts in GBP, unless specified"',
      '"date/time","settlement id","type","order id","sku","description","quantity","fulfilment","total"',
      '"1 Mar 2026 10:00:00 UTC","111","Refund","000-0000000-0000009","FAKE-SKU-9","Test item, blue","1","Amazon","-9.99"',
    ].join("\n");
    const t = readReport(csv);
    expect(t.delimiter).toBe(",");
    expect(t.rows).toHaveLength(1);
    expect(t.rows[0].description).toBe("Test item, blue");
    expect(detectKind(t)).toBe("transactions");
  });

  it("keeps a stray quote mark in a tab file", () => {
    const t = readReport(
      tsv([
        ["Date", "FNSKU", "MSKU", "Title", "Event Type", "Quantity", "Reason"],
        ["01/03/2026", "X000FAKE01", "FAKE-1", '12" test record', "Adjustments", "-1", "M"],
      ]),
    );
    expect(t.rows[0].title).toBe('12" test record');
    expect(detectKind(t)).toBe("ledger");
  });

  it("reads money in the shapes reports use", () => {
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("-1,234.56")).toBe(-1234.56);
    expect(parseAmount("£-3.00")).toBe(-3);
    expect(parseAmount("(3.00)")).toBe(-3);
    expect(parseAmount("12.50 GBP")).toBe(12.5);
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("-12,50")).toBe(-12.5);
    expect(parseAmount("1,234")).toBe(1234);
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("n/a")).toBeNull();
  });

  it("reads the date shapes Amazon uses", () => {
    expect(iso(parseReportDate("2026-03-14"))).toBe("2026-03-14");
    expect(iso(parseReportDate("2026-03-14T23:30:00+00:00"))).toBe("2026-03-14");
    expect(iso(parseReportDate("2026-03-14 09:30:00 UTC"))).toBe("2026-03-14");
    expect(iso(parseReportDate("14.03.2026 09:30:00 UTC"))).toBe("2026-03-14");
    expect(iso(parseReportDate("14/03/2026"))).toBe("2026-03-14");
    expect(iso(parseReportDate("03/14/2026"))).toBe("2026-03-14");
    expect(iso(parseReportDate("03/04/2026"))).toBe("2026-04-03");
    expect(iso(parseReportDate("03/04/2026", "mdy"))).toBe("2026-03-04");
    expect(iso(parseReportDate("14 Mar 2026 09:30:00 UTC"))).toBe("2026-03-14");
    expect(iso(parseReportDate("Mar 14, 2026 9:30:00 AM PDT"))).toBe("2026-03-14");
    expect(parseReportDate("31.02.2026")).toBeNull();
    expect(parseReportDate("soon")).toBeNull();
  });

  it("works out which way round slashed dates go", () => {
    expect(detectDateOrder(["03/04/2026", "25/04/2026"])).toEqual({
      order: "dmy",
      ambiguous: false,
    });
    expect(detectDateOrder(["03/04/2026", "04/25/2026"])).toEqual({
      order: "mdy",
      ambiguous: false,
    });
    expect(detectDateOrder(["03/04/2026"])).toEqual({ order: "dmy", ambiguous: true });
    expect(detectDateOrder(["2026-04-03"])).toEqual({ order: "dmy", ambiguous: false });
  });

  it("escapes CSV cells and blocks formulas", () => {
    expect(toCsv([["a,b", 1.5, "=SUM(A1)", "-12"]])).toBe('"a,b",1.50,\'=SUM(A1),-12');
  });
});

describe("settlement summariser", () => {
  it("groups lines the way a bookkeeper would", () => {
    const cases: [string, string, string, SettlementCategory][] = [
      ["Order", "ItemPrice", "Principal", "sales"],
      ["Order", "ItemPrice", "Shipping", "shipping"],
      ["Order", "ItemPrice", "Tax", "salesTax"],
      ["Order", "ItemWithheldTax", "MarketplaceFacilitatorVAT-Principal", "salesTax"],
      ["Order", "Promotion", "Principal", "promotions"],
      ["Refund", "ItemPrice", "Principal", "refunds"],
      ["Refund", "ItemPrice", "Shipping", "refunds"],
      ["Refund", "ItemFees", "RefundCommission", "referralFees"],
      ["Order", "ItemFees", "Commission", "referralFees"],
      ["Order", "ItemFees", "VariableClosingFee", "referralFees"],
      ["Order", "ItemFees", "FBAPerUnitFulfillmentFee", "fbaFees"],
      ["Order", "ItemFees", "ShippingChargeback", "fbaFees"],
      ["other-transaction", "other-transaction", "Storage Fee", "fbaFees"],
      ["other-transaction", "other-transaction", "Subscription Fee", "otherFees"],
      ["Order", "ItemFees", "Commission VAT", "vatOnFees"],
      ["ServiceFee", "Cost of Advertising", "TransactionTotalAmount", "advertising"],
      ["other-transaction", "FBA Inventory Reimbursement", "WAREHOUSE_LOST", "reimbursements"],
      [
        "other-transaction",
        "other-transaction",
        "Previous Reserve Amount Balance",
        "previousReserve",
      ],
      ["other-transaction", "other-transaction", "Current Reserve Amount", "currentReserve"],
      ["other-transaction", "other-transaction", "Something new", "other"],
    ];
    for (const [t, a, d, want] of cases)
      expect([t, a, d, classifySettlementLine(t, a, d)]).toEqual([t, a, d, want]);
  });

  it("summarises a settlement and checks it adds up", () => {
    const { settlements, missing } = summariseSettlements([readReport(SETTLEMENT)]);
    expect(missing).toEqual([]);
    expect(settlements).toHaveLength(1);
    const s = settlements[0];
    expect(s.id).toBe("TEST-001");
    expect(s.currency).toBe("GBP");
    expect(iso(s.start)).toBe("2026-03-01");
    expect(iso(s.deposit)).toBe("2026-03-17");
    expect(s.total).toBe(1062.53);
    expect(s.totals.sales).toBe(1200);
    expect(s.totals.shipping).toBe(4.99);
    expect(s.totals.promotions).toBe(-4.99);
    expect(s.totals.refunds).toBe(-20);
    expect(s.totals.referralFees).toBe(-179.4);
    expect(s.totals.fbaFees).toBe(-4.3);
    expect(s.totals.otherFees).toBe(-25);
    expect(s.totals.advertising).toBe(-12.4);
    expect(s.totals.reimbursements).toBe(8.63);
    expect(s.totals.previousReserve).toBe(50);
    expect(s.totals.currentReserve).toBe(-55);
    expect(s.totals.other).toBe(100);
    expect(s.sumOfLines).toBe(1062.53);
    expect(s.difference).toBe(0);
    expect(s.lineCount).toBe(14);
  });

  it("reports a difference when the lines do not match the total", () => {
    const broken = SETTLEMENT.replace("1,062.53", "1,000.00");
    const s = summariseSettlements([readReport(broken)]).settlements[0];
    expect(s.difference).toBe(62.53);
  });

  it("says which required columns are missing", () => {
    const t = readReport(
      tsv([
        ["settlement-id", "total-amount", "amount", "posted-date"],
        ["X", "1", "", ""],
      ]),
    );
    const r = summariseSettlements([t]);
    expect(r.settlements).toHaveLength(0);
    expect(r.missing).toEqual(["amount-type", "amount-description"]);
  });

  it("writes a summary CSV and a journal that nets to zero", () => {
    const { settlements } = summariseSettlements([readReport(SETTLEMENT)]);
    const summary = settlementSummaryCsv(settlements);
    expect(summary).toContain(
      "TEST-001,01/03/2026,15/03/2026,17/03/2026,GBP,Sales (item price),1200.00",
    );
    const accounts = Object.fromEntries(
      SETTLEMENT_CATEGORIES.map((c) => [c.id, c.account]),
    ) as Record<SettlementCategory, string>;
    accounts.sales = "4000 Sales";
    const journal = settlementJournalCsv(settlements, accounts, "Bank");
    const lines = journal.split("\r\n");
    expect(lines[0]).toBe("Date,Account,Description,Amount");
    expect(lines[1]).toBe(
      "17/03/2026,4000 Sales,Amazon settlement TEST-001: Sales (item price),1200.00",
    );
    expect(lines.at(-1)).toBe("17/03/2026,Bank,Amazon settlement TEST-001: payout,-1062.53");
    const sum = lines
      .slice(1)
      .reduce((n, l) => n + Math.round(Number(l.split(",").at(-1)) * 100), 0);
    expect(sum).toBe(0);
  });
});

describe("reimbursement checker", () => {
  const today = new Date(Date.UTC(2026, 4, 1)); // 1 May 2026

  it("knows the reason codes from Amazon's ledger help page", () => {
    expect(reasonGroup("M")).toBe("lost");
    expect(reasonGroup("5")).toBe("lost");
    for (const c of ["6", "7", "E", "H", "K", "U", "e"]) expect(reasonGroup(c)).toBe("damaged");
    expect(reasonGroup("F")).toBe("found");
    expect(reasonGroup("N")).toBe("found");
    for (const c of ["D", "O", "P", "Q", "3", "4", "G", ""]) expect(reasonGroup(c)).toBeNull();
    expect(reasonGroup("Inventory misplaced")).toBe("lost");
    expect(reasonGroup("Damaged at Amazon fulfilment centre")).toBe("damaged");
    expect(reasonGroup("Inventory found")).toBe("found");
    expect(reasonGroup("Inventory disposition change")).toBeNull();
  });

  const LEDGER_HEADER = [
    "Date",
    "FNSKU",
    "ASIN",
    "MSKU",
    "Title",
    "Event Type",
    "Reference ID",
    "Quantity",
    "Fulfillment Center",
    "Disposition",
    "Reason",
    "Country",
  ];
  const ledger = (rows: string[][], extraHeader: string[] = []) =>
    readReport(tsv([[...LEDGER_HEADER, ...extraHeader], ...rows]));
  const L = (
    date: string,
    fnsku: string,
    qty: string,
    reason: string,
    event = "Adjustments",
    extra: string[] = [],
  ) => [
    date,
    fnsku,
    "B000FAKE00",
    `SKU-${fnsku}`,
    "Test product",
    event,
    `REF-${date}-${reason}`,
    qty,
    "XXX1",
    "SELLABLE",
    reason,
    "GB",
    ...extra,
  ];

  it("flags lost units that were not found or reimbursed, oldest first by deadline", () => {
    const led = ledger([
      L("2026-03-10", "X000FAKE01", "-3", "M"),
      L("2026-03-20", "X000FAKE01", "2", "F"),
      L("2026-04-15", "X000FAKE02", "-1", "E"),
      L("2026-04-15", "X000FAKE02", "1", "P"),
      L("2026-04-16", "X000FAKE03", "-5", "Q"),
      L("2026-04-16", "X000FAKE03", "-2", "Shipments", "Shipments"),
    ]);
    const r = checkReimbursements({ ledger: [led] }, { today });
    expect(r.flags.map((f) => [f.fnsku, f.kind, f.quantity, iso(f.deadline), f.status])).toEqual([
      ["X000FAKE01", "lost", 1, "2026-05-09", "claim-now"],
      ["X000FAKE02", "damaged", 1, "2026-06-14", "claim-now"],
    ]);
    expect(r.flags[0].reason).toBe("Inventory misplaced (code M)");
    expect(r.flags[0].sku).toBe("SKU-X000FAKE01");
    expect(r.notes).toEqual([]);
  });

  it("matches reimbursements by FNSKU and ignores ones from well before the loss", () => {
    const led = ledger([
      L("2026-04-01", "X000FAKE01", "-2", "M"),
      L("2026-01-01", "X000FAKE04", "-1", "M"),
    ]);
    const reimb = readReport(
      tsv([
        [
          "approval-date",
          "reimbursement-id",
          "case-id",
          "amazon-order-id",
          "reason",
          "sku",
          "fnsku",
          "asin",
          "product-name",
          "condition",
          "currency-unit",
          "amount-per-unit",
          "amount-total",
          "quantity-reimbursed-cash",
          "quantity-reimbursed-inventory",
          "quantity-reimbursed-total",
        ],
        [
          "2026-04-05T10:00:00+00:00",
          "R-1",
          "",
          "",
          "Lost_Warehouse",
          "SKU-X000FAKE01",
          "X000FAKE01",
          "B000FAKE00",
          "Test product",
          "",
          "GBP",
          "4.00",
          "4.00",
          "1",
          "0",
          "1",
        ],
        [
          "2026-03-20T10:00:00+00:00",
          "R-2",
          "",
          "",
          "Lost_Warehouse",
          "SKU-X000FAKE01",
          "X000FAKE01",
          "B000FAKE00",
          "Test product",
          "",
          "GBP",
          "4.00",
          "4.00",
          "1",
          "0",
          "1",
        ],
      ]),
    );
    expect(detectKind(reimb)).toBe("reimbursements");
    const r = checkReimbursements({ ledger: [led], reimbursements: [reimb] }, { today });
    // R-1 covers one of the two lost on 1 April; R-2 is too early to count. The January loss is past its deadline.
    expect(r.flags.map((f) => [f.fnsku, f.quantity, f.status])).toEqual([
      ["X000FAKE04", 1, "deadline-passed"],
      ["X000FAKE01", 1, "claim-now"],
    ]);
  });

  it("trusts Amazon's unreconciled quantity when the ledger has it", () => {
    const led = ledger(
      [
        L("2026-04-01", "X000FAKE01", "-4", "M", "Adjustments", ["3", "1"]),
        L("2026-04-02", "X000FAKE02", "-1", "E", "Adjustments", ["1", "0"]),
      ],
      ["Reconciled Quantity", "Unreconciled Quantity"],
    );
    const r = checkReimbursements({ ledger: [led] }, { today });
    expect(r.flags.map((f) => [f.fnsku, f.quantity])).toEqual([["X000FAKE01", 1]]);
  });

  it("reads codes or descriptions and asks about ambiguous dates", () => {
    const led = ledger([L("03/04/2026", "X000FAKE01", "-1", "Inventory misplaced")]);
    const dmy = checkReimbursements({ ledger: [led] }, { today });
    expect(dmy.ambiguousDates).toBe(true);
    expect(iso(dmy.flags[0].date)).toBe("2026-04-03");
    const mdy = checkReimbursements({ ledger: [led] }, { today, dateOrder: "mdy" });
    expect(iso(mdy.flags[0].date)).toBe("2026-03-04");
  });

  const RETURNS_HEADER = [
    "return-date",
    "order-id",
    "sku",
    "asin",
    "fnsku",
    "product-name",
    "quantity",
    "fulfillment-center-id",
    "detailed-disposition",
    "reason",
    "status",
    "license-plate-number",
    "customer-comments",
  ];

  it("flags refunds on FBA orders with no return, using Amazon's 45 to 105 day window", () => {
    const settlement = readReport(
      tsv([
        SETTLEMENT_HEADER,
        settlementLine({ "settlement-id": "TEST-002", "total-amount": "-30.00", currency: "GBP" }),
        line("Refund", "000-0000000-0000011", "ItemPrice", "Principal", "-10.00", {
          "posted-date": "01.02.2026",
          sku: "SKU-A",
        }),
        line("Refund", "000-0000000-0000011", "ItemFees", "RefundCommission", "0.30", {
          "posted-date": "01.02.2026",
          sku: "SKU-A",
        }),
        line("Refund", "000-0000000-0000012", "ItemPrice", "Principal", "-10.00", {
          "posted-date": "01.04.2026",
          sku: "SKU-B",
        }),
        line("Refund", "000-0000000-0000013", "ItemPrice", "Principal", "-10.00", {
          "posted-date": "01.02.2026",
          sku: "SKU-C",
        }),
        line("Refund", "000-0000000-0000014", "ItemPrice", "Principal", "-10.00", {
          "posted-date": "01.02.2026",
          sku: "SKU-D",
          "fulfillment-id": "MFN",
        }),
        line("Refund", "000-0000000-0000015", "ItemPrice", "Principal", "-10.00", {
          "posted-date": "01.02.2026",
          sku: "SKU-E",
        }),
      ]),
    );
    const returns = readReport(
      tsv([
        RETURNS_HEADER,
        [
          "2026-02-10T00:00:00+00:00",
          "000-0000000-0000013",
          "SKU-C",
          "B000FAKE0C",
          "X000FAKE0C",
          "Test C",
          "1",
          "XXX1",
          "SELLABLE",
          "UNWANTED_ITEM",
          "Unit returned to inventory",
          "LPNFAKE",
          "",
        ],
      ]),
    );
    const reimb = readReport(
      tsv([
        [
          "approval-date",
          "reimbursement-id",
          "amazon-order-id",
          "reason",
          "sku",
          "fnsku",
          "asin",
          "quantity-reimbursed-total",
        ],
        [
          "2026-03-20",
          "R-9",
          "000-0000000-0000015",
          "CustomerReturn",
          "SKU-E",
          "X000FAKE0E",
          "B000FAKE0E",
          "1",
        ],
      ]),
    );
    expect(detectKind(returns)).toBe("returns");
    const r = checkReimbursements(
      { settlements: [settlement], returns: [returns], reimbursements: [reimb] },
      { today },
    );
    expect(
      r.flags.map((f) => [
        f.orderId,
        f.sku,
        f.quantity,
        iso(f.claimFrom),
        iso(f.deadline),
        f.status,
      ]),
    ).toEqual([
      ["000-0000000-0000011", "SKU-A", 1, "2026-03-18", "2026-05-17", "claim-now"],
      ["000-0000000-0000012", "SKU-B", 1, "2026-05-16", "2026-07-15", "too-early"],
    ]);
    expect(r.counts.refunds).toBe(4);
  });

  it("asks for the returns report rather than guessing", () => {
    const tx = readReport(
      [
        '"date/time","settlement id","type","order id","sku","description","quantity","fulfilment","total"',
        '"1 Feb 2026 10:00:00 UTC","111","Refund","000-0000000-0000021","SKU-Z","Test Z","1","Amazon","-9.99"',
      ].join("\n"),
    );
    const r = checkReimbursements({ transactions: [tx] }, { today });
    expect(r.flags).toEqual([]);
    expect(r.notes[0]).toMatch(/returns report/);
    const withReturns = checkReimbursements(
      { transactions: [tx], returns: [readReport(tsv([RETURNS_HEADER]))] },
      { today },
    );
    expect(withReturns.flags).toHaveLength(1);
    expect(withReturns.flags[0].title).toBe("Test Z");
  });

  it("writes a CSV of the flags", () => {
    const led = ledger([L("2026-04-01", "X000FAKE01", "-1", "M")]);
    const csv = flagsCsv(checkReimbursements({ ledger: [led] }, { today }).flags);
    expect(csv.split("\r\n")[1]).toBe(
      "Lost in warehouse,01/04/2026,SKU-X000FAKE01,X000FAKE01,B000FAKE00,Test product,,REF-2026-04-01-M,1,Inventory misplaced (code M),01/04/2026,31/05/2026,Can claim now",
    );
  });

  it("uses the same windows as the claims deadline checker", () => {
    expect(CLAIM_KINDS.find((k) => k.id === "fc")?.days).toBe(60);
    expect(CUSTOMER_RETURN_WINDOW).toEqual({ opensAfterDays: 45, closesAfterDays: 105 });
  });
});

/*
  Builds the free spreadsheets in public/downloads. Run with
  `npm run downloads:build` after changing a layout. The files are committed
  so the site serves them as plain static downloads.

  Each workbook opens with a "Start here" sheet explaining what to fill in.
  They work in Excel, Numbers and Google Sheets (File, Import).
*/

import ExcelJS from "exceljs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(process.cwd(), "public", "downloads");
const ROWS = 500;
const BRAND = "FF2563EB";
const HEADER_FILL = "FF0B1220";
const INPUT_FILL = "FFF8FAFC";
const MONEY = '£#,##0.00;[Red]-£#,##0.00';
const DATE = "dd/mm/yyyy";

type Col = { header: string; key: string; width: number; money?: boolean; date?: boolean; pct?: boolean; formula?: (r: number) => string; list?: string[]; note?: string };

function workbook(title: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "The Sellers Network";
  wb.title = title;
  wb.created = new Date("2026-09-28T00:00:00Z");
  return wb;
}

function startHere(wb: ExcelJS.Workbook, title: string, lines: string[]) {
  const ws = wb.addWorksheet("Start here", { properties: { tabColor: { argb: BRAND } } });
  ws.getColumn(1).width = 110;
  ws.addRow([title]).font = { bold: true, size: 16 };
  ws.addRow([]);
  for (const line of lines) {
    const row = ws.addRow([line]);
    row.alignment = { wrapText: true, vertical: "top" };
    if (line.startsWith("•")) row.getCell(1).alignment = { wrapText: true, indent: 1 };
  }
  ws.addRow([]);
  ws.addRow(["Free from The Sellers Network, a forum for UK resellers. Not tax, legal or financial advice."]).font = { italic: true, color: { argb: "FF64748B" } };
}

function table(wb: ExcelJS.Workbook, name: string, cols: Col[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  cols.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    if (c.money) col.numFmt = MONEY;
    if (c.date) col.numFmt = DATE;
    if (c.pct) col.numFmt = "0%";
    if (c.note) header.getCell(i + 1).note = c.note;
  });
  for (let r = 2; r <= ROWS + 1; r += 1) {
    cols.forEach((c, i) => {
      const cell = ws.getCell(r, i + 1);
      if (c.formula) {
        cell.value = { formula: c.formula(r) };
        cell.font = { color: { argb: "FF475569" } };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: INPUT_FILL } };
        if (c.list) cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${c.list.join(",")}"`] };
        if (c.date) cell.dataValidation = { type: "date", operator: "greaterThan", allowBlank: true, formulae: [new Date("2000-01-01")] };
      }
    });
  }
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return ws;
}

const PLATFORMS = ["eBay", "Amazon", "Vinted", "Facebook", "Depop", "Etsy", "Whatnot", "TikTok Shop", "Own site", "Other"];

async function bookkeeping() {
  const wb = workbook("Reseller bookkeeping");
  startHere(wb, "Reseller bookkeeping spreadsheet", [
    "One row per sale on the Sales sheet, one row per cost on the Expenses sheet. Grey columns work themselves out.",
    "• Sales: the date it sold, where, what, the order number, what the buyer paid, then the fees, postage and what you paid for the item.",
    "• Expenses: anything you bought to run the selling, such as packaging, printer labels, mileage to sourcing, or a subscription. Keep the receipt.",
    "• Summary: totals for the tax year you pick in cell B1, by platform and in total. The UK tax year runs 6 April to 5 April.",
    "Tip: download each platform's sales report monthly and copy the totals across, rather than typing every order by hand.",
    "The trading allowance, platform reporting and Self Assessment rules are explained, with links to GOV.UK, in the guide 'Bookkeeping and tax for UK resellers' on The Sellers Network.",
  ]);

  const sales: Col[] = [
    { header: "Date sold", key: "date", width: 12, date: true },
    { header: "Platform", key: "platform", width: 13, list: PLATFORMS },
    { header: "Item", key: "item", width: 34 },
    { header: "Order number", key: "order", width: 18 },
    { header: "Buyer paid (inc. postage)", key: "paid", width: 14, money: true },
    { header: "Platform fees", key: "fees", width: 12, money: true, note: "Selling fees, payment fees and ad fees for this order." },
    { header: "Postage cost", key: "postage", width: 12, money: true },
    { header: "Item cost", key: "cost", width: 12, money: true, note: "What you paid for the item." },
    { header: "Profit", key: "profit", width: 12, money: true, formula: (r) => `IF(E${r}="","",E${r}-F${r}-G${r}-H${r})` },
    { header: "Tax year", key: "ty", width: 11, formula: (r) => `IF(A${r}="","",IF(A${r}>=DATE(YEAR(A${r}),4,6),YEAR(A${r})&"-"&RIGHT(YEAR(A${r})+1,2),YEAR(A${r})-1&"-"&RIGHT(YEAR(A${r}),2)))` },
  ];
  table(wb, "Sales", sales);

  const expenses: Col[] = [
    { header: "Date", key: "date", width: 12, date: true },
    { header: "Paid to", key: "to", width: 22 },
    { header: "What for", key: "what", width: 34 },
    { header: "Type", key: "type", width: 18, list: ["Packaging", "Postage supplies", "Stock (unsold)", "Subscriptions", "Mileage", "Equipment", "Phone and internet", "Other"] },
    { header: "Amount", key: "amount", width: 12, money: true },
    { header: "Receipt kept?", key: "receipt", width: 12, list: ["Yes", "No"] },
    { header: "Tax year", key: "ty", width: 11, formula: (r) => `IF(A${r}="","",IF(A${r}>=DATE(YEAR(A${r}),4,6),YEAR(A${r})&"-"&RIGHT(YEAR(A${r})+1,2),YEAR(A${r})-1&"-"&RIGHT(YEAR(A${r}),2)))` },
  ];
  table(wb, "Expenses", expenses);

  const ws = wb.addWorksheet("Summary", { properties: { tabColor: { argb: BRAND } } });
  ws.getColumn(1).width = 28;
  for (const c of [2, 3, 4, 5, 6]) ws.getColumn(c).width = 16;
  ws.getCell("A1").value = "Tax year (type as 2026-27)";
  ws.getCell("A1").font = { bold: true };
  ws.getCell("B1").value = "2026-27";
  ws.getCell("B1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: INPUT_FILL } };
  const head = ws.getRow(3);
  head.values = ["Platform", "Sales", "Fees", "Postage", "Item costs", "Profit"];
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  const sum = (col: string, platform: string | null) =>
    platform ? `SUMIFS(Sales!${col}:${col},Sales!B:B,"${platform}",Sales!J:J,$B$1)` : `SUMIFS(Sales!${col}:${col},Sales!J:J,$B$1)`;
  let r = 4;
  for (const p of [...PLATFORMS, null]) {
    const row = ws.getRow(r);
    row.getCell(1).value = p ?? "All platforms";
    ["E", "F", "G", "H"].forEach((col, i) => (row.getCell(i + 2).value = { formula: sum(col, p) }));
    row.getCell(6).value = { formula: `B${r}-C${r}-D${r}-E${r}` };
    for (let c = 2; c <= 6; c += 1) row.getCell(c).numFmt = MONEY;
    if (!p) row.font = { bold: true };
    r += 1;
  }
  r += 1;
  const exp = ws.getRow(r);
  exp.getCell(1).value = "Expenses";
  exp.getCell(6).value = { formula: `-SUMIFS(Expenses!E:E,Expenses!G:G,$B$1)` };
  exp.getCell(6).numFmt = MONEY;
  const net = ws.getRow(r + 1);
  net.getCell(1).value = "Profit after expenses";
  net.getCell(6).value = { formula: `F${r - 2}+F${r}` };
  net.getCell(6).numFmt = MONEY;
  net.font = { bold: true };
  ws.getCell(`A${r + 3}`).value = "Sales count this tax year";
  ws.getCell(`F${r + 3}`).value = { formula: `COUNTIFS(Sales!J:J,$B$1)` };

  await wb.xlsx.writeFile(path.join(out, "reseller-bookkeeping.xlsx"));
}

async function stock() {
  const wb = workbook("Stock tracker");
  startHere(wb, "Stock tracker", [
    "One row per item you own and want to sell. It tells you what has been sitting too long.",
    "• Fill in the white columns. Days listed and Action work themselves out.",
    "• Action flags anything listed over 30 days as 'Check price' and over 60 days as 'Reprice or move it'. Change the numbers in the formula if your stock moves slower.",
    "• When it sells, set Status to Sold and fill in the sold price. Profit then works itself out.",
    "What to do with slow stock, step by step: see the 'Stale stock: define it, mark it down, move it or write it off' guide on The Sellers Network.",
  ]);
  const cols: Col[] = [
    { header: "SKU", key: "sku", width: 10, note: "Your own code. Write it on the bag or box too." },
    { header: "Item", key: "item", width: 34 },
    { header: "Location", key: "loc", width: 12, note: "Shelf, box or bag number." },
    { header: "Bought on", key: "bought", width: 12, date: true },
    { header: "Cost", key: "cost", width: 10, money: true },
    { header: "Listed on", key: "listedOn", width: 22, note: "Which platforms, e.g. eBay, Vinted." },
    { header: "Date listed", key: "listed", width: 12, date: true },
    { header: "Asking price", key: "ask", width: 11, money: true },
    { header: "Status", key: "status", width: 11, list: ["Listed", "Not listed", "Sold", "Returned", "Written off"] },
    { header: "Sold price", key: "sold", width: 11, money: true },
    { header: "Date sold", key: "soldOn", width: 12, date: true },
    { header: "Days listed", key: "days", width: 10, formula: (r) => `IF(G${r}="","",IF(I${r}="Sold",IF(K${r}="","",K${r}-G${r}),TODAY()-G${r}))` },
    { header: "Profit (before fees and postage)", key: "profit", width: 14, money: true, formula: (r) => `IF(J${r}="","",J${r}-E${r})` },
    { header: "Action", key: "action", width: 18, formula: (r) => `IF(OR(G${r}="",I${r}<>"Listed"),"",IF(TODAY()-G${r}>60,"Reprice or move it",IF(TODAY()-G${r}>30,"Check price","")))` },
  ];
  const ws = table(wb, "Stock", cols);
  ws.addConditionalFormatting({
    ref: `N2:N${ROWS + 1}`,
    rules: [
      { type: "containsText", operator: "containsText", text: "Reprice", priority: 1, style: { font: { color: { argb: "FFDC2626" }, bold: true } } },
      { type: "containsText", operator: "containsText", text: "Check", priority: 2, style: { font: { color: { argb: "FFD97706" } } } },
    ],
  });
  await wb.xlsx.writeFile(path.join(out, "stock-tracker.xlsx"));
}

async function sourcing() {
  const wb = workbook("Sourcing log");
  startHere(wb, "Sourcing log", [
    "One row per buy. Over a few months it shows which places and which kinds of item actually make you money.",
    "• Before you buy: check sold prices (not asking prices) and fill in Expected sale price and Fees and postage.",
    "• Expected profit and ROI work themselves out. ROI is profit divided by what you paid.",
    "• When it sells, fill in Actual sale price. The By source sheet then compares places side by side.",
    "How to judge a buy before you pay: see the 'Sourcing stock for resale in the UK' guide on The Sellers Network.",
  ]);
  const cols: Col[] = [
    { header: "Date", key: "date", width: 12, date: true },
    { header: "Source type", key: "type", width: 16, list: ["Car boot", "Charity shop", "Clearance", "Online shop", "Auction", "Wholesale", "Facebook", "Other"] },
    { header: "Where exactly", key: "where", width: 22 },
    { header: "Item", key: "item", width: 30 },
    { header: "Paid", key: "paid", width: 10, money: true },
    { header: "Expected sale price", key: "exp", width: 12, money: true, note: "From recent sold listings, not asking prices." },
    { header: "Fees and postage", key: "fees", width: 12, money: true },
    { header: "Expected profit", key: "eprofit", width: 12, money: true, formula: (r) => `IF(F${r}="","",F${r}-G${r}-E${r})` },
    { header: "Expected ROI", key: "eroi", width: 10, pct: true, formula: (r) => `IF(OR(F${r}="",E${r}="",E${r}=0),"",(F${r}-G${r}-E${r})/E${r})` },
    { header: "Actual sale price", key: "act", width: 12, money: true },
    { header: "Actual profit", key: "aprofit", width: 12, money: true, formula: (r) => `IF(J${r}="","",J${r}-G${r}-E${r})` },
    { header: "Notes", key: "notes", width: 30 },
  ];
  table(wb, "Log", cols);

  const ws = wb.addWorksheet("By source", { properties: { tabColor: { argb: BRAND } } });
  ws.columns = [
    { header: "Source type", width: 16 },
    { header: "Buys", width: 8 },
    { header: "Spent", width: 12 },
    { header: "Sold so far", width: 11 },
    { header: "Actual profit", width: 13 },
    { header: "Profit per £1 spent (sold items)", width: 18 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
  head.alignment = { wrapText: true };
  ["Car boot", "Charity shop", "Clearance", "Online shop", "Auction", "Wholesale", "Facebook", "Other"].forEach((s, i) => {
    const r = i + 2;
    const row = ws.getRow(r);
    row.getCell(1).value = s;
    row.getCell(2).value = { formula: `COUNTIF(Log!B:B,A${r})` };
    row.getCell(3).value = { formula: `SUMIF(Log!B:B,A${r},Log!E:E)` };
    row.getCell(4).value = { formula: `COUNTIFS(Log!B:B,A${r},Log!J:J,"<>")` };
    row.getCell(5).value = { formula: `SUMIF(Log!B:B,A${r},Log!K:K)` };
    row.getCell(6).value = { formula: `IFERROR(E${r}/SUMIFS(Log!E:E,Log!B:B,A${r},Log!J:J,"<>"),"")` };
    row.getCell(3).numFmt = MONEY;
    row.getCell(5).numFmt = MONEY;
    row.getCell(6).numFmt = '£0.00';
  });
  await wb.xlsx.writeFile(path.join(out, "sourcing-log.xlsx"));
}

async function main() {
  await mkdir(out, { recursive: true });
  await bookkeeping();
  await stock();
  await sourcing();
  console.log("Wrote public/downloads: reseller-bookkeeping.xlsx, stock-tracker.xlsx, sourcing-log.xlsx");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

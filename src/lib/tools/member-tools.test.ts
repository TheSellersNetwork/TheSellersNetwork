import { fillTemplate, templates } from "./buyer-messages";
import { labelAdvice, labelPlatforms, printers } from "./label-sizes";
import { ageing, daysHeld, emptyItem, filterItems, fromStockCsv, fromStockJson, loadStock, profit, suggestSku, taxYearStart, toStockCsv, toStockJson, totals, type StockItem } from "./stock";
import { ebaySoldUrl, searchPhrase, worthLinks } from "./worth-links";

let n = 0;
const id = () => `id-${(n += 1)}`;
const item = (over: Partial<StockItem>): StockItem => ({ ...emptyItem(id()), ...over });

describe("stock tracker: SKUs", () => {
  it("starts at 1001 and follows the last number", () => {
    expect(suggestSku([])).toBe("1001");
    expect(suggestSku(["1001", "1002"])).toBe("1003");
  });
  it("keeps the prefix and padding of the latest SKU and skips numbers already used", () => {
    expect(suggestSku(["C1004", "B0017"])).toBe("B0018");
    expect(suggestSku(["C1009", "B0017", "C1004"])).toBe("C1010");
    expect(suggestSku(["2610-003"])).toBe("2610-004");
  });
  it("ignores SKUs that do not end in a number", () => {
    expect(suggestSku(["blue-jacket"])).toBe("1001");
  });
});

describe("stock tracker: sums", () => {
  const today = "2026-09-30";
  const list = [
    item({ sku: "1001", cost: 5, status: "listed", bought: "2026-09-01" }),
    item({ sku: "1002", cost: 3, status: "in_stock", bought: "2026-05-01" }),
    item({ sku: "1003", cost: 4, status: "sold", soldPrice: 20, fees: 2.5, postage: 3, soldOn: "2026-09-10", bought: "2026-08-01" }),
    item({ sku: "1004", cost: 10, status: "sold", soldPrice: 30, soldOn: "2026-04-10", bought: "2026-03-01" }),
    item({ sku: "1005", cost: 2, status: "sold", soldPrice: 8, soldOn: "2026-04-02", bought: "2026-03-01" }),
    item({ sku: "1006", cost: 7, status: "written_off" }),
    item({ sku: "1007", cost: 1, status: "returned" }),
  ];

  it("works out profit after fees and postage", () => {
    expect(profit(list[2])).toBe(10.5);
    expect(profit(list[0])).toBeNull();
  });

  it("totals stock value, this month and this tax year", () => {
    const t = totals(list, today);
    expect(t.stockValue).toBe(9);
    expect(t.held).toBe(3);
    expect(t.soldThisMonth).toBe(1);
    expect(t.profitThisMonth).toBe(10.5);
    // 1005 sold on 2 April, before the tax year began on 6 April.
    expect(t.soldThisTaxYear).toBe(2);
    expect(t.profitThisTaxYear).toBe(30.5);
    expect(t.writtenOffCost).toBe(7);
  });

  it("finds the start of the UK tax year", () => {
    expect(taxYearStart("2026-04-05")).toBe("2025-04-06");
    expect(taxYearStart("2026-04-06")).toBe("2026-04-06");
    expect(taxYearStart("2027-01-15")).toBe("2026-04-06");
  });

  it("counts days held to today, or to the sale", () => {
    expect(daysHeld(list[0], today)).toBe(29);
    expect(daysHeld(list[2], today)).toBe(40);
    expect(daysHeld(list[5], today)).toBeNull();
  });

  it("groups unsold stock by age", () => {
    const a = ageing(list, today);
    expect(a.bands.find((b) => b.id === "0-30")?.count).toBe(1);
    expect(a.bands.find((b) => b.id === "90+")?.cost).toBe(3);
    expect(a.undated).toBe(1);
  });

  it("filters by search, status, platform and source", () => {
    const l = [item({ item: "Barbour jacket", platforms: ["eBay"], source: "Charity shop" }), item({ item: "Lego set", platforms: ["Vinted"], status: "sold" })];
    expect(filterItems(l, { query: "barbour", status: "all", platform: "", source: "" })).toHaveLength(1);
    expect(filterItems(l, { query: "", status: "unsold", platform: "", source: "" })).toHaveLength(1);
    expect(filterItems(l, { query: "", status: "all", platform: "Vinted", source: "" })[0].item).toBe("Lego set");
    expect(filterItems(l, { query: "", status: "all", platform: "", source: "Charity shop" })).toHaveLength(1);
  });
});

describe("stock tracker: export and import", () => {
  const today = "2026-09-30";
  const original = [
    item({ sku: "1001", item: 'Jacket, "wax"', cost: 12.5, platforms: ["eBay", "Vinted"], bought: "2026-09-01", listed: "2026-09-02", price: 45, status: "listed", source: "Car boot sale" }),
    item({ sku: "1002", item: "=SUM(A1)", cost: 2, status: "sold", soldPrice: 10, soldOn: "2026-09-20", fees: 1.5, postage: 2.7 }),
  ];

  it("starts with the spreadsheet's columns in its order", () => {
    const header = toStockCsv(original, today).split("\n")[0];
    expect(header.startsWith("SKU,Item,Location,Bought on,Cost,Listed on,Date listed,Asking price,Status,Sold price,Date sold,Days listed,Profit")).toBe(true);
  });

  it("uses the spreadsheet's status words and guards against formulas", () => {
    const csv = toStockCsv(original, today);
    expect(csv).toContain(",Listed,");
    expect(csv).toContain("'=SUM(A1)");
  });

  it("round-trips through CSV", () => {
    const back = fromStockCsv(toStockCsv(original, today), id);
    expect(back).toHaveLength(2);
    expect(back[0]).toMatchObject({ sku: "1001", item: 'Jacket, "wax"', cost: 12.5, platforms: ["eBay", "Vinted"], bought: "2026-09-01", status: "listed", source: "Car boot sale" });
    expect(back[1]).toMatchObject({ item: "=SUM(A1)", status: "sold", soldPrice: 10, soldOn: "2026-09-20", fees: 1.5, postage: 2.7 });
  });

  it("reads the spreadsheet's Not listed status as in stock", () => {
    const back = fromStockCsv("SKU,Item,Status,Cost\n1001,Scarf,Not listed,3", id);
    expect(back[0]).toMatchObject({ status: "in_stock", cost: 3 });
  });

  it("round-trips through JSON and drops bad values", () => {
    const back = fromStockJson(toStockJson(original), id);
    expect(back.map((b) => b.sku)).toEqual(["1001", "1002"]);
    const odd = fromStockJson(JSON.stringify({ items: [{ sku: "9", cost: "lots", status: "stolen", platforms: [1, "eBay"] }, null, "x"] }), id);
    expect(odd).toEqual([expect.objectContaining({ sku: "9", cost: null, status: "in_stock", platforms: ["eBay"] })]);
    expect(() => fromStockJson('{"hello":1}', id)).toThrow();
  });

  it("loads saved stock with its ids, and survives damaged storage", () => {
    expect(loadStock(toStockJson(original), id)[0].id).toBe(original[0].id);
    expect(loadStock("{not json", id)).toEqual([]);
    expect(loadStock(null, id)).toEqual([]);
  });
});

describe("what's it worth links", () => {
  it("builds the eBay UK sold and completed search", () => {
    const url = new URL(ebaySoldUrl("barbour bedale 40", "used"));
    expect(url.hostname).toBe("www.ebay.co.uk");
    expect(url.searchParams.get("_nkw")).toBe("barbour bedale 40");
    expect(url.searchParams.get("LH_Sold")).toBe("1");
    expect(url.searchParams.get("LH_Complete")).toBe("1");
    expect(url.searchParams.get("LH_ItemCondition")).toBe("3000");
  });

  it("joins brand, item and size, and gives nothing for an empty search", () => {
    expect(searchPhrase({ brand: " Lego ", item: "75192  Falcon", size: "" })).toBe("Lego 75192 Falcon");
    expect(worthLinks({ brand: "", item: " " })).toEqual([]);
  });

  it("says Vinted has no sold filter and adds specialist sources by category", () => {
    const general = worthLinks({ brand: "Nike", item: "Air Max" });
    expect(general.map((l) => l.id)).toEqual(["ebay", "vinted", "depop", "facebook"]);
    expect(general.find((l) => l.id === "vinted")?.note).toMatch(/no sold filter/);
    expect(worthLinks({ brand: "Lego", item: "10497", category: "lego" }).map((l) => l.id)).toEqual(expect.arrayContaining(["bricklink", "brickset"]));
    expect(worthLinks({ brand: "", item: "Abbey Road", category: "vinyl" }).some((l) => l.id === "discogs")).toBe(true);
    expect(worthLinks({ brand: "", item: "Zelda", category: "games" }).some((l) => l.id === "pricecharting")).toBe(true);
    expect(worthLinks({ brand: "", item: "Moorcroft vase", category: "collectables" }).find((l) => l.id === "worthpoint")?.paid).toBe(true);
  });

  it("encodes the search text", () => {
    const vinted = worthLinks({ brand: "M&S", item: "coat" }).find((l) => l.id === "vinted")!;
    expect(new URL(vinted.href).searchParams.get("search_text")).toBe("M&S coat");
  });
});

describe("buyer message templates", () => {
  it("fills fields, formats money and leaves empty ones in brackets", () => {
    expect(fillTemplate("Hi [name], £[offer] for [item]", { name: "Sam", offer: "20.5" })).toBe("Hi Sam, £20.50 for [item]");
    expect(fillTemplate("[unknown] [price]", { price: "£40" })).toBe("[unknown] 40");
  });

  it("covers every situation in the brief, with no exclamation marks or em dashes", () => {
    expect(templates.map((t) => t.id)).toEqual(["lowball", "available", "measurements", "bundle", "late-payment", "return-in-policy", "return-out-of-policy", "not-received", "off-platform", "negative-feedback", "cancellation"]);
    for (const t of templates) {
      const text = [t.title, t.when, t.body, t.tip ?? "", ...(t.rules ?? []).map((r) => r.rule)].join(" ");
      expect(text).not.toMatch(/[!—]/);
      // Every bracketed field the body uses that we can fill must have an input.
      for (const m of t.body.matchAll(/\[(\w+)\]/g)) expect(t.fields).toContain(m[1]);
    }
  });

  it("links platform rules only to official help pages", () => {
    const hosts = new Set(templates.flatMap((t) => t.rules ?? []).map((r) => new URL(r.href).hostname));
    expect([...hosts].every((h) => h === "www.ebay.co.uk" || h === "www.vinted.co.uk")).toBe(true);
  });
});

describe("label size helper", () => {
  it("always says actual size, never fit to page", () => {
    for (const p of printers) expect(p.settings.find((s) => s.name === "Scaling")?.value).toMatch(/^Actual size/);
  });

  it("has every printer and platform from the brief", () => {
    expect(printers.map((p) => p.id)).toEqual(["thermal", "a6", "a4-two", "a4-single"]);
    expect(labelPlatforms.map((p) => p.id)).toEqual(["click-drop", "ebay", "vinted", "amazon", "evri", "inpost"]);
    expect(labelAdvice("a6", "evri").platform.name).toBe("Evri");
  });

  it("only quotes platforms whose help page we could read", () => {
    for (const p of labelPlatforms) if (!p.verified) expect(p.says).toEqual([]);
  });
});

import { calculate, fbaFees } from "./fees";
import { amazonFile, breakpoints, computeFloors, floorPrice, matchCategory, matchFulfilment, parseSkus, profitAt, type Defaults, type Settings, type SkuInput } from "./repricer-floors";

const defaults: Defaults = { category: "other", fulfilment: "FBM", fbaFee: null, otherCosts: 0, months: 0, cubicFeet: 0 };
const base: SkuInput = { sku: "A1", cost: 5, price: 20, category: "toys", fulfilment: "FBM", fbaFee: null, otherCosts: 3, months: 0, cubicFeet: 0, notes: [] };
const settings: Settings = { rule: { kind: "profit", value: 2 }, vatOnFees: true, peak: false, maxMode: "multiple", maxFactor: 2 };

describe("repricer floors", () => {
  it("finds the FBM floor with the shared fee engine", () => {
    const min = floorPrice(base, 2, settings)!;
    const r = calculate("amazon_fbm", { price: min, postageCharged: 0, postageCost: 3, itemCost: 5, amazonCategory: "toys", vatOnFees: true });
    expect(r.profit).toBeGreaterThanOrEqual(2);
    const below = calculate("amazon_fbm", { price: min - 0.01, postageCharged: 0, postageCost: 3, itemCost: 5, amazonCategory: "toys", vatOnFees: true });
    expect(below.profit).toBeLessThan(2);
  });

  it("finds the FBA floor using fbaFees, with or without VAT on fees", () => {
    const fba: SkuInput = { ...base, fulfilment: "FBA", fbaFee: 3, otherCosts: 0.5, months: 1, cubicFeet: 0.05 };
    const withVat = floorPrice(fba, 2, settings)!;
    const without = floorPrice(fba, 2, { ...settings, vatOnFees: false })!;
    expect(without).toBeLessThan(withVat);
    const f = fbaFees(withVat, 3, "toys", 1, 0.05, false, true);
    expect(withVat - f.total - 5 - 0.5).toBeGreaterThanOrEqual(2);
  });

  it("moves the floor past a referral band edge where profit dips", () => {
    // Clothing: 5% up to £15, then 10% of the whole price up to £20. Just over £15 earns less than £15.
    const item: SkuInput = { ...base, category: "clothing", cost: 10, otherCosts: 0 };
    expect(breakpoints("clothing")).toEqual([15, 20]);
    const target = profitAt(item, 14.9, settings).profit;
    expect(profitAt(item, 15.01, settings).profit).toBeLessThan(target);
    const min = floorPrice(item, target, settings)!;
    expect(min).toBeGreaterThan(15);
    for (let p = min; p < 30; p += 0.01) expect(profitAt(item, Math.round(p * 100) / 100, settings).profit).toBeGreaterThanOrEqual(target - 1e-9);
  });

  it("uses cost times ROI as the target for the ROI rule", () => {
    const [row] = computeFloors([base], { ...settings, rule: { kind: "roi", value: 50 } });
    expect(row.target).toBe(2.5);
    expect(row.profitAtMin).toBeGreaterThanOrEqual(2.5);
  });

  it("sets the maximum from the minimum or the current price", () => {
    const [a] = computeFloors([base], settings);
    expect(a.max).toBeCloseTo(a.min! * 2, 2);
    const [b] = computeFloors([base], { ...settings, maxMode: "current", maxFactor: 1.5 });
    expect(b.max).toBe(30);
    const [c] = computeFloors([{ ...base, price: 5 }], { ...settings, maxMode: "current", maxFactor: 1 });
    expect(c.max).toBe(c.min);
    expect(c.problems.join(" ")).toMatch(/below the minimum/);
    const [d] = computeFloors([{ ...base, price: null }], { ...settings, maxMode: "current", maxFactor: 1.5 });
    expect(d.max).toBeNull();
  });

  it("flags FBA rows with no fulfilment fee", () => {
    const [row] = computeFloors([{ ...base, fulfilment: "FBA" }], settings);
    expect(row.min).toBeNull();
    expect(row.problems[0]).toMatch(/No FBA fee/);
  });

  it("reads CSV and tab-separated files by header name", () => {
    const csv = "SKU,Cost Price,Your Price,Category,Fulfillment Channel,FBA Fee\nA1,£5.00,20,Toys and games,AMAZON_EU,3.00\nB2,4,,books,DEFAULT,\n,3,,,,\nC3,,,,,\n";
    const r = parseSkus(csv, defaults);
    expect(r.columns.sku).toBe("SKU");
    expect(r.columns.cost).toBe("Cost Price");
    expect(r.columns.sizeTier).toBeNull();
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ sku: "A1", cost: 5, price: 20, category: "toys", fulfilment: "FBA", fbaFee: 3 });
    expect(r.rows[1]).toMatchObject({ sku: "B2", category: "books", fulfilment: "FBM", price: null });
    expect(r.skipped).toHaveLength(2);
    const tsv = parseSkus("seller-sku\tcost\tsize-tier\nX\t2\tSmall parcel, up to 400g", { ...defaults, fulfilment: "FBA" });
    expect(tsv.rows[0].fbaFee).toBe(3.0);
  });

  it("matches categories and fulfilment loosely", () => {
    expect(matchCategory("Toys & games")).toBe("toys");
    expect(matchCategory("Home and kitchen")).toBe("home");
    expect(matchCategory("Garden")).toBeNull();
    expect(matchFulfilment("AFN")).toBe("FBA");
    expect(matchFulfilment("MFN")).toBe("FBM");
  });

  it("writes Amazon's Automate Pricing columns", () => {
    const rows = computeFloors([base, { ...base, sku: "NOFEE", fulfilment: "FBA" }], settings);
    const plain = amazonFile(rows, "").split("\r\n");
    expect(plain[0]).toBe("sku,minimum-seller-allowed-price,maximum-seller-allowed-price");
    expect(plain).toHaveLength(2);
    expect(plain[1]).toMatch(/^A1,\d+\.\d{2},\d+\.\d{2}$/);
    const withRule = amazonFile(rows, "My rule, UK", "\t").split("\r\n");
    expect(withRule[0]).toBe("sku\tminimum-seller-allowed-price\tmaximum-seller-allowed-price\trule-name\trule-action");
    expect(withRule[1].endsWith("\tMy rule, UK\tSTART")).toBe(true);
  });
});

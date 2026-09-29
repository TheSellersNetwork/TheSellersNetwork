import { calculate, fbaFees, minimumPrice } from "./fees";

const sale = { price: 20, postageCharged: 3.5, postageCost: 3.2, itemCost: 5, vatOnFees: false };

describe("fee engine", () => {
  it("charges eBay business sellers FVF, per-order and regulatory fees on the total", () => {
    const r = calculate("ebay_business", { ...sale, ebayCategory: "clothing" });
    // 11.9% of 23.50 = 2.7965, + 0.40, + 0.35% of 23.50 = 0.08225
    expect(r.fees).toBeCloseTo(3.28, 2);
    expect(r.youReceive).toBeCloseTo(20.22, 2);
  });

  it("uses the lower per-order fee at £10 or under", () => {
    const r = calculate("ebay_business", { price: 8, postageCharged: 0, postageCost: 0, itemCost: 0, vatOnFees: false });
    expect(r.lines.find((l) => l.label === "Per-order fee")?.amount).toBe(0.3);
  });

  it("applies trainer rate to the whole sale at £100 or more", () => {
    const r = calculate("ebay_business", { price: 120, postageCharged: 0, postageCost: 0, itemCost: 0, ebayCategory: "trainers", vatOnFees: false });
    expect(r.lines[0].amount).toBeCloseTo(8.4, 2);
  });

  it("defaults eBay business sales to the 10.9% general group, matching eBay's live table", () => {
    const r = calculate("ebay_business", { price: 100, postageCharged: 0, postageCost: 0, itemCost: 0, vatOnFees: false });
    expect(r.lines[0].amount).toBeCloseTo(10.9, 2);
  });

  it("tiers women's handbags at 12.9% up to £800 and 7% above", () => {
    const r = calculate("ebay_business", { price: 1000, postageCharged: 0, postageCost: 0, itemCost: 0, ebayCategory: "handbags", vatOnFees: false });
    expect(r.lines[0].amount).toBeCloseTo(800 * 0.129 + 200 * 0.07, 2);
  });

  it("adds VAT on fees when asked", () => {
    const withVat = calculate("ebay_business", { ...sale, vatOnFees: true });
    const without = calculate("ebay_business", sale);
    expect(withVat.fees).toBeCloseTo(without.fees * 1.2, 1);
  });

  it("charges Vinted sellers nothing and the buyer the protection fee", () => {
    const r = calculate("vinted", sale);
    expect(r.fees).toBe(0);
    expect(r.youReceive).toBe(20);
    expect(r.buyerPays).toBeCloseTo(21.7, 2);
  });

  it("caps eBay Live commission", () => {
    const r = calculate("ebay_live", { price: 3000, postageCharged: 0, postageCost: 0, itemCost: 0, vatOnFees: false });
    expect(r.lines[0].amount).toBe(100);
  });

  it("finds the lowest price for a target profit", () => {
    const p = minimumPrice("depop", { postageCharged: 0, postageCost: 3, itemCost: 5, vatOnFees: false }, 10);
    expect(p).not.toBeNull();
    const r = calculate("depop", { price: p!, postageCharged: 0, postageCost: 3, itemCost: 5, vatOnFees: false });
    expect(r.profit).toBeGreaterThanOrEqual(10);
    expect(calculate("depop", { price: p! - 0.02, postageCharged: 0, postageCost: 3, itemCost: 5, vatOnFees: false }).profit).toBeLessThan(10);
  });

  it("works out FBA fees with the fuel surcharge", () => {
    const f = fbaFees(15, 3.0, "toys", 1, 0.1, false);
    expect(f.referralFee).toBeCloseTo(2.25, 2);
    expect(f.fuel).toBeCloseTo(0.05, 2);
    expect(f.total).toBeGreaterThan(5);
  });
});

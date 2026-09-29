import { describe, expect, it } from "vitest";
import { compareExample, parseShared, platformExample, readAmount, sharedQuery, type SharedInputs } from "@/lib/og/calculator-share";
import { calculate } from "@/lib/tools/fees";

const base: SharedInputs = { price: 20, postage: 0, postageCost: 0, cost: 0, category: null, noVat: false };

describe("shared calculator results", () => {
  it("reads money amounts safely", () => {
    expect(readAmount("19.999")).toBe(20);
    expect(readAmount("£1,250.5")).toBe(1250.5);
    expect(readAmount("-1")).toBeNull();
    expect(readAmount("abc")).toBeNull();
    expect(readAmount("1e9")).toBeNull();
    expect(readAmount("")).toBeNull();
  });

  it("round-trips inputs through the query string", () => {
    const inputs: SharedInputs = { price: 24.99, postage: 3.5, postageCost: 3.2, cost: 5, category: "general", noVat: true };
    const q = sharedQuery(inputs);
    expect(q).toBe("price=24.99&postage=3.5&postcost=3.2&cost=5&cat=general&novat=1");
    expect(parseShared(new URLSearchParams(q))).toEqual(inputs);
    expect(parseShared({ price: "20", cost: ["5", "6"] })).toEqual({ ...base, cost: 5 });
  });

  it("needs a selling price and drops unsafe categories", () => {
    expect(parseShared({})).toBeNull();
    expect(parseShared({ price: "0" })).toBeNull();
    expect(parseShared({ price: "10", cat: "<script>" })?.category).toBeNull();
  });

  it("leaves zero amounts and defaults out of the link", () => {
    expect(sharedQuery(base)).toBe("price=20");
  });

  it("works out the example with the same fee engine as the page", () => {
    const ex = platformExample("ebay", base)!;
    const r = calculate("ebay_business", { price: 20, postageCharged: 0, postageCost: 0, itemCost: 0, vatOnFees: true });
    expect(ex.result.youReceive).toBe(r.youReceive);
    expect(ex.headline).toBe(`Sell for £20 on eBay, keep £${r.youReceive.toFixed(2)}`);
    expect(ex.showProfit).toBe(false);
    expect(platformExample("amazon-fba", base)).toBeNull();
  });

  it("ranks every platform for the comparison card", () => {
    const c = compareExample({ ...base, cost: 5 }, 3);
    expect(c.rows).toHaveLength(3);
    expect(c.rows.some((r) => r.name.startsWith("eBay (private"))).toBe(false);
    expect(c.headline).toBe("Sell for £20: what you keep on each platform");
  });
});

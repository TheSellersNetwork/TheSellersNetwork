import { describe, expect, it } from "vitest";
import { calculate } from "@/lib/tools/fees";
import {
  better,
  cleanInputs,
  compareDefaults,
  compareItemOutcome,
  compareQuery,
  defaultName,
  extrasQuery,
  fbaDefaults,
  fbaOutcome,
  fbaQuery,
  isCalcKind,
  noExtras,
  openHref,
  outcome,
  outcomeChanged,
  readCompare,
  readEmbedPlatform,
  readExtras,
  readFba,
  readTheme,
  toPlatformSale,
  type PlatformInputs,
} from "./model";

const base: PlatformInputs = { price: 20, postage: 3.5, postageCost: 3.2, cost: 5, category: null, noVat: false, ...noExtras };

describe("saved calculation names and links", () => {
  it("names a calculation after its price and platform", () => {
    expect(defaultName("ebay_business", base)).toBe("£20 on eBay");
    expect(defaultName("vinted", { ...base, price: 12.5 })).toBe("£12.50 on Vinted");
    expect(defaultName("all", base)).toBe("£20 on every platform");
    expect(defaultName("amazon_fba", { ...fbaDefaults, price: 15 })).toBe("£15 on Amazon FBA");
  });

  it("opens the right calculator with the figures and options in the link", () => {
    expect(openHref("ebay_business", { ...base, promoted: 5, category: "trainers" })).toBe("/tools/calculator/ebay?price=20&postage=3.5&postcost=3.2&cost=5&cat=trainers&promo=5");
    expect(openHref("all", base)).toBe("/tools/calculator?price=20&postage=3.5&postcost=3.2&cost=5");
    expect(openHref("depop", { ...base, boost: true, promoted: 5 })).toContain("boost=1");
    expect(openHref("depop", { ...base, boost: true, promoted: 5 })).not.toContain("promo");
    expect(openHref("ebay_private", base)).toBe("/tools/calculator?price=20&postage=3.5&postcost=3.2&cost=5");
    expect(openHref("amazon_fba", fbaDefaults)).toMatch(/^\/tools\/calculator\/amazon-fba\?price=15&cost=6/);
  });

  it("reads platform options back from a link", () => {
    const q = new URLSearchParams(extrasQuery("ebay_business", { ...noExtras, promoted: 7.5 }));
    expect(readExtras(q).promoted).toBe(7.5);
    expect(readExtras({ promo: "500", boost: "1" })).toEqual({ ...noExtras, boost: true });
  });

  it("carries eBay's buyer region, International Shipping and currency options in the link", () => {
    const e = { ...noExtras, destination: "us_ca" as const, eis: true, fx: true };
    const q = extrasQuery("ebay_business", e);
    expect(q).toBe("dest=us_ca&eis=1&fx=1");
    expect(readExtras(new URLSearchParams(q))).toEqual(e);
    expect(extrasQuery("ebay_business", { ...noExtras, eis: true })).toBe("");
    expect(extrasQuery("vinted", e)).toBe("");
    expect(readExtras({ dest: "mars" }).destination).toBe("uk");
    expect(cleanInputs("ebay_business", { price: 10, destination: "europe", eis: true, fx: "yes" })).toMatchObject({ destination: "europe", eis: true, fx: false });
  });

  it("carries Whatnot's tier and high-value offer in the link, and the category as the shared category", () => {
    const i = { ...base, category: "fashion", tier: 3, hv: true };
    expect(openHref("whatnot", i)).toBe("/tools/calculator/whatnot?price=20&postage=3.5&postcost=3.2&cost=5&cat=fashion&tier=3&hv=1");
    expect(readExtras({ tier: "3", hv: "1" })).toMatchObject({ tier: 3, hv: true });
    expect(readExtras({ tier: "9" }).tier).toBe(0);
    expect(readExtras({ tier: "1.5" }).tier).toBe(0);
    expect(cleanInputs("whatnot", { price: 10, tier: 7 })).toMatchObject({ tier: 0 });
    // Fashion at Tier 3 is 5.25% of the £20 item price.
    expect(calculate("whatnot", toPlatformSale("whatnot", { ...i, noVat: true, hv: false })).lines[0].amount).toBeCloseTo(1.05, 2);
  });

  it("round-trips FBA figures and refuses a link with no price", () => {
    const i = { ...fbaDefaults, price: 22, peak: true, category: "books" };
    expect(readFba(new URLSearchParams(fbaQuery(i)))).toEqual(i);
    expect(readFba({ cost: "5" })).toBeNull();
    expect(readFba({ price: "10", fcat: "nonsense" })?.category).toBe(fbaDefaults.category);
  });
});

describe("recomputing with today's fees", () => {
  it("matches the fee engine for one platform", () => {
    const r = calculate("ebay_business", { price: 20, postageCharged: 3.5, postageCost: 3.2, itemCost: 5, ebayCategory: "general", amazonCategory: "other", vatOnFees: true, promotedPercent: 0 });
    const o = outcome("ebay_business", base);
    expect(o.fees).toBe(r.fees);
    expect(o.profit).toBe(r.profit);
    expect(o.margin).toBe(Math.round((r.profit / 20) * 1000) / 10);
  });

  it("names the best platform on the every-platform view", () => {
    const o = outcome("all", base);
    expect(typeof o.best).toBe("string");
    expect(o.best).not.toBe("eBay (private seller)");
  });

  it("works out FBA profit from the FBA fees", () => {
    const o = fbaOutcome(fbaDefaults);
    expect(o.profit).toBeCloseTo(o.youReceive - fbaDefaults.cost - fbaDefaults.inbound - fbaDefaults.prep, 2);
    expect(outcome("amazon_fba", fbaDefaults).profit).toBe(o.profit);
  });

  it("only flags a change when fees or profit moved", () => {
    const now = outcome("vinted", base);
    expect(outcomeChanged({ ...now }, now)).toBe(false);
    expect(outcomeChanged({ ...now, fees: now.fees + 0.5 }, now)).toBe(true);
    expect(outcomeChanged(null, now)).toBe(false);
    expect(outcomeChanged({ profit: 1 }, now)).toBe(false);
  });
});

describe("checking stored inputs", () => {
  it("clamps and fills gaps, and refuses a missing price", () => {
    expect(cleanInputs("vinted", { price: 10 })).toMatchObject({ price: 10, postage: 0, cost: 0, noVat: false });
    expect(cleanInputs("vinted", { price: -1 })).toBeNull();
    expect(cleanInputs("vinted", { price: "10" })).toBeNull();
    expect(cleanInputs("vinted", null)).toBeNull();
    expect(cleanInputs("ebay_business", { price: 10, promoted: 500, category: "<script>" })).toMatchObject({ promoted: 0, category: null });
    expect(cleanInputs("amazon_fba", { price: 10, months: 9999 })).toMatchObject({ months: 0, fulfil: fbaDefaults.fulfil });
  });

  it("knows the calculators", () => {
    expect(isCalcKind("amazon_fba")).toBe(true);
    expect(isCalcKind("all")).toBe(true);
    expect(isCalcKind("gumtree")).toBe(false);
  });
});

describe("compare two items", () => {
  it("round-trips through the link", () => {
    const s = { a: { platform: "depop" as const, price: 30, postage: 4, postageCost: 3, cost: 8, category: null }, b: { platform: "ebay_business" as const, price: 32, postage: 0, postageCost: 3.5, cost: 8, category: "trainers" }, noVat: true };
    expect(readCompare(new URLSearchParams(compareQuery(s)))).toEqual(s);
  });

  it("falls back to the defaults for a bare link and ignores unknown platforms", () => {
    expect(readCompare({})).toEqual(compareDefaults);
    expect(readCompare({ a_platform: "gumtree" }).a.platform).toBe(compareDefaults.a.platform);
  });

  it("works out fees as a share of the price", () => {
    const o = compareItemOutcome({ platform: "facebook_collection", price: 50, postage: 0, postageCost: 0, cost: 10, category: null }, false);
    expect(o.fees).toBe(0);
    expect(o.feeShare).toBe(0);
    expect(o.profit).toBe(40);
    expect(o.margin).toBe(80);
  });

  it("marks the better side", () => {
    expect(better(10, 12)).toBe("b");
    expect(better(10, 12, true)).toBe("a");
    expect(better(10, 10)).toBeNull();
    expect(better(null, 3)).toBeNull();
  });
});

describe("the embed", () => {
  it("reads the platform and theme", () => {
    expect(readEmbedPlatform("vinted")?.id).toBe("vinted");
    expect(readEmbedPlatform("amazon-fba")).toBeNull();
    expect(readEmbedPlatform(undefined)).toBeNull();
    expect(readTheme("dark")).toBe("dark");
    expect(readTheme("purple")).toBe("light");
  });
});

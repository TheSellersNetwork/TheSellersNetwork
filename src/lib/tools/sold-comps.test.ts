import { outliers, parsePrices, quantile, summarise } from "./sold-comps";

const vals = (t: string) => parsePrices(t).values.map((v) => v.value);

describe("sold comps parser", () => {
  it("reads one price per line, with or without a pound sign", () => {
    expect(vals("£12\n12.50\n15\n£1,234.56\nGBP 20")).toEqual([12, 12.5, 15, 1234.56, 20]);
  });

  it("reads ranges as two values", () => {
    expect(vals("£10 to £15")).toEqual([10, 15]);
    expect(vals("£10-15")).toEqual([10, 15]);
    expect(vals("£10 – £15")).toEqual([10, 15]);
  });

  it("leaves out postage lines and plus amounts", () => {
    const r = parsePrices("Sold 3 Sep\n£24.99\n+£3.20 postage\nPostage: £2.70\n£18.00 + £3.50 P&P\nFree postage");
    expect(r.values.map((v) => v.value)).toEqual([24.99, 18]);
    expect(r.ignored.map((x) => x.text)).toEqual(["+£3.20", "£2.70", "+ £3.50"]);
  });

  it("ignores whole numbers in running text but keeps prices in it", () => {
    expect(vals("Size 10 jacket, 3 bids, sold for £22.50")).toEqual([22.5]);
    expect(vals("Sold for 19.99 on 12.09.26")).toEqual([19.99]);
    expect(vals("iPhone 13 128GB")).toEqual([]);
  });

  it("reads a price next to delivery wording as postage only when it is the delivery amount", () => {
    expect(vals("£30.00 item, delivery £4.00")).toEqual([30]);
    expect(vals("£8.50 delivery")).toEqual([]);
  });

  it("skips percentages", () => {
    expect(vals("20.00% off, now £40.00")).toEqual([40]);
  });
});

describe("sold comps summary", () => {
  it("matches Excel QUARTILE.INC", () => {
    const s = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(quantile(s, 0.25)).toBeCloseTo(2.75);
    expect(quantile(s, 0.5)).toBeCloseTo(4.5);
    expect(quantile(s, 0.75)).toBeCloseTo(6.25);
  });

  it("summarises count, quartiles, min and max", () => {
    const s = summarise([20, 10, 15, 30, 25]);
    expect(s).toMatchObject({ count: 5, min: 10, q1: 15, median: 20, q3: 25, max: 30, mean: 20 });
    expect(summarise([])).toBeNull();
  });

  it("flags values far outside the middle half", () => {
    expect([...outliers([10, 11, 12, 12, 13, 14, 80])]).toEqual([80]);
    expect(outliers([1, 100]).size).toBe(0);
  });
});

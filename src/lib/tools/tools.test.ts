import { checkParcel, checkTube } from "./parcels";
import { daysUntil, upcomingTaxDates } from "./tax";
import { findTerm, glossaryPatterns } from "../glossary";

const fits = (dims: [number, number, number], kg: number) =>
  checkParcel(dims, kg)
    .filter((r) => r.fits)
    .map((r) => r.service.id);

describe("parcel checker", () => {
  it("puts a slim 400g item in a large letter, any way round", () => {
    expect(fits([2, 30, 20], 0.4)).toEqual(expect.arrayContaining(["rm-large-letter", "evri-postable"]));
  });

  it("uses the 1kg tracked large letter limit only for tracked", () => {
    const ids = fits([30, 20, 2], 0.9);
    expect(ids).toContain("rm-large-letter-tracked");
    expect(ids).not.toContain("rm-large-letter");
  });

  it("rejects a small parcel over 2kg but keeps medium", () => {
    const ids = fits([40, 30, 15], 3);
    expect(ids).not.toContain("rm-small-parcel");
    expect(ids).toContain("rm-medium-parcel");
    expect(ids).toContain("evri-parcel");
  });

  it("applies length plus girth for Evri parcels", () => {
    // 100 + 2 * (40 + 40) = 260, over Evri's 245.
    const r = checkParcel([100, 40, 40], 5).find((x) => x.service.id === "evri-parcel");
    expect(r?.fits).toBe(false);
    expect(r?.reason).toMatch(/girth/);
  });

  it("checks tubes", () => {
    expect(checkTube(80, 10).fits).toBe(true);
    expect(checkTube(95, 4).fits).toBe(false);
    expect(checkTube(90, 8).fits).toBe(false);
  });
});

describe("tax dates", () => {
  it("lists the next deadlines in order from a given day", () => {
    const today = new Date("2026-09-28T00:00:00Z");
    const next = upcomingTaxDates(today, 3, false);
    expect(next.map((t) => t.date.toISOString().slice(0, 10))).toEqual(["2026-10-05", "2026-10-31", "2027-01-31"]);
    expect(daysUntil(next[0].date, today)).toBe(7);
  });

  it("includes Making Tax Digital quarters only when asked", () => {
    const today = new Date("2026-10-06T00:00:00Z");
    expect(upcomingTaxDates(today, 2, true).some((t) => t.kind === "mtd")).toBe(true);
    expect(upcomingTaxDates(today, 5, false).some((t) => t.kind === "mtd")).toBe(false);
  });
});

describe("glossary", () => {
  const { pattern, lookup } = glossaryPatterns();
  const matches = (text: string) => Array.from(text.matchAll(pattern), (m) => findTerm(lookup, m[1])?.term);

  it("matches acronyms in capitals only", () => {
    expect(matches("Is FBA worth it? fba in lower case is not a term")).toEqual(["FBA"]);
  });

  it("matches phrases in any case and prefers the longest", () => {
    expect(matches("check your sold comps and the buy box")).toEqual(["sold comps", "Buy Box"]);
  });

  it("does not match inside other words", () => {
    expect(matches("ungated SKUs, ROIs and BINARY")).toEqual(["ungating"]);
  });
});

import { countHashtags, depopDescription, depopHashtags, etsyTags, etsyTitle, limits, titleWords, trimToWords, type ListingFields } from "./listing-copy";

const blank: ListingFields = { brand: "", item: "", model: "", detail: "", size: "", colour: "", material: "", extra: "" };
const jacket: ListingFields = { ...blank, brand: "Barbour", item: "Wax jacket", model: "Bedale", detail: "Tartan lining", size: "Size L", colour: "Olive", material: "Waxed cotton", extra: "Country, vintage" };

describe("listing copy", () => {
  it("puts words in search order without repeats", () => {
    expect(titleWords({ ...blank, brand: "Nike", item: "nike Air Max", size: "UK 9" })).toEqual(["Nike", "Air", "Max", "UK", "9"]);
  });

  it("trims titles by whole words and reports what was left out", () => {
    const r = trimToWords(["Barbour", "Bedale", "Wax", "Jacket"], 14);
    expect(r.text).toBe("Barbour Bedale");
    expect(r.dropped).toEqual(["Wax", "Jacket"]);
    expect(trimToWords(["a", "b"], 80).dropped).toEqual([]);
  });

  it("never goes over the eBay limit", () => {
    const words = Array.from({ length: 40 }, (_, i) => `word${i}`);
    expect(trimToWords(words, limits.ebayTitle).text.length).toBeLessThanOrEqual(80);
  });

  it("starts Etsy titles with a letter or number", () => {
    expect(etsyTitle(["'Vintage'", "Barbour"]).text).toBe("Vintage' Barbour");
    expect(etsyTitle(["-", "Barbour"]).text).toBe("Barbour");
  });

  it("builds up to 13 Etsy tags from the seller's own phrases only", () => {
    const tags = etsyTags(jacket);
    expect(tags[0]).toBe("barbour wax jacket");
    expect(tags).toContain("tartan lining");
    expect(tags).toContain("country");
    expect(tags.every((t) => t.length <= 20)).toBe(true);
    const typed = Object.values(jacket).join(" ").toLowerCase();
    for (const t of tags) for (const w of t.split(" ")) expect(typed).toContain(w);
  });

  it("splits long phrases into words and strips characters Etsy does not allow", () => {
    const tags = etsyTags({ ...blank, detail: "Hand-stitched leather strap!", extra: "#retro" });
    expect(tags).toEqual(["hand-stitched", "leather", "strap", "retro"]);
  });

  it("stops at 13 tags", () => {
    const extra = Array.from({ length: 20 }, (_, i) => `tag${i}`).join(", ");
    expect(etsyTags({ ...blank, extra })).toHaveLength(13);
  });

  it("makes up to five Depop hashtags from typed phrases", () => {
    expect(depopHashtags(jacket)).toEqual(["#barbour", "#waxjacket", "#bedale", "#tartanlining", "#waxedcotton"]);
    expect(depopHashtags({ ...blank, size: "10" })).toEqual([]);
  });

  it("leads the Depop description with the title and ends with hashtags", () => {
    const d = depopDescription("Barbour Wax Jacket", "Barbour Bedale\n\nCondition: good.", ["#barbour"]);
    expect(d.split("\n")[0]).toBe("Barbour Wax Jacket");
    expect(d.endsWith("#barbour")).toBe(true);
    expect(countHashtags(d)).toBe(1);
  });

  it("counts hashtags but not a stray hash sign", () => {
    expect(countHashtags("#one #two # three size#4")).toBe(2);
  });
});

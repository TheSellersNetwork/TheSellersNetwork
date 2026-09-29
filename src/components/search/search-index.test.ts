import { describe, expect, it } from "vitest";
import { addRecent, normalise, parseRecent, score, search, tokens, type IndexEntry } from "@/components/search/search-index";

const entries: IndexEntry[] = [
  { kind: "tool", title: "Fee and profit calculator", href: "/tools/calculator", text: "What you keep after fees on eBay and Vinted.", label: "Money", keywords: "Lowest offer you can accept" },
  { kind: "tool", title: "Postage finder", href: "/tools/postage", text: "The cheapest Royal Mail and Evri service.", label: "Selling" },
  { kind: "guide", title: "Vinted Pro explained", href: "/guides/vinted-pro", text: "Who needs it.", label: "Guide" },
  { kind: "post", title: "Royal Mail prices rose", href: "/blog/royal-mail", text: "Stamps and parcels.", label: "Explainer" },
];

describe("search index", () => {
  it("normalises case, accents and punctuation", () => {
    expect(normalise("Pokémon: Cards")).toBe("pokemon cards");
    expect(tokens("  Royal   MAIL ")).toEqual(["royal", "mail"]);
  });

  it("needs every meaningful word to match", () => {
    const words = tokens("royal mail");
    expect(score(entries[1], words)).toBeGreaterThan(0);
    expect(score(entries[0], words)).toBe(0);
  });

  it("ignores filler words when others match", () => {
    expect(score(entries[1], tokens("the postage"))).toBeGreaterThan(0);
    expect(score(entries[1], tokens("the parcel"))).toBe(0);
    expect(score(entries[0], tokens("how postage"))).toBe(0);
  });

  it("ranks title matches above description matches", () => {
    const hits = search(entries, "royal mail", ["tool", "post"], 5);
    expect(hits.map((h) => h.href)).toEqual(["/blog/royal-mail", "/tools/postage"]);
  });

  it("filters by kind and matches keywords", () => {
    expect(search(entries, "vinted", "guide", 5).map((h) => h.href)).toEqual(["/guides/vinted-pro"]);
    expect(search(entries, "lowest offer", "tool", 5).map((h) => h.href)).toEqual(["/tools/calculator"]);
    expect(search(entries, "", "tool", 5)).toEqual([]);
  });

  it("keeps recent searches newest first, unique and capped", () => {
    let list: string[] = [];
    for (const q of ["vinted", "ebay fees", "Vinted", "a", "royal mail", "tax", "fba", "depop"]) list = addRecent(list, q);
    expect(list).toEqual(["depop", "fba", "tax", "royal mail", "Vinted"]);
  });

  it("reads stored recent searches defensively", () => {
    expect(parseRecent(null)).toEqual([]);
    expect(parseRecent("not json")).toEqual([]);
    expect(parseRecent('{"a":1}')).toEqual([]);
    expect(parseRecent('["ebay", 3, "vinted"]')).toEqual(["ebay", "vinted"]);
  });
});

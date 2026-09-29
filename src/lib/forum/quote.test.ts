import { describe, expect, it } from "vitest";
import { buildQuoteMarkdown, quoteAttribution, tidyQuoteText } from "./quote";

describe("quoteAttribution", () => {
  it("links the username back to the post", () => {
    expect(quoteAttribution({ postNumber: 4, username: "sam_sells" })).toBe("[@sam_sells](#post-4) wrote:");
  });

  it("never names the author of an anonymous post", () => {
    expect(quoteAttribution({ postNumber: 2, username: "real_author", anonymous: true })).toBe("[Anonymous member](#post-2) wrote:");
  });

  it("falls back when there is no username", () => {
    expect(quoteAttribution({ postNumber: 1, username: null })).toBe("[A member](#post-1) wrote:");
  });
});

describe("tidyQuoteText", () => {
  it("collapses blank runs and trims", () => {
    expect(tidyQuoteText("\n\nfirst\n\n\n\nsecond  \n\n")).toBe("first\n\nsecond");
  });

  it("caps the number of lines", () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
    const out = tidyQuoteText(text, 3);
    expect(out.split("\n")).toHaveLength(3);
    expect(out.endsWith("…")).toBe(true);
  });

  it("caps the length on a word boundary", () => {
    const out = tidyQuoteText("one two three four five", 12, 12);
    expect(out).toBe("one two …");
  });
});

describe("buildQuoteMarkdown", () => {
  it("prefixes every line, keeping blank lines inside the quote", () => {
    expect(buildQuoteMarkdown({ text: "Yes.\n\nIt worked.", postNumber: 3, username: "jo" })).toBe("[@jo](#post-3) wrote:\n> Yes.\n>\n> It worked.");
  });

  it("returns nothing for an empty selection", () => {
    expect(buildQuoteMarkdown({ text: "  \n ", postNumber: 3, username: "jo" })).toBe("");
  });
});

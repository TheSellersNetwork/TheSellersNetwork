import { describe, expect, it } from "vitest";
import { clip, postTypeLabel, titleFontSize, ukLongDate } from "@/lib/og/labels";

describe("share card labels", () => {
  it("names the kind of post", () => {
    expect(postTypeLabel("comparison")).toBe("Comparison");
    expect(postTypeLabel("explainer", "business-bank-accounts-compared")).toBe("Comparison");
    expect(postTypeLabel("debate")).toBe("Debate");
    expect(postTypeLabel("myth-vs-reality")).toBe("Myth vs reality");
    expect(postTypeLabel("roundup")).toBe("Community");
    expect(postTypeLabel(null)).toBe("Article");
  });

  it("writes UK dates in full", () => {
    expect(ukLongDate("2026-09-29T00:00:00.000Z")).toBe("29 September 2026");
    expect(ukLongDate("2026-10-12")).toBe("12 October 2026");
    expect(ukLongDate("2026-06-30T23:30:00.000Z")).toBe("1 July 2026");
    expect(ukLongDate(null)).toBeNull();
    expect(ukLongDate("nonsense")).toBeNull();
  });

  it("clips at a word boundary", () => {
    expect(clip("short", 10)).toBe("short");
    expect(clip("one two three four five", 14)).toBe("one two three…");
  });

  it("steps the title size down for long titles", () => {
    expect(titleFontSize("Short")).toBeGreaterThan(titleFontSize("x".repeat(120)));
  });
});

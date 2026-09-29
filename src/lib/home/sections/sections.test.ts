import { describe, expect, it } from "vitest";
import { feeData } from "@/lib/tools/fees";
import { calculatorHref, gameItems, isCorrect, nextStreak, parseStreak, pickRound, reveal, whyLine, type GameItem } from "@/lib/home/sections/keep-game";
import { flatRows, moveActive, shareOut, type AskGroup } from "@/lib/home/sections/ask-search";
import { buildTimeline, defaultIndex, shortDate } from "@/lib/home/sections/fee-timeline";

/* A repeatable stand-in for Math.random. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe("keep game items", () => {
  const ebayIds = new Set(feeData.ebayBusiness.categories.map((c) => c.id));
  const amazonIds = new Set(feeData.amazon.referral.map((c) => c.id));

  it("has at least 12 items with valid categories and four or more platforms", () => {
    expect(gameItems.length).toBeGreaterThanOrEqual(12);
    for (const item of gameItems) {
      expect(ebayIds.has(item.ebayCategory), item.phrase).toBe(true);
      if (item.amazonCategory) expect(amazonIds.has(item.amazonCategory), item.phrase).toBe(true);
      expect(new Set(item.platforms).size).toBe(item.platforms.length);
      expect(item.platforms.length).toBeGreaterThanOrEqual(4);
      expect(item.price).toBeGreaterThan(item.cost);
    }
  });

  it("offers Etsy only for vintage items and Amazon only for items with an Amazon category", () => {
    for (const item of gameItems) {
      if (item.platforms.includes("etsy")) expect(item.phrase).toMatch(/vintage|19[0-9]0s/i);
      if (item.platforms.includes("amazon_fbm")) expect(item.amazonCategory).toBeTruthy();
    }
  });
});

describe("pickRound", () => {
  it("picks four distinct platforms the item suits", () => {
    const rng = seeded(7);
    for (let i = 0; i < 50; i += 1) {
      const round = pickRound(rng);
      expect(round.options).toHaveLength(4);
      expect(new Set(round.options).size).toBe(4);
      for (const p of round.options) expect(round.item.platforms).toContain(p);
    }
  });

  it("does not repeat the item just played", () => {
    const rng = seeded(3);
    let last = pickRound(rng);
    for (let i = 0; i < 30; i += 1) {
      const next = pickRound(rng, last.item);
      expect(next.item).not.toBe(last.item);
      last = next;
    }
  });
});

describe("reveal", () => {
  const jacket: GameItem = { phrase: "a jacket", price: 35, cost: 6, ebayCategory: "clothing", platforms: ["ebay_business", "vinted", "depop", "whatnot"] };

  it("sorts by what you keep, marks the winner and explains it", () => {
    const rows = reveal({ item: jacket, options: ["ebay_business", "depop", "vinted", "whatnot"] });
    expect(rows.map((r) => r.platform)[0]).toBe("vinted");
    expect(rows[0].keep).toBe(35);
    expect(rows[0].profit).toBe(29);
    expect(rows.filter((r) => r.best)).toHaveLength(1);
    for (let i = 1; i < rows.length; i += 1) expect(rows[i - 1].keep).toBeGreaterThanOrEqual(rows[i].keep);
    expect(whyLine(rows)).toBe("Vinted charges the seller nothing; the buyer pays the fee.");
    expect(isCorrect(rows, "vinted")).toBe(true);
    expect(isCorrect(rows, "ebay_business")).toBe(false);
  });

  it("gives a figure-based reason when a fee-charging platform wins", () => {
    const rows = reveal({ item: jacket, options: ["ebay_business", "whatnot", "etsy", "amazon_fbm"] });
    const line = whyLine(rows);
    expect(line).toMatch(/takes £[\d.]+ in fees on this sale, leaving you £[\d.]+ more than/);
    expect(line).not.toMatch(/—|!/);
  });
});

describe("calculatorHref", () => {
  it("links to the compare view with the item's figures", () => {
    expect(calculatorHref({ phrase: "x", price: 35, cost: 6, ebayCategory: "clothing", platforms: [] })).toBe("/tools/calculator?price=35&cost=6&cat=clothing");
    expect(calculatorHref({ phrase: "x", price: 18, cost: 4, ebayCategory: "general", platforms: [] })).toBe("/tools/calculator?price=18&cost=4");
  });
});

describe("streak", () => {
  it("counts up on a right answer and resets on a wrong one", () => {
    expect(parseStreak(null)).toBe(0);
    expect(parseStreak("junk")).toBe(0);
    expect(parseStreak("-2")).toBe(0);
    expect(parseStreak("3")).toBe(3);
    expect(nextStreak("3", true)).toBe(4);
    expect(nextStreak("3", false)).toBe(0);
    expect(nextStreak(null, true)).toBe(1);
  });
});

describe("shareOut", () => {
  const g = (id: string, n: number): AskGroup => ({ id, label: id, results: Array.from({ length: n }, (_, i) => ({ href: `/${id}/${i}`, title: `${id} ${i}`, meta: "" })) });

  it("gives every group a place before any group gets a second", () => {
    const out = shareOut([g("tools", 5), g("reading", 5), g("threads", 5)]);
    expect(out.map((x) => x.results.length)).toEqual([2, 2, 1]);
  });

  it("drops empty groups and fills from the rest", () => {
    const out = shareOut([g("tools", 0), g("reading", 1), g("threads", 6)]);
    expect(out.map((x) => [x.id, x.results.length])).toEqual([
      ["reading", 1],
      ["threads", 4],
    ]);
  });

  it("keeps fewer than the limit as they are", () => {
    expect(shareOut([g("tools", 1), g("reading", 2)]).reduce((n, x) => n + x.results.length, 0)).toBe(3);
    expect(shareOut([])).toEqual([]);
  });

  it("lists rows in keyboard order with the ask row last", () => {
    const rows = flatRows(shareOut([g("tools", 1), g("reading", 1)]));
    expect(rows.map((r) => r.href)).toEqual(["/tools/0", "/reading/0", null]);
  });
});

describe("moveActive", () => {
  it("wraps at both ends", () => {
    expect(moveActive(0, 3, "ArrowDown")).toBe(1);
    expect(moveActive(2, 3, "ArrowDown")).toBe(0);
    expect(moveActive(0, 3, "ArrowUp")).toBe(2);
    expect(moveActive(-1, 3, "ArrowUp")).toBe(2);
    expect(moveActive(-1, 3, "ArrowDown")).toBe(0);
    expect(moveActive(0, 0, "ArrowDown")).toBe(-1);
  });
});

describe("buildTimeline", () => {
  const c = (slug: string, date: string, status: "in-effect" | "coming" | "announced" = "in-effect") => ({ slug, title: slug, summary: "", platform: "ebay" as const, date, status });

  it("keeps the last six past changes and every upcoming one, oldest first", () => {
    const past = Array.from({ length: 9 }, (_, i) => c(`p${i}`, `2026-0${i + 1}-01`));
    const t = buildTimeline([c("u2", "2026-12-01"), ...past, c("u1", "2026-10-05")], "2026-09-30")!;
    expect(t.items.map((i) => i.slug)).toEqual(["p3", "p4", "p5", "p6", "p7", "p8", "u1", "u2"]);
    expect(t.pastCount).toBe(6);
    expect(t.items.filter((i) => i.upcoming).map((i) => i.slug)).toEqual(["u1", "u2"]);
    expect(defaultIndex(t)).toBe(6);
  });

  it("counts a change dated today as happened and marks announced plans", () => {
    const t = buildTimeline([c("today", "2026-09-30"), c("plan", "2025-03-11", "announced")], "2026-09-30")!;
    expect(t.pastCount).toBe(2);
    expect(t.items.find((i) => i.slug === "plan")?.announced).toBe(true);
    expect(defaultIndex(t)).toBe(1);
  });

  it("is null with nothing to show", () => {
    expect(buildTimeline([], "2026-09-30")).toBeNull();
  });

  it("formats short dates", () => {
    expect(shortDate("2026-10-05")).toMatch(/^5 Oct 2026$/);
  });
});

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import matter from "gray-matter";
import { groupOf, matchesType, parseBlogType, pickFeatured, type IndexItem } from "@/lib/content/blog-index";
import { isNumericColumn, isPickedRow, sortNumber, sortRowIndexes } from "@/lib/content/table-sort";
import { applyVote, summarisePoll, type PollCounts } from "@/lib/content/poll-summary";
import { parsePaths, parseReadList, parseStepKey, pathMemberships, pathProgress, type ReadingPath } from "@/lib/content/paths-core";
import { extractShortVersion } from "@/lib/content/article-extras";
import { parsePick, toMeta } from "@/lib/content/blog-meta";
import { isLive } from "@/lib/content/schedule";

describe("blog index", () => {
  test("groups posts into rows", () => {
    expect(groupOf({ kind: "change", category: null, slug: "x" })).toBe("changes");
    expect(groupOf({ kind: "article", category: "comparison", slug: "x" })).toBe("comparisons");
    expect(groupOf({ kind: "article", category: "explainer", slug: "business-bank-accounts-for-resellers-compared" })).toBe("comparisons");
    expect(groupOf({ kind: "article", category: "explainer", slug: "x" })).toBe("explainers");
    expect(groupOf({ kind: "article", category: "myth-vs-reality", slug: "x" })).toBe("myths");
    expect(groupOf({ kind: "article", category: "debate", slug: "x" })).toBe("debates");
    expect(groupOf({ kind: "article", category: "roundup", slug: "x" })).toBe("community");
    expect(groupOf({ kind: "article", category: null, slug: "x" })).toBe("more");
  });

  test("keeps the old ?type= values working", () => {
    expect(parseBlogType("articles")).toBe("articles");
    expect(parseBlogType("changes")).toBe("changes");
    expect(parseBlogType("nonsense")).toBe("all");
    expect(parseBlogType(["changes"])).toBe("all");
    const change: IndexItem = { slug: "c", kind: "change", category: null, date: "2026-09-01" };
    const post: IndexItem = { slug: "p", kind: "article", category: "explainer", date: "2026-09-01" };
    expect(matchesType(change, "articles")).toBe(false);
    expect(matchesType(post, "articles")).toBe(true);
    expect(matchesType(change, "changes")).toBe(true);
  });

  test("features the newest live article unless one is marked featured", () => {
    const items: IndexItem[] = [
      { slug: "scheduled", kind: "article", category: null, date: "2026-10-01", scheduled: "2026-10-01" },
      { slug: "change", kind: "change", category: null, date: "2026-09-20" },
      { slug: "newest", kind: "article", category: null, date: "2026-09-10" },
      { slug: "older", kind: "article", category: null, date: "2026-09-01" },
      { slug: "draft", kind: "article", category: null, date: null },
    ];
    expect(pickFeatured(items)?.slug).toBe("newest");
    expect(pickFeatured(items.map((i) => (i.slug === "older" ? { ...i, featured: true } : i)))?.slug).toBe("older");
    expect(pickFeatured(items.map((i) => (i.slug === "scheduled" ? { ...i, featured: true } : i)))?.slug).toBe("newest");
    expect(pickFeatured([])).toBeNull();
  });
});

describe("comparison tables", () => {
  test("reads money and percentages", () => {
    expect(sortNumber("£13.95 a month plus VAT")).toBe(13.95);
    expect(sortNumber("$69, $129 or $199 a month")).toBe(69);
    expect(sortNumber("€19.99")).toBe(19.99);
    expect(sortNumber("12.8%")).toBe(12.8);
    expect(sortNumber("£1,400")).toBe(1400);
    expect(sortNumber("Free")).toBe(0);
    expect(sortNumber("Not published")).toBeNull();
  });

  test("sorts numeric columns by value with blanks last", () => {
    const values = ["£20", "£3.50", "Not published", "£100", "Free"];
    expect(isNumericColumn(values)).toBe(true);
    expect(sortRowIndexes(values, "ascending")).toEqual([4, 1, 0, 3, 2]);
    expect(sortRowIndexes(values, "descending")).toEqual([3, 0, 1, 4, 2]);
  });

  test("sorts text columns alphabetically", () => {
    const values = ["Vinted", "eBay", "Amazon"];
    expect(isNumericColumn(values)).toBe(false);
    expect(sortRowIndexes(values, "ascending")).toEqual([2, 1, 0]);
  });

  test("matches the pick at the start of the first cell, on a word boundary", () => {
    expect(isPickedRow("Starling", ["Starling"])).toBe(true);
    expect(isPickedRow("eBay (business)", ["eBay"])).toBe(true);
    expect(isPickedRow("eBay, private seller", ["ebay"])).toBe(true);
    expect(isPickedRow("Tidewater", ["Tide"])).toBe(false);
    expect(isPickedRow("Monzo Business", ["Starling"])).toBe(false);
    expect(isPickedRow("Tracked 48", ["Royal Mail Tracked 48", "Tracked 48"])).toBe(true);
    expect(isPickedRow("Anything", [])).toBe(false);
  });

  test("reads pick from frontmatter as a string or a list", () => {
    expect(parsePick("Starling")).toEqual(["Starling"]);
    expect(parsePick(["A", " B ", "", 3])).toEqual(["A", "B"]);
    expect(parsePick(undefined)).toEqual([]);
    const { data } = matter('---\ntitle: "x"\npick: "Hiscox"\nfeatured: true\n---\n');
    const meta = toMeta("x.mdx", data);
    expect(meta.pick).toEqual(["Hiscox"]);
    expect(meta.featured).toBe(true);
  });

  test("every comparison post with a pick has a table row that matches it", () => {
    const dir = path.join(process.cwd(), "content", "blog");
    const slugs = [
      "amazon-sourcing-tools-compared",
      "bookkeeping-and-tax-software-compared",
      "business-bank-accounts-for-resellers-compared",
      "business-insurance-for-resellers-compared",
      "filing-self-assessment-options-compared",
      "parcel-lockers-and-drop-off-compared",
      "parcel-prices-compared",
      "photo-background-tools-compared",
      "seller-protection-compared",
      "selling-platforms-for-clothes-compared",
      "storage-units-compared",
      "thermal-label-printers-compared",
      "when-each-platform-pays-you",
    ];
    for (const slug of slugs) {
      const { data, content } = matter(readFileSync(path.join(dir, `${slug}.mdx`), "utf8"));
      const pick = parsePick(data.pick);
      expect(pick.length, slug).toBeGreaterThan(0);
      const firstCells = content
        .split("\n")
        .filter((l) => l.startsWith("|") && !/^\|\s*-/.test(l))
        .map((l) => l.split("|")[1].replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "").trim());
      expect(firstCells.some((c) => isPickedRow(c, pick)), slug).toBe(true);
    }
  });
});

describe("debate poll summary", () => {
  const poll = (votes: number[], mine: number | null = null): PollCounts => ({
    options: votes.map((v, i) => ({ id: `o${i}`, label: `Option ${i}`, votes: v })),
    total: votes.reduce((a, b) => a + b, 0),
    myOptionId: mine === null ? null : `o${mine}`,
  });

  test("no votes", () => {
    expect(summarisePoll(poll([0, 0, 0])).headline).toBe("No votes yet.");
  });

  test("fewer than five votes shows counts, not percentages", () => {
    const s = summarisePoll(poll([2, 1, 0], 0));
    expect(s.showPercent).toBe(false);
    expect(s.headline).toBe("Early days: 3 votes so far");
    expect(s.agreement).toBe("1 other voter chose the same as you");
    expect(summarisePoll(poll([1, 0, 0])).headline).toBe("Early days: 1 vote so far");
    expect(summarisePoll(poll([1, 0, 0], 0)).agreement).toBe("No one else has chosen this answer yet");
  });

  test("a close result is a split", () => {
    const s = summarisePoll(poll([52, 48, 0], 1));
    expect(s.showPercent).toBe(true);
    expect(s.headline).toBe("Voters are split 52 to 48");
    expect(s.agreement).toBe("You agree with 48% of voters");
  });

  test("a clear winner", () => {
    expect(summarisePoll(poll([61, 39])).headline).toBe("Most voters chose Option 0 (61%)");
    expect(summarisePoll(poll([45, 30, 25])).headline).toBe("The most popular answer is Option 0 (45%)");
  });

  test("voting and switching", () => {
    const first = applyVote(poll([2, 3]), "o0");
    expect(first.total).toBe(6);
    expect(first.options[0].votes).toBe(3);
    const switched = applyVote(first, "o1");
    expect(switched.total).toBe(6);
    expect(switched.options.map((o) => o.votes)).toEqual([2, 4]);
    expect(applyVote(switched, "o1")).toBe(switched);
  });
});

describe("beginner paths", () => {
  test("parses step keys and ignores malformed paths", () => {
    expect(parseStepKey("guide:photos-on-a-phone")).toEqual({ kind: "guide", slug: "photos-on-a-phone" });
    expect(parseStepKey("course:x")).toBeNull();
    const parsed = parsePaths({ paths: [{ slug: "a", title: "A", steps: ["guide:x", "bad"] }, { slug: "a", title: "Duplicate", steps: [] }, { slug: "B C", title: "Bad slug", steps: [] }] });
    expect(parsed).toEqual([{ slug: "a", title: "A", description: "", steps: ["guide:x"] }]);
  });

  test("progress and memberships", () => {
    const step = (slug: string) => ({ key: `guide:${slug}` as const, kind: "guide" as const, slug, title: slug, excerpt: "", href: `/guides/${slug}` });
    const paths: ReadingPath[] = [
      { slug: "one", title: "One", description: "", steps: [step("a"), step("b"), step("c")] },
      { slug: "two", title: "Two", description: "", steps: [step("c")] },
    ];
    expect(pathProgress(paths[0].steps, ["guide:a", "guide:c", "guide:zzz"])).toEqual({ done: 2, total: 3 });
    const m = pathMemberships(paths, "guide:b");
    expect(m).toHaveLength(1);
    expect(m[0].index).toBe(1);
    expect(m[0].next?.slug).toBe("c");
    expect(pathMemberships(paths, "guide:c").map((x) => [x.path.slug, x.next])).toEqual([
      ["one", null],
      ["two", null],
    ]);
  });

  test("stored read list survives bad data", () => {
    expect(parseReadList(null)).toEqual([]);
    expect(parseReadList("not json")).toEqual([]);
    expect(parseReadList('{"a":1}')).toEqual([]);
    expect(parseReadList('["guide:a","guide:a",3,"nonsense"]')).toEqual(["guide:a"]);
  });

  test("content/paths.json has 4 to 6 paths and every step exists and is live", () => {
    const root = process.cwd();
    const paths = parsePaths(JSON.parse(readFileSync(path.join(root, "content", "paths.json"), "utf8")));
    expect(paths.length).toBeGreaterThanOrEqual(4);
    expect(paths.length).toBeLessThanOrEqual(6);
    for (const p of paths) {
      expect(p.description, p.slug).not.toBe("");
      for (const s of p.steps) {
        const { kind, slug } = parseStepKey(s)!;
        const file = path.join(root, "content", kind === "guide" ? "guides" : "blog", `${slug}.mdx`);
        expect(existsSync(file), s).toBe(true);
        const { data } = matter(readFileSync(file, "utf8"));
        expect(data.published, s).toBeTruthy();
        if (kind === "blog") expect(isLive(data.published instanceof Date ? data.published.toISOString() : String(data.published)), s).toBe(true);
      }
    }
  });
});

describe("key facts", () => {
  test("reads the short version bullets", () => {
    const md = "Intro\n\n## The short version\n\n- One **bold**\n- Two with a [link](/x)\n  that wraps\n\n## Next\n\n- Not this";
    expect(extractShortVersion(md)).toEqual(["One **bold**", "Two with a [link](/x) that wraps"]);
    expect(extractShortVersion("## Something else\n- a")).toEqual([]);
  });
});

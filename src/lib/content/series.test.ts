import { readFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import matter from "gray-matter";
import { parseSeries, readingNavLines, seriesMemberships, type Series } from "@/lib/content/series-core";
import { parsePaths, parseStepKey, type PathStep, type ReadingPath } from "@/lib/content/paths-core";
import { isLive } from "@/lib/content/schedule";
import { formatDay, lastUpdated, parseGuideChanges } from "@/lib/content/guide-changes";

const root = process.cwd();

function step(key: string): PathStep {
  const p = parseStepKey(key)!;
  return { key: key as PathStep["key"], kind: p.kind, slug: p.slug, title: p.slug, excerpt: "", href: `/${p.kind}/${p.slug}` };
}

describe("series.json", () => {
  const raw = JSON.parse(readFileSync(path.join(root, "content", "series.json"), "utf8"));
  const series = parseSeries(raw);

  test("parses every series without dropping any", () => {
    expect(series.length).toBe(raw.series.length);
    expect(series.length).toBeGreaterThan(0);
    for (const s of series) {
      expect(s.parts.length).toBe(raw.series.find((r: { slug: string }) => r.slug === s.slug).parts.length);
      expect(s.description.length).toBeGreaterThan(0);
    }
  });

  test("every part exists and is live", () => {
    const now = new Date();
    for (const s of series) {
      for (const key of s.parts) {
        const { kind, slug } = parseStepKey(key)!;
        const file = path.join(root, "content", kind === "guide" ? "guides" : "blog", `${slug}.mdx`);
        expect(existsSync(file), `${s.slug}: ${key} is missing`).toBe(true);
        const { data } = matter(readFileSync(file, "utf8"));
        expect(isLive(data.published as string | Date | undefined, now), `${s.slug}: ${key} is not live yet`).toBe(true);
      }
    }
  });

  test("copy follows the house style", () => {
    for (const s of series) {
      for (const text of [s.title, s.description]) {
        expect(text).not.toMatch(/[—!]/);
      }
    }
  });
});

describe("series helpers", () => {
  test("drops malformed series, duplicate slugs and duplicate parts", () => {
    const parsed = parseSeries({
      series: [
        { slug: "a", title: "A", parts: ["guide:one", "guide:one", "nonsense", "blog:two"] },
        { slug: "a", title: "Again", parts: [] },
        { slug: "Bad Slug", title: "B", parts: [] },
        { slug: "c", parts: [] },
      ],
    });
    expect(parsed).toEqual([{ slug: "a", title: "A", description: "", parts: ["guide:one", "blog:two"] }]);
    expect(parseSeries(null)).toEqual([]);
  });

  const series: Series[] = [{ slug: "s", title: "S", description: "", parts: ["guide:a", "guide:b", "blog:c"].map(step) }];

  test("finds position and neighbours", () => {
    const [m] = seriesMemberships(series, "guide:b");
    expect(m.index).toBe(1);
    expect(m.previous?.key).toBe("guide:a");
    expect(m.next?.key).toBe("blog:c");
    expect(seriesMemberships(series, "guide:a")[0].previous).toBeNull();
    expect(seriesMemberships(series, "blog:c")[0].next).toBeNull();
    expect(seriesMemberships(series, "guide:z")).toEqual([]);
  });

  test("combines series and paths into one list, without repeating an identical path", () => {
    const paths: ReadingPath[] = [
      { slug: "other", title: "Other", description: "", steps: ["guide:x", "guide:b"].map(step) },
      { slug: "same", title: "Same", description: "", steps: ["guide:a", "guide:b", "blog:c"].map(step) },
    ];
    const lines = readingNavLines(series, paths, "guide:b");
    expect(lines.map((l) => `${l.kind}:${l.slug}:${l.position}/${l.total}`)).toEqual(["series:s:2/3", "path:other:2/2"]);
    expect(lines[0].next?.key).toBe("blog:c");
    expect(lines[1].next).toBeNull();
    expect(lines.every((l) => !l.sameNext)).toBe(true);
    const shared = readingNavLines(series, [{ slug: "p", title: "P", description: "", steps: ["guide:b", "blog:c"].map(step) }], "guide:b");
    expect(shared[1]).toMatchObject({ kind: "path", sameNext: true });
    expect(readingNavLines([], paths, "guide:b").map((l) => l.slug)).toEqual(["other", "same"]);
    expect(readingNavLines(series, paths, "guide:none")).toEqual([]);
  });

  test("the real series and paths files agree on step keys", () => {
    const paths = parsePaths(JSON.parse(readFileSync(path.join(root, "content", "paths.json"), "utf8")));
    const series = parseSeries(JSON.parse(readFileSync(path.join(root, "content", "series.json"), "utf8")));
    for (const key of [...paths.flatMap((p) => p.steps), ...series.flatMap((s) => s.parts)]) {
      expect(parseStepKey(key)).not.toBeNull();
    }
  });
});

describe("guide changelog", () => {
  test("reads YAML dates and strings, drops bad entries and sorts newest first", () => {
    const changes = parseGuideChanges([
      { date: new Date("2026-09-28T00:00:00Z"), note: " Older " },
      { date: "2026-09-29", note: "Newer" },
      { date: "29/09/2026", note: "Bad date" },
      { date: "2026-09-30", note: "" },
      "nonsense",
    ]);
    expect(changes).toEqual([
      { date: "2026-09-29", note: "Newer" },
      { date: "2026-09-28", note: "Older" },
    ]);
    expect(parseGuideChanges(undefined)).toEqual([]);
  });

  test("only shows Updated when the change is after publication", () => {
    const changes = [{ date: "2026-09-29", note: "x" }];
    expect(lastUpdated(changes, "2026-09-25")).toBe("2026-09-29");
    expect(lastUpdated(changes, String(new Date("2026-09-25T00:00:00Z")))).toBe("2026-09-29");
    expect(lastUpdated(changes, "2026-09-29")).toBeNull();
    expect(lastUpdated([], "2026-09-25")).toBeNull();
    expect(formatDay("2026-09-29")).toBe("29 September 2026");
  });

  test("every guide changelog in the repo parses fully and follows the house style", () => {
    const dir = path.join(root, "content", "guides");
    let seen = 0;
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".mdx"))) {
      const slug = file;
      const { data } = matter(readFileSync(path.join(dir, file), "utf8"));
      if (data.changes === undefined) continue;
      seen += 1;
      const changes = parseGuideChanges(data.changes);
      expect(changes.length, slug).toBe((data.changes as unknown[]).length);
      for (const c of changes) expect(c.note).not.toMatch(/[—!]/);
    }
    expect(seen).toBeGreaterThan(0);
  });
});

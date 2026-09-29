/*
  Series: ordered runs of guides and blog posts on one subject, defined in
  content/series.json. Parts use the same "guide:slug" and "blog:slug" keys as
  the beginner paths. Pure helpers shared by the server loader, the article
  navigation and the unit tests.
*/

import { parseStepKey, type PathStep, type ReadingPath } from "@/lib/content/paths-core";

export type SeriesDefinition = { slug: string; title: string; description: string; parts: string[] };

export type Series = { slug: string; title: string; description: string; parts: PathStep[] };

/* Reads series.json, dropping anything malformed. Series slugs must be unique and URL safe; a part appears once per series. */
export function parseSeries(raw: unknown): SeriesDefinition[] {
  const list = raw && typeof raw === "object" && Array.isArray((raw as { series?: unknown }).series) ? (raw as { series: unknown[] }).series : [];
  const seen = new Set<string>();
  const out: SeriesDefinition[] = [];
  for (const s of list) {
    if (!s || typeof s !== "object") continue;
    const { slug, title, description, parts } = s as Record<string, unknown>;
    if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug) || seen.has(slug)) continue;
    if (typeof title !== "string" || !title.trim() || !Array.isArray(parts)) continue;
    seen.add(slug);
    const keys = parts.filter((p): p is string => parseStepKey(p) !== null).map((p) => p.trim());
    out.push({ slug, title: title.trim(), description: typeof description === "string" ? description.trim() : "", parts: [...new Set(keys)] });
  }
  return out;
}

export type SeriesMembership = { series: Series; index: number; previous: PathStep | null; next: PathStep | null };

/* Every series an article sits in, with its position and its neighbours. */
export function seriesMemberships(series: Series[], key: string): SeriesMembership[] {
  return series.flatMap((s) => {
    const index = s.parts.findIndex((p) => p.key === key);
    return index === -1 ? [] : [{ series: s, index, previous: s.parts[index - 1] ?? null, next: s.parts[index + 1] ?? null }];
  });
}

/*
  One line per series and per beginner path for the navigation above an
  article. When a series and a path contain exactly the same parts in the
  same order, the path line is dropped so readers do not see the same thing
  twice, and a path's "Next" is left off when a series line above already
  points to the same article (sameNext).
*/
export type ReadingNavLine = { kind: "series" | "path"; slug: string; title: string; href: string; position: number; total: number; next: PathStep | null; sameNext: boolean };

export function readingNavLines(series: Series[], paths: ReadingPath[], key: string): ReadingNavLine[] {
  const lines: ReadingNavLine[] = seriesMemberships(series, key).map(({ series: s, index, next }) => ({
    kind: "series",
    slug: s.slug,
    title: s.title,
    href: `/guides/series#${s.slug}`,
    position: index + 1,
    total: s.parts.length,
    next,
    sameNext: false,
  }));
  const seriesNext = new Set(lines.flatMap((l) => (l.next ? [l.next.key] : [])));
  const sameAsSeries = (p: ReadingPath) =>
    seriesMemberships(series, key).some(({ series: s }) => s.parts.length === p.steps.length && s.parts.every((part, i) => part.key === p.steps[i].key));
  for (const path of paths) {
    const index = path.steps.findIndex((s) => s.key === key);
    if (index === -1 || sameAsSeries(path)) continue;
    const next = path.steps[index + 1] ?? null;
    lines.push({ kind: "path", slug: path.slug, title: path.title, href: `/guides/paths/${path.slug}`, position: index + 1, total: path.steps.length, next, sameNext: !!next && seriesNext.has(next.key) });
  }
  return lines;
}

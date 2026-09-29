import { publishedUkDate } from "@/lib/content/schedule";

/*
  A guide's changelog, from optional frontmatter:

    changes:
      - date: 2026-09-29
        note: "Corrected ..."

  YAML turns a bare date into a Date at UTC midnight, so both forms are read.
  Entries without a valid date or a note are dropped. Newest first.
*/

export type GuideChange = { date: string; note: string };

function isoDate(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    const d = new Date(`${value.trim()}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : value.trim();
  }
  return null;
}

export function parseGuideChanges(raw: unknown): GuideChange[] {
  if (!Array.isArray(raw)) return [];
  const out: GuideChange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const { date, note } = item as Record<string, unknown>;
    const day = isoDate(date);
    if (!day || typeof note !== "string" || !note.trim()) continue;
    out.push({ date: day, note: note.trim() });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/* The date to show as "Updated": the newest change, if it is after the publish date. */
export function lastUpdated(changes: GuideChange[], published: string | null): string | null {
  const newest = changes[0]?.date ?? null;
  if (!newest) return null;
  const pub = published ? publishedUkDate(published) : null;
  return pub && newest <= pub ? null : newest;
}

/* "29 September 2026". Date-only strings are formatted without a time zone shift. */
export function formatDay(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

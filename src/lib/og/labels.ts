/*
  Small text helpers for the share cards and the search index. Pure, with no
  server imports, so unit tests and client code can use them.
*/

import { publishedUkDate } from "@/lib/content/schedule";

/*
  The kind of blog post, as a short label. A slug ending in "-compared" is a
  comparison whatever its category, matching how the blog index groups posts.
*/
export function postTypeLabel(category: string | null | undefined, slug = ""): string {
  if (category === "comparison" || slug.endsWith("-compared")) return "Comparison";
  switch (category) {
    case "debate":
      return "Debate";
    case "explainer":
      return "Explainer";
    case "myth-vs-reality":
      return "Myth vs reality";
    case "community":
    case "introductions":
    case "roundup":
      return "Community";
    case "consumer":
      return "Consumer";
    default:
      return "Article";
  }
}

const longDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/* "29 September 2026" for an ISO date or timestamp, read as the UK calendar date. Null if unreadable. */
export function ukLongDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = publishedUkDate(value);
  if (!day) return null;
  const d = new Date(`${day}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : longDate.format(d);
}

/* Cut text to a length at a word boundary, ending in an ellipsis character. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:]+$/, "")}…`;
}

/* Title size on a 1200 by 630 card: long titles step down so they fit in three lines. */
export function titleFontSize(title: string): number {
  const n = title.length;
  if (n <= 40) return 68;
  if (n <= 70) return 58;
  if (n <= 100) return 50;
  return 44;
}

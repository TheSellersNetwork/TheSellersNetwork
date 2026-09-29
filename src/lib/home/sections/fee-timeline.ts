/*
  The fee change timeline on the home page: the last few changes that have
  happened and every one still to come, oldest first, with where "Today"
  sits between them. Pure, so the unit tests can use it.
*/

import type { ChangeMeta } from "@/lib/tools/changes";

export const PAST_LIMIT = 6;

type Source = Pick<ChangeMeta, "slug" | "title" | "summary" | "platform" | "date" | "status">;

/* `announced`: a plan with no start date yet, placed on the day it was announced. */
export type TimelineItem = Pick<ChangeMeta, "slug" | "title" | "summary" | "platform" | "date"> & { upcoming: boolean; announced: boolean };

export type Timeline = {
  items: TimelineItem[];
  /* How many items come before the Today marker. */
  pastCount: number;
};

/* `today` is a YYYY-MM-DD date. A change dated today has happened. Null when there is nothing to show. */
export function buildTimeline(changes: Source[], today: string, pastLimit = PAST_LIMIT): Timeline | null {
  const sorted = [...changes].filter((c) => /^\d{4}-\d{2}-\d{2}$/.test(c.date)).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const past = sorted.filter((c) => c.date <= today).slice(-pastLimit);
  const upcoming = sorted.filter((c) => c.date > today);
  if (past.length === 0 && upcoming.length === 0) return null;
  const pick = (c: (typeof sorted)[number], up: boolean): TimelineItem => ({ slug: c.slug, title: c.title, summary: c.summary, platform: c.platform, date: c.date, upcoming: up, announced: c.status === "announced" });
  return { items: [...past.map((c) => pick(c, false)), ...upcoming.map((c) => pick(c, true))], pastCount: past.length };
}

/* The item shown in the panel before anyone picks one: the next change to come, or else the latest. */
export function defaultIndex(t: Timeline): number {
  return t.pastCount < t.items.length ? t.pastCount : t.items.length - 1;
}

/* "5 Oct 2026". */
export function shortDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

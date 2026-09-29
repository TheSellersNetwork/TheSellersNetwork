/*
  Reseller calendar: the pure parts. Types, rule-based sale dates, turning
  each source into calendar events, merging, sorting and grouping. No server
  imports, so the client component and unit tests can use it. Loading the
  sources happens in src/lib/tools/calendar.ts.

  Dates are plain YYYY-MM-DD strings for UK calendar days. Date maths is done
  in UTC so a browser's time zone can never shift a day.
*/

import type { ChangeMeta } from "@/lib/tools/changes";
import { platformLabels } from "@/lib/tools/changes";
import type { TaxDate } from "@/lib/tools/tax";

export type CalendarCategory = "pokemon" | "lego" | "sale" | "changes" | "tax" | "other";

/* Display order for the filter chips and for events on the same day. */
export const calendarCategories: { id: CalendarCategory; label: string }[] = [
  { id: "pokemon", label: "Pokémon" },
  { id: "lego", label: "Lego" },
  { id: "sale", label: "Sales" },
  { id: "changes", label: "Fee and policy changes" },
  { id: "tax", label: "Tax" },
  { id: "other", label: "Bank holidays" },
];

export const categoryLabel = (c: CalendarCategory) => calendarCategories.find((x) => x.id === c)?.label ?? c;

export function isCategory(value: string): value is CalendarCategory {
  return calendarCategories.some((c) => c.id === value);
}

export type CalendarEvent = {
  /* Stable across rebuilds: calendar apps use it to update an event instead of duplicating it. */
  id: string;
  date: string;
  endDate?: string;
  title: string;
  category: CalendarCategory;
  detail?: string;
  note?: string;
  /* Where the date comes from, or the page on this site about it. Relative paths are site pages. */
  url?: string;
  linkLabel?: string;
  checked?: string;
};

/* A researched entry in content/calendar.json. */
export type CalendarEntry = {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  category: "pokemon" | "lego" | "sale" | "other";
  region: "UK";
  source: string;
  checked: string;
  note?: string;
};

const DAY = 86_400_000;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isYmd(value: unknown): value is string {
  if (typeof value !== "string" || !YMD.test(value)) return false;
  return toYmd(parseYmd(value)) === value;
}

export function parseYmd(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  return toYmd(new Date(parseYmd(value).getTime() + days * DAY));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseYmd(to).getTime() - parseYmd(from).getTime()) / DAY);
}

function slug(text: string) {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ---------- Rule-based retail dates ---------- */

/* US Thanksgiving: the fourth Thursday of November. */
export function thanksgiving(year: number): string {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay(); // 0 Sunday .. 6 Saturday
  const firstThursday = 1 + ((4 - first + 7) % 7);
  return toYmd(new Date(Date.UTC(year, 10, firstThursday + 21)));
}

/* Black Friday: the day after US Thanksgiving. */
export function blackFriday(year: number): string {
  return addDays(thanksgiving(year), 1);
}

/* Cyber Monday: the Monday after Black Friday. */
export function cyberMonday(year: number): string {
  return addDays(blackFriday(year), 3);
}

/* Boxing Day sales start on 26 December, whatever day of the week it falls on. */
export function boxingDay(year: number): string {
  return `${year}-12-26`;
}

export function ruleBasedSales(years: number[]): CalendarEvent[] {
  return years.flatMap((y) => [
    {
      id: `black-friday-${y}`,
      date: blackFriday(y),
      title: "Black Friday",
      category: "sale" as const,
      detail: "The Friday after the fourth Thursday of November (US Thanksgiving). Many UK retailers and marketplaces run offers in the days around it.",
      note: "Worked out from the rule, not announced by any retailer.",
    },
    {
      id: `cyber-monday-${y}`,
      date: cyberMonday(y),
      title: "Cyber Monday",
      category: "sale" as const,
      detail: "The Monday after Black Friday.",
      note: "Worked out from the rule, not announced by any retailer.",
    },
    {
      id: `boxing-day-sales-${y}`,
      date: boxingDay(y),
      title: "Boxing Day sales",
      category: "sale" as const,
      detail: "26 December. When it falls at a weekend the bank holiday moves to a weekday; that shows separately under bank holidays.",
      note: "Worked out from the rule, not announced by any retailer.",
    },
  ]);
}

/* ---------- UK bank holidays (GOV.UK feed) ---------- */

export const BANK_HOLIDAYS_PAGE = "https://www.gov.uk/bank-holidays";

type BankHolidayFeed = Record<string, { events?: { title?: unknown; date?: unknown; notes?: unknown }[] } | { title?: unknown; date?: unknown; notes?: unknown }[]>;

const divisionNames: Record<string, string> = {
  "england-and-wales": "England and Wales",
  scotland: "Scotland",
  "northern-ireland": "Northern Ireland",
};

/*
  Accepts the live GOV.UK shape ({ division: { events: [...] } }) or our stored
  fallback ({ division: [...] }). One event per holiday, naming the nations
  it applies to when it is not all of them.
*/
export function bankHolidayEvents(feed: BankHolidayFeed): CalendarEvent[] {
  const byKey = new Map<string, { date: string; title: string; substitute: boolean; divisions: string[] }>();
  for (const [division, value] of Object.entries(feed)) {
    if (!divisionNames[division]) continue;
    const events = Array.isArray(value) ? value : (value?.events ?? []);
    for (const e of events) {
      if (!isYmd(e.date) || typeof e.title !== "string" || !e.title) continue;
      const key = `${e.date}|${e.title}`;
      const found = byKey.get(key) ?? { date: e.date, title: e.title, substitute: /substitute/i.test(String(e.notes ?? "")), divisions: [] };
      found.divisions.push(division);
      byKey.set(key, found);
    }
  }
  return [...byKey.values()].map((h) => {
    const everywhere = Object.keys(divisionNames).every((d) => h.divisions.includes(d));
    const where = Object.keys(divisionNames)
      .filter((d) => h.divisions.includes(d))
      .map((d) => divisionNames[d]);
    const name = /bank holiday/i.test(h.title) ? h.title : `${h.title} bank holiday`;
    const place = everywhere ? "" : ` (${where.join(", ")})`;
    return {
      id: `bank-holiday-${h.date}-${slug(h.title)}`,
      date: h.date,
      title: `${name}${h.substitute ? ", substitute day" : ""}${place}`,
      category: "other" as const,
      detail: `Bank holiday in ${everywhere ? "all of the UK" : where.join(" and ")}. Check your carrier's collection and delivery days.`,
      url: BANK_HOLIDAYS_PAGE,
      linkLabel: "GOV.UK",
    };
  });
}

/* ---------- Researched entries (content/calendar.json) ---------- */

/* Drops anything without a valid date, a known category and an https source, so a bad edit cannot show an unsourced date. */
export function entryEvents(entries: unknown[]): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const raw of entries) {
    const e = raw as Partial<CalendarEntry>;
    if (!e || typeof e.id !== "string" || !e.id || typeof e.title !== "string" || !e.title) continue;
    if (!isYmd(e.date) || !isYmd(e.checked)) continue;
    if (e.endDate !== undefined && (!isYmd(e.endDate) || e.endDate < e.date)) continue;
    if (!["pokemon", "lego", "sale", "other"].includes(String(e.category))) continue;
    if (typeof e.source !== "string" || !/^https:\/\/[^\s]+$/.test(e.source)) continue;
    out.push({
      id: e.id,
      date: e.date,
      ...(e.endDate && e.endDate !== e.date ? { endDate: e.endDate } : {}),
      title: e.title,
      category: e.category as CalendarCategory,
      ...(e.note ? { note: String(e.note) } : {}),
      url: e.source,
      linkLabel: `Source: ${new URL(e.source).hostname.replace(/^www\./, "")}`,
      checked: e.checked,
    });
  }
  return out;
}

/* ---------- Fee and policy changes, tax dates ---------- */

export function changeEvents(changes: ChangeMeta[]): CalendarEvent[] {
  return changes
    .filter((c) => isYmd(c.date))
    .map((c) => ({
      id: `change-${c.slug}`,
      date: c.date,
      title: `${platformLabels[c.platform] ?? "Change"}: ${c.title}`,
      category: "changes" as const,
      ...(c.summary ? { detail: c.summary } : {}),
      url: `/blog/${c.slug}`,
      linkLabel: "Read what changes",
    }));
}

export function taxEvents(dates: TaxDate[]): CalendarEvent[] {
  return dates.map((t) => {
    const date = toYmd(t.date);
    return {
      id: `tax-${date}-${t.kind}-${slug(t.title)}`,
      date,
      title: t.title,
      category: "tax" as const,
      detail: t.detail,
      url: t.url,
      linkLabel: "GOV.UK",
    };
  });
}

/* ---------- Merging, filtering, grouping ---------- */

const order = new Map(calendarCategories.map((c, i) => [c.id, i]));

export function compareEvents(a: CalendarEvent, b: CalendarEvent): number {
  return a.date.localeCompare(b.date) || (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) || a.title.localeCompare(b.title);
}

/* One sorted list. Where two sources give the same id, the first list wins. */
export function mergeEvents(...lists: CalendarEvent[][]): CalendarEvent[] {
  const seen = new Map<string, CalendarEvent>();
  for (const list of lists) for (const e of list) if (!seen.has(e.id)) seen.set(e.id, e);
  return [...seen.values()].sort(compareEvents);
}

/* Events still running on or after `today`, plus those that ended within the last `pastDays`. */
export function eventsFrom(events: CalendarEvent[], today: string, pastDays = 0): CalendarEvent[] {
  const from = addDays(today, -pastDays);
  return events.filter((e) => (e.endDate ?? e.date) >= from);
}

export function filterCategories(events: CalendarEvent[], categories: readonly CalendarCategory[] | null): CalendarEvent[] {
  if (!categories || categories.length === 0) return events;
  return events.filter((e) => categories.includes(e.category));
}

/* "pokemon,tax" to known categories; unknown values are ignored. */
export function parseCategories(value: string | null | undefined): CalendarCategory[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((s) => s.trim().toLowerCase()).filter(isCategory))];
}

export function groupByMonth(events: CalendarEvent[]): { key: string; label: string; events: CalendarEvent[] }[] {
  const groups: { key: string; label: string; events: CalendarEvent[] }[] = [];
  for (const e of events) {
    const key = e.date.slice(0, 7);
    let group = groups.at(-1);
    if (!group || group.key !== key) {
      const label = parseYmd(`${key}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
      group = { key, label, events: [] };
      groups.push(group);
    }
    group.events.push(e);
  }
  return groups;
}

export function countdown(event: Pick<CalendarEvent, "date" | "endDate">, today: string): string {
  const start = daysBetween(today, event.date);
  const end = event.endDate ? daysBetween(today, event.endDate) : start;
  if (start <= 0 && end >= 0 && event.endDate) return end === 0 ? "On now, last day" : `On now, ends in ${end} ${end === 1 ? "day" : "days"}`;
  if (start === 0) return "Today";
  if (start === 1) return "Tomorrow";
  if (start > 1) return `In ${start} days`;
  if (end === -1) return "Yesterday";
  return `${-end} days ago`;
}

export function formatDay(value: string, withWeekday = true): string {
  return parseYmd(value).toLocaleDateString("en-GB", { ...(withWeekday ? { weekday: "short" } : {}), day: "numeric", month: "long", timeZone: "UTC" });
}

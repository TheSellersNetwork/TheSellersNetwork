/*
  The week's rhythm: one tile per day, Monday to Sunday of the current UK
  week, each with the ritual thread the cron posts that day
  (src/lib/rituals.ts). Pure, so the unit tests can pin the dates. Loading
  the threads and the calendar happens in week-rhythm.ts.
*/

import { pickStarter, ritualDue, rituals, type Ritual, type Starter } from "@/lib/rituals";
import { ukDate } from "@/lib/content/schedule";
import { addDays, parseYmd } from "@/lib/tools/calendar-dates";

export type RhythmItem = {
  key: string;
  ritualId: string;
  /* What the tile says: "What would you pay?", or the starter's question. */
  title: string;
  /* How the posted thread is found: its title starts with `prefix`, or equals `exact`. */
  match: { kind: "prefix"; prefix: string } | { kind: "exact"; title: string };
};

export type RhythmDay = {
  date: string;
  /* "Mon", "Tue" ... */
  short: string;
  /* "Monday" ... */
  name: string;
  theme: string;
  items: RhythmItem[];
  when: "past" | "today" | "future";
};

export type ThreadLite = { title: string; created_at: string; slug: string; short_id: string; reply_count: number };

const themes: Record<number, string> = {
  1: "Numbers and goals",
  2: "Discussion starter",
  3: "What would you pay?",
  4: "Discussion starter",
  5: "Friday wins",
  6: "Weekend pickups",
  0: "Rest day",
};

/* Friendlier names for the fixed-prefix threads. */
const itemTitles: Record<string, string> = {
  numbers: "What did you sell this week?",
  goals: "Goals for the week",
  wwyp: "What would you pay?",
  wins: "Friday wins",
  pickups: "Weekend pickups",
  monthly: "Monthly results",
};

/* Monday to Sunday (YYYY-MM-DD) of the UK week containing `now`. */
export function ukWeek(now: Date): string[] {
  const today = ukDate(now);
  const dow = parseYmd(today).getUTCDay();
  const monday = addDays(today, -((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

function itemFor(r: Ritual, date: string, starters: Starter[]): RhythmItem | null {
  if (r.starter) {
    const s = pickStarter(starters, parseYmd(date));
    return s ? { key: `${date}:${r.id}`, ritualId: r.id, title: s.title, match: { kind: "exact", title: s.title } } : null;
  }
  return { key: `${date}:${r.id}`, ritualId: r.id, title: itemTitles[r.id] ?? r.titlePrefix.replace(/:$/, ""), match: { kind: "prefix", prefix: r.titlePrefix } };
}

export function buildWeek(now: Date, starters: Starter[], list: Ritual[] = rituals): RhythmDay[] {
  const today = ukDate(now);
  return ukWeek(now).map((date) => {
    const d = parseYmd(date);
    const items = list
      .filter((r) => ritualDue(r, d))
      // Weekday rituals first, then the monthly one if the 1st falls here.
      .sort((a, b) => Number(!!a.monthDay) - Number(!!b.monthDay))
      .flatMap((r) => itemFor(r, date, starters) ?? []);
    return {
      date,
      short: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
      name: d.toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }),
      theme: themes[d.getUTCDay()],
      items,
      when: date < today ? "past" : date === today ? "today" : "future",
    };
  });
}

/* A PostgREST value in double quotes, so commas, brackets and colons in titles are safe. */
function quote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/* The `or` filter that finds every thread this week's tiles could link to, in one query. */
export function threadFilter(days: RhythmDay[]): string | null {
  const parts = new Set<string>();
  for (const day of days) {
    for (const item of day.items) {
      if (item.match.kind === "prefix") parts.add(`title.ilike.${quote(`${item.match.prefix.replace(/[%_]/g, "\\$&")}%`)}`);
      else parts.add(`title.eq.${quote(item.match.title)}`);
    }
  }
  return parts.size > 0 ? [...parts].join(",") : null;
}

/* The earliest created_at worth fetching: Monday's UTC midnight less two hours, which covers BST. */
export function weekStartInstant(days: RhythmDay[]): string {
  return new Date(parseYmd(days[0].date).getTime() - 2 * 3_600_000).toISOString();
}

/*
  The posted thread for each item: the first thread whose title matches and
  whose UK date is on or after the tile's day, within this week. A thread
  posted a day late still counts; one from last week never does.
*/
export function matchThreads<T extends ThreadLite>(days: RhythmDay[], threads: readonly T[]): Map<string, T> {
  const sorted = [...threads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const week = new Set(days.map((d) => d.date));
  const used = new Set<T>();
  const out = new Map<string, T>();
  for (const day of days) {
    for (const item of day.items) {
      const found = sorted.find((t) => {
        if (used.has(t)) return false;
        const posted = ukDate(new Date(t.created_at));
        if (!week.has(posted) || posted < day.date) return false;
        return item.match.kind === "exact" ? t.title === item.match.title : t.title.toLowerCase().startsWith(item.match.prefix.toLowerCase());
      });
      if (found) {
        used.add(found);
        out.set(item.key, found);
      }
    }
  }
  return out;
}

import "server-only";
import { cache } from "react";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";
import { getCalendar } from "@/lib/tools/calendar";
import { countdown, eventsFrom, formatDay } from "@/lib/tools/calendar-dates";
import { ukDate } from "@/lib/content/schedule";
import type { Starter } from "@/lib/rituals";
import { buildWeek, matchThreads, threadFilter, weekStartInstant, type RhythmDay, type ThreadLite } from "@/lib/home/sections/week-rhythm-core";

export type RhythmTile = RhythmDay & {
  threads: Record<string, ThreadLite>;
  /* Sunday only: a calendar date that day, or the next one coming up. */
  calendar: { title: string; when: string; day: string; onTheDay: boolean } | null;
};

async function readStarters(): Promise<Starter[]> {
  try {
    const raw: unknown = JSON.parse(await readFile(path.join(process.cwd(), "content", "templates", "rituals", "starters.json"), "utf8"));
    return Array.isArray(raw) ? (raw as Starter[]).filter((s) => s && typeof s.title === "string") : [];
  } catch {
    return [];
  }
}

/*
  This week's seven tiles with the threads already posted. One query for the
  threads: this week's topics whose title matches a ritual prefix or today's
  starter question.
*/
export const getWeekRhythm = cache(async (now: Date = new Date()): Promise<RhythmTile[]> => {
  const days = buildWeek(now, await readStarters());
  const filter = threadFilter(days);
  const today = ukDate(now);

  const [threads, calendar] = await Promise.all([
    (async (): Promise<ThreadLite[]> => {
      if (!filter) return [];
      try {
        const supabase = await createClient();
        const { data } = await supabase
          .from("topics")
          .select("title, created_at, slug, short_id, reply_count")
          .is("deleted_at", null)
          .gte("created_at", weekStartInstant(days))
          .or(filter)
          .order("created_at", { ascending: true })
          .limit(40);
        return (data ?? []) as ThreadLite[];
      } catch {
        return [];
      }
    })(),
    getCalendar(now).catch(() => []),
  ]);

  const matched = matchThreads(days, threads);
  return days.map((day) => {
    let cal: RhythmTile["calendar"] = null;
    if (day.theme === "Rest day") {
      const onDay = calendar.find((e) => e.date <= day.date && (e.endDate ?? e.date) >= day.date);
      const next = onDay ?? eventsFrom(calendar, today).find((e) => e.date >= today);
      if (next) cal = { title: next.title, when: countdown(next, today), day: formatDay(next.date), onTheDay: !!onDay };
    }
    return {
      ...day,
      threads: Object.fromEntries(day.items.flatMap((i) => (matched.has(i.key) ? [[i.key, matched.get(i.key)!]] : []))),
      calendar: cal,
    };
  });
});

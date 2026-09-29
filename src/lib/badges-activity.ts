/*
  Activity calendar for profiles: a GitHub-style grid of days, one column per
  week (Monday first), counted from real topics, replies and pickups. Days are
  UK calendar days. Pure functions, so the grid can be tested without a database.
*/

export type ActivityKind = "post" | "topic" | "pickup";
export type ActivityEvent = { at: string; kind: ActivityKind };

export type ActivityDay = { date: string; posts: number; topics: number; pickups: number; total: number; future: boolean };
export type ActivityWeek = { start: string; days: ActivityDay[]; posts: number; topics: number; pickups: number; total: number };
export type Activity = { weeks: ActivityWeek[]; total: number; max: number; activeWeeks: number };

const ukDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });

/* The UK calendar day of an instant, as YYYY-MM-DD. */
export function ukDayKey(at: string | Date): string {
  return ukDay.format(typeof at === "string" ? new Date(at) : at);
}

function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* Monday of the week a YYYY-MM-DD date falls in. */
export function mondayOf(ymd: string): string {
  const day = (new Date(`${ymd}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(ymd, -day);
}

/* The first instant to fetch rows from, for a grid of this many weeks ending this week. A day early, to be safe across time zones. */
export function activitySince(now: Date, weeks: number): string {
  return `${addDays(mondayOf(ukDayKey(now)), -7 * (weeks - 1) - 1)}T00:00:00Z`;
}

export function buildActivity(events: ActivityEvent[], now: Date, weeks = 52): Activity {
  const today = ukDayKey(now);
  const first = addDays(mondayOf(today), -7 * (weeks - 1));
  const byDay = new Map<string, ActivityDay>();
  const out: ActivityWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = addDays(first, w * 7);
    const days: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, d);
      const day = { date, posts: 0, topics: 0, pickups: 0, total: 0, future: date > today };
      byDay.set(date, day);
      days.push(day);
    }
    out.push({ start, days, posts: 0, topics: 0, pickups: 0, total: 0 });
  }
  for (const e of events) {
    const day = byDay.get(ukDayKey(e.at));
    if (!day || day.future) continue;
    if (e.kind === "post") day.posts++;
    else if (e.kind === "topic") day.topics++;
    else day.pickups++;
    day.total++;
  }
  let total = 0;
  let max = 0;
  let activeWeeks = 0;
  for (const week of out) {
    for (const d of week.days) {
      week.posts += d.posts;
      week.topics += d.topics;
      week.pickups += d.pickups;
      max = Math.max(max, d.total);
    }
    week.total = week.posts + week.topics + week.pickups;
    total += week.total;
    if (week.total > 0) activeWeeks++;
  }
  return { weeks: out, total, max, activeWeeks };
}

/* Shade from 0 (nothing) to 4 (the busiest day), relative to the member's own busiest day. */
export function activityLevel(total: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (total <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((total / max) * 4))) as 1 | 2 | 3 | 4;
}

/* "2 replies, 1 topic and 1 pickup", or "No activity". */
export function describeCounts(c: { posts: number; topics: number; pickups: number }): string {
  const parts = [
    c.topics ? `${c.topics} ${c.topics === 1 ? "topic" : "topics"}` : null,
    c.posts ? `${c.posts} ${c.posts === 1 ? "reply" : "replies"}` : null,
    c.pickups ? `${c.pickups} ${c.pickups === 1 ? "pickup" : "pickups"}` : null,
  ].filter((x): x is string => x !== null);
  if (parts.length === 0) return "No activity";
  if (parts.length === 1) return parts[0];
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

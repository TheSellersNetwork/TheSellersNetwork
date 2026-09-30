/*
  Deadline maths for defamation notices under the Defamation Act 2013 s5 and
  the Defamation (Operators of Websites) Regulations 2013 (SI 2013/3028).

  Two kinds of time limit:

  1. "Within 48 hours" (reg 1(3)): any period that falls on a Saturday, Sunday,
     Good Friday, Christmas Day or a bank holiday in England and Wales under the
     Banking and Financial Dealings Act 1971 is disregarded. So 48 hours is 48
     real hours counted only on working days, with day boundaries at midnight
     UK time.
  2. The poster's deadline (Schedule para 2): midnight at the end of the 5th
     day after the day on which the notification is sent. Calendar days, no
     days skipped, counted in UK time.

  Everything here is pure and works in UTC instants, converting to
  Europe/London only to find calendar days and midnights, so it gives the same
  answer on a server in any time zone and across the clock changes.
*/

const HOUR = 3_600_000;
const ZONE = "Europe/London";

/* A calendar day as "YYYY-MM-DD". */
export type DayKey = string;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function key(y: number, m: number, d: number): DayKey {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/* Adds whole days to a calendar day (no time zone involved). */
export function addDays(day: DayKey, days: number): DayKey {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return key(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

function weekday(day: DayKey): number {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/* The UK wall-clock reading of an instant. */
export function londonWallClock(instant: Date): { day: DayKey; hour: number; minute: number } {
  const parts = Object.fromEntries(londonParts.formatToParts(instant).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

/* The UK calendar day an instant falls on. */
export function londonDay(instant: Date): DayKey {
  return londonWallClock(instant).day;
}

/*
  The instant a UK calendar day begins. The clocks change at 01:00 UTC, never
  at midnight, so midnight is always either 00:00 UTC (GMT) or 23:00 UTC the
  day before (BST).
*/
export function londonMidnight(day: DayKey): Date {
  const [y, m, d] = day.split("-").map(Number);
  const gmt = new Date(Date.UTC(y, m - 1, d));
  const bst = new Date(gmt.getTime() - HOUR);
  const w = londonWallClock(bst);
  return w.day === day && w.hour === 0 ? bst : gmt;
}

/*
  Turns a UK wall-clock time typed by staff ("2026-10-21T14:30", as a
  datetime-local input gives it) into an instant. In the hour that happens
  twice in October the earlier (BST) one is used; a time in the hour that is
  skipped in March is moved forward by an hour, as a clock would be.
*/
export function londonLocalToInstant(local: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return null;
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  for (const offset of [HOUR, 0]) {
    const candidate = new Date(asUtc - offset);
    const w = londonWallClock(candidate);
    if (w.day === key(y, mo, d) && w.hour === h && w.minute === mi) return candidate;
  }
  // Skipped hour in spring: the same wall reading an hour later.
  return new Date(asUtc);
}

/* The reverse, for filling a datetime-local input with a stored time. */
export function instantToLondonLocal(instant: Date): string {
  const w = londonWallClock(instant);
  return `${w.day}T${pad(w.hour)}:${pad(w.minute)}`;
}

/* Easter Sunday (Gregorian), anonymous algorithm. */
export function easterSunday(year: number): DayKey {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return key(year, month, day);
}

function firstMonday(year: number, month: number): DayKey {
  let day = key(year, month, 1);
  while (weekday(day) !== 1) day = addDays(day, 1);
  return day;
}

function lastMonday(year: number, month: number): DayKey {
  const last = new Date(Date.UTC(year, month, 0)); // day 0 of the next month
  let day = key(year, month, last.getUTCDate());
  while (weekday(day) !== 1) day = addDays(day, -1);
  return day;
}

/*
  Bank holidays that were moved or added by proclamation. The rules below
  cover the usual pattern; add one-off dates here when they are announced
  (GOV.UK lists them at gov.uk/bank-holidays).
*/
const movedHolidays: Record<number, { remove: DayKey[]; add: DayKey[] }> = {
  2020: { remove: ["2020-05-04"], add: ["2020-05-08"] },
  2022: { remove: ["2022-05-30"], add: ["2022-06-02", "2022-06-03", "2022-09-19"] },
  2023: { remove: [], add: ["2023-05-08"] },
};

/* Bank holidays in England and Wales for a year (Good Friday and Christmas Day are not among them in law, but are handled below). */
export function englandAndWalesBankHolidays(year: number): Set<DayKey> {
  const days = new Set<DayKey>();

  // New Year's Day, or the next Monday if it falls at a weekend.
  let newYear = key(year, 1, 1);
  while (weekday(newYear) === 0 || weekday(newYear) === 6) newYear = addDays(newYear, 1);
  days.add(newYear);

  days.add(addDays(easterSunday(year), 1)); // Easter Monday
  days.add(firstMonday(year, 5)); // Early May
  days.add(lastMonday(year, 5)); // Spring
  days.add(lastMonday(year, 8)); // Summer

  // Boxing Day, with substitutes when Christmas or Boxing Day fall at a weekend.
  const christmas = key(year, 12, 25);
  const cw = weekday(christmas);
  if (cw === 5) {
    days.add(key(year, 12, 28)); // Boxing Day on Saturday, substitute Monday
  } else if (cw === 6) {
    days.add(key(year, 12, 27)); // Christmas substitute
    days.add(key(year, 12, 28)); // Boxing Day substitute
  } else if (cw === 0) {
    days.add(key(year, 12, 26)); // Boxing Day on Monday
    days.add(key(year, 12, 27)); // Christmas substitute
  } else {
    days.add(key(year, 12, 26));
  }

  const moved = movedHolidays[year];
  if (moved) {
    for (const d of moved.remove) days.delete(d);
    for (const d of moved.add) days.add(d);
  }
  return days;
}

/* Whether a UK calendar day is disregarded when counting the operator's 48 hours (reg 1(3)). */
export function isDisregardedDay(day: DayKey): boolean {
  const w = weekday(day);
  if (w === 0 || w === 6) return true;
  const year = Number(day.slice(0, 4));
  if (day === addDays(easterSunday(year), -2)) return true; // Good Friday
  if (day.endsWith("-12-25")) return true; // Christmas Day
  return englandAndWalesBankHolidays(year).has(day);
}

/*
  The end of "within N hours of" a point in time, counting only time on days
  that are not disregarded. Day boundaries are UK midnights, so a working day
  is 24 real hours even when the clocks change (the changes fall on Sundays,
  which are disregarded anyway).
*/
export function addRegulationHours(start: Date, hours = 48): Date {
  let remaining = hours * HOUR;
  let t = start.getTime();
  for (let guard = 0; guard < 400; guard++) {
    const day = londonDay(new Date(t));
    const dayEnd = londonMidnight(addDays(day, 1)).getTime();
    if (!isDisregardedDay(day)) {
      const available = dayEnd - t;
      if (remaining <= available) return new Date(t + remaining);
      remaining -= available;
    }
    t = dayEnd;
  }
  throw new Error("addRegulationHours did not finish");
}

/*
  The date the poster must reply by (Schedule para 2(b)(ii)): midnight at the
  end of the 5th day after the day the notification is sent. Returned as the
  instant of that midnight, which is the start of the 6th day.
*/
export function posterDeadline(notifiedAt: Date): Date {
  return londonMidnight(addDays(londonDay(notifiedAt), 6));
}

/* The UK calendar day a poster's deadline is expressed as ("midnight at the end of ..."). */
export function posterDeadlineDay(notifiedAt: Date): DayKey {
  return addDays(londonDay(notifiedAt), 5);
}

const longFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/* "Tuesday 27 October 2026" for a calendar day. */
export function formatDay(day: DayKey): string {
  return longFormat.format(new Date(londonMidnight(day).getTime() + 12 * HOUR)).replace(",", "");
}

/*
  A deadline in UK time. An exact midnight is written as "midnight at the end
  of" the day before, which is how the regulations put it and avoids the
  "00:00 on which day" confusion.
*/
export function formatLondon(instant: Date): string {
  const w = londonWallClock(instant);
  if (w.hour === 0 && w.minute === 0) return `midnight at the end of ${formatDay(addDays(w.day, -1))}`;
  return `${timeFormat.format(instant)} on ${formatDay(w.day)}`;
}

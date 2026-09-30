/*
  Christmas last posting dates (/tools/postage/christmas-last-posting-dates):
  the pure parts. Reading and checking content/christmas-posting.json, finding
  the next cut-off, the countdown maths and turning each known date into a
  reseller calendar event. No server imports, so the client countdown and the
  unit tests can use it.

  The page lives at one permanent URL and is refreshed each year by editing the
  data file: change `year`, `checked` and every date. A date is only filled in
  when the carrier has published it on its own website or in its own press
  release; until then it is null and the page says "Not announced yet".

  A last posting date is a UK calendar day (YYYY-MM-DD). The cut-off is taken
  as the end of that day in the UK (midnight Europe/London), whatever time zone
  the visitor's device is set to.
*/

import { isYmd, parseYmd, type CalendarEvent } from "@/lib/tools/calendar-dates";

export const CHRISTMAS_POSTING_PATH = "/tools/postage/christmas-last-posting-dates";

/* Page copy that depends on the year in the data file, so nothing needs editing but the data each year. */
export function christmasPostingPage(data: Pick<ChristmasPostingData, "year" | "carriers">) {
  const names = data.carriers.map((c) => c.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "UK carriers");
  return {
    path: CHRISTMAS_POSTING_PATH,
    /* Under 60 characters, used as an absolute title so the site name is not added. */
    title: `Christmas last posting dates ${data.year} UK: every carrier`,
    h1: `Christmas last posting dates ${data.year}`,
    description: `Last recommended posting dates for Christmas ${data.year} in the UK from ${list}, taken from each carrier's own website, with a countdown to the next cut-off.`,
    intro: `The last day to send a parcel with each UK carrier so it should arrive before Christmas ${data.year}. Every date comes from the carrier's own website, and dates not announced yet say so.`,
  };
}

export type PostingService = {
  id: string;
  name: string;
  /* Last recommended posting date, or null until the carrier announces it. */
  date: string | null;
  /* The carrier's own page for this date. */
  source: string;
  note?: string;
  /* The same service's date last Christmas, from the carrier's own page, shown for guidance only. */
  lastYear?: { date: string; source: string; note?: string };
};

export type PostingCarrier = {
  id: string;
  name: string;
  /* The carrier's own Christmas or key dates page, linked when a date is not out yet. */
  page: string;
  note?: string;
  services: PostingService[];
};

export type PlatformNote = { id: string; name: string; note: string; source: string };

export type ChristmasPostingData = {
  year: number;
  /* When the dates were last checked against the carriers' own pages. */
  checked: string;
  /* The year the lastYear dates belong to, or 0 when none are given. */
  lastYear: number;
  carriers: PostingCarrier[];
  platforms: PlatformNote[];
  tips: string[];
};

const HTTPS = /^https:\/\/[^\s]+$/;

/*
  Keeps only well-formed entries, so a bad edit cannot show an unsourced date:
  a date that is not a real YYYY-MM-DD, or has no https source, becomes null.
*/
export function readPostingData(raw: unknown): ChristmasPostingData {
  const r = (raw ?? {}) as Partial<Record<keyof ChristmasPostingData, unknown>>;
  const year = typeof r.year === "number" && Number.isInteger(r.year) ? r.year : 0;
  const checked = isYmd(r.checked) ? r.checked : "";
  const carriers: PostingCarrier[] = [];
  for (const c of Array.isArray(r.carriers) ? r.carriers : []) {
    const carrier = c as Partial<PostingCarrier>;
    if (typeof carrier.id !== "string" || typeof carrier.name !== "string" || typeof carrier.page !== "string" || !HTTPS.test(carrier.page)) continue;
    const services: PostingService[] = [];
    for (const s of Array.isArray(carrier.services) ? carrier.services : []) {
      const service = s as Partial<PostingService>;
      if (typeof service.id !== "string" || typeof service.name !== "string") continue;
      const source = typeof service.source === "string" && HTTPS.test(service.source) ? service.source : carrier.page;
      const sourced = typeof service.source === "string" && HTTPS.test(service.source);
      const date = sourced && isYmd(service.date) ? service.date : null;
      const ly = service.lastYear as Partial<NonNullable<PostingService["lastYear"]>> | undefined;
      const lastYear =
        ly && isYmd(ly.date) && typeof ly.source === "string" && HTTPS.test(ly.source)
          ? { date: ly.date, source: ly.source, ...(ly.note ? { note: String(ly.note) } : {}) }
          : undefined;
      services.push({ id: service.id, name: service.name, date, source, ...(service.note ? { note: String(service.note) } : {}), ...(lastYear ? { lastYear } : {}) });
    }
    carriers.push({ id: carrier.id, name: carrier.name, page: carrier.page, ...(carrier.note ? { note: String(carrier.note) } : {}), services });
  }
  const platforms: PlatformNote[] = [];
  for (const p of Array.isArray(r.platforms) ? r.platforms : []) {
    const platform = p as Partial<PlatformNote>;
    if (typeof platform.id !== "string" || typeof platform.name !== "string" || typeof platform.note !== "string") continue;
    if (typeof platform.source !== "string" || !HTTPS.test(platform.source)) continue;
    platforms.push({ id: platform.id, name: platform.name, note: platform.note, source: platform.source });
  }
  const tips = (Array.isArray(r.tips) ? r.tips : []).filter((t): t is string => typeof t === "string" && t.trim() !== "");
  const lastYear = typeof r.lastYear === "number" && Number.isInteger(r.lastYear) && r.lastYear < year ? r.lastYear : 0;
  if (!lastYear) for (const c of carriers) for (const s of c.services) delete s.lastYear;
  return { year, checked, lastYear, carriers, platforms, tips };
}

/* Tips still waiting to be written are not shown on the public page. */
export function isPlaceholder(text: string): boolean {
  return /\[TOM:/.test(text);
}

export function publishedTips(data: Pick<ChristmasPostingData, "tips">): string[] {
  return data.tips.filter((t) => !isPlaceholder(t));
}

/* ---------- Time in Europe/London ---------- */

const londonParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function partsOf(instant: Date) {
  const out: Record<string, number> = {};
  for (const p of londonParts.formatToParts(instant)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}

/* The UK calendar day at an instant, as YYYY-MM-DD. */
export function londonYmd(instant: Date): string {
  const p = partsOf(instant);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/* Minutes Europe/London is ahead of UTC at an instant: 0 in winter (GMT), 60 in summer (BST). */
export function londonOffsetMinutes(instant: Date): number {
  const p = partsOf(instant);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60_000);
}

/* The instant a UK day ends: midnight at the start of the next day, UK time. */
export function endOfLondonDay(ymd: string): Date {
  const next = parseYmd(ymd).getTime() + 86_400_000;
  // Midnight UK time is never inside a clock change (they happen at 1am and 2am), so one correction is enough.
  const guess = new Date(next);
  return new Date(next - londonOffsetMinutes(guess) * 60_000);
}

/* ---------- Next cut-off and countdown ---------- */

export type CutOff = { date: string; services: { carrier: string; service: string }[] };

/* Every known date, earliest first, with the services that share it. */
export function cutOffs(data: Pick<ChristmasPostingData, "carriers">): CutOff[] {
  const byDate = new Map<string, CutOff>();
  for (const c of data.carriers) {
    for (const s of c.services) {
      if (!s.date) continue;
      const entry = byDate.get(s.date) ?? { date: s.date, services: [] };
      entry.services.push({ carrier: c.name, service: s.name });
      byDate.set(s.date, entry);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export type NextCutOff =
  /* No carrier has published a date yet. */
  | { kind: "none" }
  /* Every published date has passed. */
  | { kind: "passed"; last: string }
  | { kind: "upcoming"; cutOff: CutOff; msLeft: number };

/* The next cut-off still open at `now`: a date stays open until the end of that day in the UK. */
export function nextCutOff(all: CutOff[], now: Date): NextCutOff {
  if (all.length === 0) return { kind: "none" };
  for (const c of all) {
    const msLeft = endOfLondonDay(c.date).getTime() - now.getTime();
    if (msLeft > 0) return { kind: "upcoming", cutOff: c, msLeft };
  }
  return { kind: "passed", last: all[all.length - 1].date };
}

export type Remaining = { days: number; hours: number; minutes: number };

/* Whole days, hours and minutes left, rounded up to the next minute so the last minute never shows as 0. */
export function splitRemaining(ms: number): Remaining {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60_000));
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function formatRemaining(r: Remaining): string {
  if (r.days > 0) return `${plural(r.days, "day")}, ${plural(r.hours, "hour")}`;
  if (r.hours > 0) return `${plural(r.hours, "hour")}, ${plural(r.minutes, "minute")}`;
  return plural(r.minutes, "minute");
}

/* "Royal Mail 2nd Class", or "Royal Mail 2nd Class and Evri Standard", or "Royal Mail 2nd Class and 2 more". */
export function describeServices(services: CutOff["services"], max = 2): string {
  const names = services.map((s) => `${s.carrier} ${s.service}`);
  if (names.length <= max) return names.join(" and ");
  return `${names.slice(0, max - 1).join(", ")} and ${names.length - (max - 1)} more`;
}

export function formatPostingDate(ymd: string, withWeekday = true): string {
  return parseYmd(ymd).toLocaleDateString("en-GB", { ...(withWeekday ? { weekday: "long" as const } : {}), day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/* ---------- Reseller calendar ---------- */

/* One calendar event for each known date. Services not announced yet are left out. */
export function postingEvents(data: ChristmasPostingData): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const c of data.carriers) {
    for (const s of c.services) {
      if (!s.date) continue;
      out.push({
        id: `christmas-posting-${data.year}-${c.id}-${s.id}`,
        date: s.date,
        title: `Last posting for Christmas: ${c.name} ${s.name}`,
        category: "postage",
        detail: `${c.name}'s last recommended posting date for ${s.name} to arrive before Christmas ${data.year}.${s.note ? ` ${s.note}` : ""}`,
        url: CHRISTMAS_POSTING_PATH,
        linkLabel: "All Christmas posting dates",
        ...(data.checked ? { checked: data.checked } : {}),
      });
    }
  }
  return out;
}

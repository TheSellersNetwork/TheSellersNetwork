/*
  iCalendar (RFC 5545) output for the reseller calendar. All-day events only:
  DTSTART and DTEND are DATE values and DTEND is the day after the last day,
  as the standard requires. Text is escaped (section 3.3.11) and lines are
  folded at 75 octets (section 3.1), with CRLF line endings throughout.
*/

import { addDays, categoryLabel, type CalendarEvent } from "@/lib/tools/calendar-dates";

/* Backslash, semicolon and comma are escaped; line breaks become \n. */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/* Splits a content line into pieces of at most 75 octets, never inside a UTF-8 character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    // Continuation lines start with a space, which counts towards their 75.
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

/* 2026-11-06 to 20261106. */
export function icsDate(ymd: string): string {
  return ymd.replace(/-/g, "");
}

/* UTC date-time, for DTSTAMP. */
export function icsDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export type IcsOptions = {
  name: string;
  description?: string;
  /* Site origin, used for UIDs and to make site links absolute. */
  siteUrl: string;
  now: Date;
};

export function buildIcs(events: CalendarEvent[], options: IcsOptions): string {
  const origin = options.siteUrl.replace(/\/$/, "");
  const host = new URL(origin).hostname;
  const stamp = icsDateTime(options.now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Sellers Network//Reseller calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(options.name)}`,
    ...(options.description ? [`X-WR-CALDESC:${escapeText(options.description)}`] : []),
    "X-WR-TIMEZONE:Europe/London",
    "REFRESH-INTERVAL;VALUE=DURATION:PT12H",
    "X-PUBLISHED-TTL:PT12H",
  ];

  for (const e of events) {
    const url = e.url ? (e.url.startsWith("/") ? `${origin}${e.url}` : e.url) : null;
    const description = [e.detail, e.note, url ? `${e.url?.startsWith("/") ? "More" : "Source"}: ${url}` : null, e.checked ? `Checked ${e.checked}.` : null]
      .filter(Boolean)
      .join("\n\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(e.date)}`,
      `DTEND;VALUE=DATE:${icsDate(addDays(e.endDate ?? e.date, 1))}`,
      `SUMMARY:${escapeText(e.title)}`,
      ...(description ? [`DESCRIPTION:${escapeText(description)}`] : []),
      ...(url ? [`URL:${url}`] : []),
      `CATEGORIES:${escapeText(categoryLabel(e.category))}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

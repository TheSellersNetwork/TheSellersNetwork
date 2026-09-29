import type { CalendarEvent } from "./calendar-dates";
import { buildIcs, escapeText, foldLine, icsDate, icsDateTime } from "./ics";

const now = new Date("2026-09-29T08:05:09.123Z");
const opts = { name: "Test calendar", siteUrl: "https://example.org/", now };

describe("ics text", () => {
  it("escapes backslashes, semicolons, commas and line breaks", () => {
    expect(escapeText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });

  it("formats all-day dates and UTC timestamps", () => {
    expect(icsDate("2026-11-06")).toBe("20261106");
    expect(icsDateTime(now)).toBe("20260929T080509Z");
  });

  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Short")).toBe("SUMMARY:Short");
  });

  it("folds long lines at 75 octets with CRLF and a space", () => {
    const line = `DESCRIPTION:${"x".repeat(200)}`;
    const folded = foldLine(line);
    const parts = folded.split("\r\n");
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(" "))).toBe(true);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });

  it("never splits a multi-byte character", () => {
    const line = `SUMMARY:${"é".repeat(60)}Pokémon`;
    const parts = foldLine(line).split("\r\n");
    for (const p of parts) {
      expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75);
      expect(p).not.toContain("�");
    }
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join("")).toBe(line);
  });
});

describe("buildIcs", () => {
  const events: CalendarEvent[] = [
    {
      id: "pokemon-test",
      date: "2026-11-06",
      title: "Pokémon TCG: Delta Reign, expansion; test",
      category: "pokemon",
      detail: "Line one\nLine two",
      url: "https://www.pokemon.com/uk/news",
      linkLabel: "Source",
      checked: "2026-09-29",
    },
    { id: "range", date: "2026-10-06", endDate: "2026-10-07", title: "Sale", category: "sale", url: "/blog/thing" },
  ];
  const ics = buildIcs(events, opts);
  const unfolded = ics.replace(/\r\n /g, "");

  it("wraps events in a valid calendar with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics.match(/END:VEVENT/g)).toHaveLength(2);
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it("writes all-day events with an exclusive end date", () => {
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20261106\r\nDTEND;VALUE=DATE:20261107");
    expect(unfolded).toContain("DTSTART;VALUE=DATE:20261006\r\nDTEND;VALUE=DATE:20261008");
  });

  it("uses stable UIDs and a UTC DTSTAMP", () => {
    expect(unfolded).toContain("UID:pokemon-test@example.org");
    expect(unfolded).toContain("UID:range@example.org");
    expect(unfolded).toContain("DTSTAMP:20260929T080509Z");
  });

  it("escapes text and makes site links absolute", () => {
    expect(unfolded).toContain("SUMMARY:Pokémon TCG: Delta Reign\\, expansion\\; test");
    expect(unfolded).toContain("DESCRIPTION:Line one\\nLine two\\n\\nSource: https://www.pokemon.com/uk/news\\n\\nChecked 2026-09-29.");
    expect(unfolded).toContain("URL:https://example.org/blog/thing");
    expect(unfolded).toContain("CATEGORIES:Pokémon");
  });
});

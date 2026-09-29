import calendarData from "../../../content/calendar.json";
import bankHolidayFallback from "../../../content/bank-holidays.json";
import {
  addDays,
  bankHolidayEvents,
  blackFriday,
  boxingDay,
  changeEvents,
  countdown,
  cyberMonday,
  entryEvents,
  eventsFrom,
  filterCategories,
  groupByMonth,
  mergeEvents,
  parseCategories,
  ruleBasedSales,
  taxEvents,
  thanksgiving,
  type CalendarEvent,
} from "./calendar-dates";
import type { ChangeMeta } from "./changes";
import { upcomingTaxDates } from "./tax";

describe("rule-based sale dates", () => {
  it("puts Thanksgiving on the fourth Thursday of November", () => {
    expect(thanksgiving(2024)).toBe("2024-11-28");
    expect(thanksgiving(2025)).toBe("2025-11-27");
    expect(thanksgiving(2026)).toBe("2026-11-26");
  });

  it.each([
    [2019, "2019-11-29"],
    [2020, "2020-11-27"],
    [2023, "2023-11-24"],
    [2024, "2024-11-29"],
    [2025, "2025-11-28"],
    [2026, "2026-11-27"],
    [2027, "2027-11-26"],
    [2028, "2028-11-24"],
    [2029, "2029-11-23"],
  ])("puts Black Friday %i on %s", (year, expected) => {
    expect(blackFriday(year)).toBe(expected);
    expect(new Date(`${expected}T00:00:00Z`).getUTCDay()).toBe(5);
  });

  it("handles a November that starts on a Thursday", () => {
    // 1 November 2029 is a Thursday, so the fourth Thursday is the 22nd.
    expect(thanksgiving(2029)).toBe("2029-11-22");
  });

  it("puts Cyber Monday three days after Black Friday, across a month end", () => {
    expect(cyberMonday(2026)).toBe("2026-11-30");
    expect(cyberMonday(2024)).toBe("2024-12-02");
    expect(new Date(`${cyberMonday(2027)}T00:00:00Z`).getUTCDay()).toBe(1);
  });

  it("keeps Boxing Day on 26 December whatever the weekday", () => {
    expect(boxingDay(2026)).toBe("2026-12-26");
    expect(boxingDay(2027)).toBe("2027-12-26");
  });

  it("gives each rule-based event a stable id", () => {
    const ids = ruleBasedSales([2026, 2027]).map((e) => e.id);
    expect(ids).toContain("black-friday-2026");
    expect(ids).toContain("boxing-day-sales-2027");
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
  });
});

describe("researched entries", () => {
  it("keeps every entry in content/calendar.json, all with https sources and checked dates", () => {
    const events = entryEvents(calendarData.entries);
    expect(events).toHaveLength(calendarData.entries.length);
    for (const e of events) {
      expect(e.url).toMatch(/^https:\/\//);
      expect(e.checked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("drops entries without an official https source, a real date or a known category", () => {
    const good = { id: "a", date: "2026-11-06", title: "A", category: "pokemon", region: "UK", source: "https://example.com/a", checked: "2026-09-29" };
    const events = entryEvents([
      good,
      { ...good, id: "b", source: "http://example.com" },
      { ...good, id: "c", source: "" },
      { ...good, id: "d", date: "2026-02-30" },
      { ...good, id: "e", category: "rumour" },
      { ...good, id: "f", checked: undefined },
      { ...good, id: "g", endDate: "2026-11-01" },
    ]);
    expect(events.map((e) => e.id)).toEqual(["a"]);
  });
});

describe("bank holidays", () => {
  it("reads the live GOV.UK shape and names nations for holidays that are not UK-wide", () => {
    const events = bankHolidayEvents({
      "england-and-wales": { events: [{ title: "Christmas Day", date: "2026-12-25", notes: "" }, { title: "Boxing Day", date: "2026-12-28", notes: "Substitute day" }] },
      scotland: { events: [{ title: "Christmas Day", date: "2026-12-25", notes: "" }, { title: "St Andrew’s Day", date: "2026-11-30", notes: "" }] },
      "northern-ireland": { events: [{ title: "Christmas Day", date: "2026-12-25", notes: "" }] },
    });
    const byDate = Object.fromEntries(events.map((e) => [e.date, e.title]));
    expect(byDate["2026-12-25"]).toBe("Christmas Day bank holiday");
    expect(byDate["2026-11-30"]).toBe("St Andrew’s Day bank holiday (Scotland)");
    expect(byDate["2026-12-28"]).toBe("Boxing Day bank holiday, substitute day (England and Wales)");
  });

  it("reads the stored fallback", () => {
    const events = bankHolidayEvents(bankHolidayFallback.divisions);
    expect(events.length).toBeGreaterThan(10);
    expect(events.every((e) => e.category === "other" && e.url === "https://www.gov.uk/bank-holidays")).toBe(true);
  });
});

describe("merging and sorting", () => {
  const change: ChangeMeta = {
    slug: "ebay-test-change",
    title: "Test change",
    platform: "ebay",
    date: "2026-10-15",
    announced: null,
    status: "coming",
    impact: "medium",
    affects: [],
    summary: "Summary.",
    source: "",
    sources: [],
    forum: "deals",
    guides: [],
    questions: [],
    discussion: null,
    author: "x",
  };

  it("links changes to their site page", () => {
    const [e] = changeEvents([change]);
    expect(e).toMatchObject({ id: "change-ebay-test-change", date: "2026-10-15", category: "changes", url: "/blog/ebay-test-change", title: "eBay: Test change" });
  });

  it("turns tax dates into calendar days", () => {
    const events = taxEvents(upcomingTaxDates(new Date("2026-09-29T00:00:00Z"), 3));
    expect(events[0]).toMatchObject({ date: "2026-10-05", category: "tax", title: "Register for Self Assessment" });
  });

  it("sorts by date, then category order, then title, and drops duplicate ids", () => {
    const a: CalendarEvent = { id: "x", date: "2026-11-27", title: "Zed", category: "sale" };
    const b: CalendarEvent = { id: "y", date: "2026-11-27", title: "Alpha", category: "tax" };
    const c: CalendarEvent = { id: "z", date: "2026-10-01", title: "First", category: "lego" };
    const d: CalendarEvent = { id: "w", date: "2026-11-27", title: "Pika", category: "pokemon" };
    const dup: CalendarEvent = { ...a, title: "Duplicate" };
    const merged = mergeEvents([a, b], [c, d, dup]);
    expect(merged.map((e) => e.id)).toEqual(["z", "w", "x", "y"]);
    expect(merged.find((e) => e.id === "x")?.title).toBe("Zed");
  });

  it("filters to upcoming, or the past 60 days, keeping events still running", () => {
    const events: CalendarEvent[] = [
      { id: "old", date: "2026-07-01", title: "Old", category: "other" },
      { id: "recent", date: "2026-09-01", title: "Recent", category: "other" },
      { id: "running", date: "2026-09-28", endDate: "2026-09-30", title: "Running", category: "sale" },
      { id: "next", date: "2026-10-06", title: "Next", category: "sale" },
    ];
    expect(eventsFrom(events, "2026-09-29").map((e) => e.id)).toEqual(["running", "next"]);
    expect(eventsFrom(events, "2026-09-29", 60).map((e) => e.id)).toEqual(["recent", "running", "next"]);
  });

  it("parses and applies category filters", () => {
    expect(parseCategories("pokemon, TAX,nonsense,tax")).toEqual(["pokemon", "tax"]);
    expect(parseCategories(null)).toEqual([]);
    const events: CalendarEvent[] = [
      { id: "1", date: "2026-10-01", title: "P", category: "pokemon" },
      { id: "2", date: "2026-10-02", title: "L", category: "lego" },
    ];
    expect(filterCategories(events, ["lego"]).map((e) => e.id)).toEqual(["2"]);
    expect(filterCategories(events, [])).toHaveLength(2);
  });

  it("groups by month in order", () => {
    const groups = groupByMonth([
      { id: "1", date: "2026-10-01", title: "A", category: "lego" },
      { id: "2", date: "2026-10-20", title: "B", category: "lego" },
      { id: "3", date: "2027-01-31", title: "C", category: "tax" },
    ]);
    expect(groups.map((g) => [g.label, g.events.length])).toEqual([
      ["October 2026", 2],
      ["January 2027", 1],
    ]);
  });

  it("writes the countdown in plain words", () => {
    expect(countdown({ date: "2026-10-11" }, "2026-09-29")).toBe("In 12 days");
    expect(countdown({ date: "2026-09-30" }, "2026-09-29")).toBe("Tomorrow");
    expect(countdown({ date: "2026-09-29" }, "2026-09-29")).toBe("Today");
    expect(countdown({ date: "2026-09-28" }, "2026-09-29")).toBe("Yesterday");
    expect(countdown({ date: "2026-09-01" }, "2026-09-29")).toBe("28 days ago");
    expect(countdown({ date: "2026-10-06", endDate: "2026-10-07" }, "2026-10-06")).toBe("On now, ends in 1 day");
    expect(countdown({ date: "2026-10-06", endDate: "2026-10-07" }, "2026-10-07")).toBe("On now, last day");
  });
});

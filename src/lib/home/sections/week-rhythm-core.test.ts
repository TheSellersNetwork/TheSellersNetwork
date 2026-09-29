import { describe, expect, test } from "vitest";
import { buildWeek, matchThreads, threadFilter, ukWeek, weekStartInstant } from "@/lib/home/sections/week-rhythm-core";

const starters = [
  { title: "First question, with a comma?", forum: "sourcing-and-stock", body: "" },
  { title: "Second question", forum: "sourcing-and-stock", body: "" },
  { title: "Third question", forum: "sourcing-and-stock", body: "" },
];

// Wednesday 30 September 2026, mid-morning UK time.
const now = new Date("2026-09-30T09:00:00Z");

describe("week rhythm", () => {
  test("the UK week runs Monday to Sunday", () => {
    expect(ukWeek(now)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    // Sunday late evening in the UK is still that week.
    expect(ukWeek(new Date("2026-10-04T22:30:00Z"))[0]).toBe("2026-09-28");
    // Sunday 23:30 UTC in summer is already Monday in the UK.
    expect(ukWeek(new Date("2026-09-27T23:30:00Z"))[0]).toBe("2026-09-28");
  });

  test("each day has its ritual and today is marked", () => {
    const week = buildWeek(now, starters);
    expect(week.map((d) => d.when)).toEqual(["past", "past", "today", "future", "future", "future", "future"]);
    expect(week.map((d) => d.theme)).toEqual(["Numbers and goals", "Discussion starter", "What would you pay?", "Discussion starter", "Friday wins", "Weekend pickups", "Rest day"]);
    expect(week[0].items.map((i) => i.ritualId)).toEqual(["numbers", "goals"]);
    expect(week[6].items).toEqual([]);
    // 1 October: the Thursday starter and the monthly results.
    expect(week[3].items.map((i) => i.ritualId)).toEqual(["starter-thu", "monthly"]);
    expect(week[1].items[0].match.kind).toBe("exact");
    expect(week[0].short).toBe("Mon");
  });

  test("the thread filter quotes titles and uses prefixes", () => {
    const filter = threadFilter(buildWeek(now, starters))!;
    expect(filter).toContain('title.ilike."What did you sell this week?%"');
    expect(filter).toContain('title.ilike."Goals for the week:%"');
    expect(filter).toMatch(/title\.eq\."[^"]+"/);
    expect(filter).not.toContain('title.ilike."%"');
  });

  test("week start covers BST", () => {
    expect(weekStartInstant(buildWeek(now, starters))).toBe("2026-09-27T22:00:00.000Z");
  });

  test("matches posted threads to their day, never last week's", () => {
    const week = buildWeek(now, starters);
    const tue = week[1].items[0].title;
    const threads = [
      { title: "What did you sell this week? Week of 21 September", created_at: "2026-09-21T06:00:00Z", slug: "old", short_id: "a", reply_count: 9 },
      { title: "What did you sell this week? Week of 28 September", created_at: "2026-09-28T06:00:00Z", slug: "numbers", short_id: "b", reply_count: 3 },
      { title: tue, created_at: "2026-09-29T06:00:00Z", slug: "starter", short_id: "c", reply_count: 0 },
      { title: "What would you pay? Week of 30 September", created_at: "2026-09-30T06:00:00Z", slug: "wwyp", short_id: "d", reply_count: 1 },
    ];
    const matched = matchThreads(week, threads);
    expect(matched.get(week[0].items[0].key)?.slug).toBe("numbers");
    expect(matched.has(week[0].items[1].key)).toBe(false);
    expect(matched.get(week[1].items[0].key)?.slug).toBe("starter");
    expect(matched.get(week[2].items[0].key)?.slug).toBe("wwyp");
    expect([...matched.values()].some((t) => t.slug === "old")).toBe(false);
  });
});

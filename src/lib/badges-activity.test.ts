import { describe, expect, test } from "vitest";
import { activityLevel, activitySince, buildActivity, describeCounts, mondayOf, ukDayKey } from "@/lib/badges-activity";

// Tuesday 29 September 2026, 10am UK time.
const now = new Date("2026-09-29T09:00:00Z");

describe("activity calendar", () => {
  test("UK days and Monday weeks", () => {
    expect(ukDayKey("2026-09-28T23:30:00Z")).toBe("2026-09-29"); // BST: already Tuesday in the UK
    expect(mondayOf("2026-09-29")).toBe("2026-09-28");
    expect(mondayOf("2026-09-27")).toBe("2026-09-21");
  });

  test("builds the requested number of weeks ending this week, with future days marked", () => {
    const a = buildActivity([], now, 26);
    expect(a.weeks).toHaveLength(26);
    expect(a.weeks.at(-1)!.start).toBe("2026-09-28");
    expect(a.weeks[0].start).toBe("2026-04-06");
    expect(a.weeks.at(-1)!.days.map((d) => d.future)).toEqual([false, false, true, true, true, true, true]);
    expect(a.total).toBe(0);
    expect(a.activeWeeks).toBe(0);
  });

  test("counts topics, replies and pickups per day and per week, ignoring rows outside the grid", () => {
    const a = buildActivity(
      [
        { at: "2026-09-28T09:00:00Z", kind: "post" },
        { at: "2026-09-28T10:00:00Z", kind: "post" },
        { at: "2026-09-29T08:00:00Z", kind: "topic" },
        { at: "2026-09-22T08:00:00Z", kind: "pickup" },
        { at: "2025-01-01T08:00:00Z", kind: "pickup" },
        { at: "2026-10-01T08:00:00Z", kind: "post" },
      ],
      now,
      52,
    );
    const last = a.weeks.at(-1)!;
    expect(last.days[0]).toMatchObject({ date: "2026-09-28", posts: 2, total: 2 });
    expect(last).toMatchObject({ posts: 2, topics: 1, pickups: 0, total: 3 });
    expect(a.weeks.at(-2)!.pickups).toBe(1);
    expect(a.total).toBe(4);
    expect(a.max).toBe(2);
    expect(a.activeWeeks).toBe(2);
  });

  test("fetch window starts before the first Monday", () => {
    expect(activitySince(now, 26)).toBe("2026-04-05T00:00:00Z");
  });

  test("shade levels scale to the busiest day", () => {
    expect(activityLevel(0, 10)).toBe(0);
    expect(activityLevel(1, 10)).toBe(1);
    expect(activityLevel(5, 10)).toBe(2);
    expect(activityLevel(10, 10)).toBe(4);
    expect(activityLevel(1, 1)).toBe(4);
  });

  test("describes counts in plain words", () => {
    expect(describeCounts({ posts: 0, topics: 0, pickups: 0 })).toBe("No activity");
    expect(describeCounts({ posts: 2, topics: 0, pickups: 0 })).toBe("2 replies");
    expect(describeCounts({ posts: 1, topics: 1, pickups: 3 })).toBe("1 topic, 1 reply and 3 pickups");
  });
});

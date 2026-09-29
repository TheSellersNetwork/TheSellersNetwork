import { describe, expect, test } from "vitest";
import { countActivityHolders, earnedBadges, longestWeeklyStreak, pickupFacts, pickupMultiple, weekStartUTC, type BadgeFacts } from "@/lib/badges";

const none: BadgeFacts = { createdAt: "2027-06-01T10:00:00+00:00", isStaff: false, solutionCount: 0, longestStreak: 0, pickups: 0, soldPickups: 0, bestMultiple: null };
const until = "2027-03-31";

describe("earnedBadges", () => {
  test("a member who has done nothing yet has no badges", () => {
    expect(earnedBadges(none, until)).toEqual([]);
  });

  test("founding member is by join date, inclusive, and never for staff", () => {
    expect(earnedBadges({ ...none, createdAt: "2027-03-31T23:30:00+00:00" }, until)).toEqual(["founding"]);
    expect(earnedBadges({ ...none, createdAt: "2027-04-01T00:00:00+00:00" }, until)).toEqual([]);
    expect(earnedBadges({ ...none, createdAt: "2026-10-01T00:00:00+00:00", isStaff: true }, until)).toEqual(["team"]);
  });

  test("solved answers: first at one, helper at ten", () => {
    expect(earnedBadges({ ...none, solutionCount: 1 }, until)).toEqual(["first-solution"]);
    expect(earnedBadges({ ...none, solutionCount: 9 }, until)).toEqual(["first-solution"]);
    expect(earnedBadges({ ...none, solutionCount: 10 }, until)).toEqual(["first-solution", "helper"]);
  });

  test("streaks at four and twelve weeks", () => {
    expect(earnedBadges({ ...none, longestStreak: 3 }, until)).toEqual([]);
    expect(earnedBadges({ ...none, longestStreak: 4 }, until)).toEqual(["streak-4"]);
    expect(earnedBadges({ ...none, longestStreak: 12 }, until)).toEqual(["streak-4", "streak-12"]);
  });

  test("pickup badges, with sharp eye at ten times or more", () => {
    expect(earnedBadges({ ...none, pickups: 1 }, until)).toEqual(["first-pickup"]);
    expect(earnedBadges({ ...none, pickups: 2, soldPickups: 1, bestMultiple: 9.9 }, until)).toEqual(["first-pickup", "first-sold"]);
    expect(earnedBadges({ ...none, pickups: 2, soldPickups: 1, bestMultiple: 10 }, until)).toEqual(["first-pickup", "first-sold", "sharp-eye"]);
  });
});

describe("pickup multiples", () => {
  test("needs a price paid above zero and a sold price", () => {
    expect(pickupMultiple(2, 28)).toBe(14);
    expect(pickupMultiple("1.50", "15.00")).toBe(10);
    expect(pickupMultiple(0, 20)).toBeNull();
    expect(pickupMultiple(3, null)).toBeNull();
  });

  test("pickupFacts counts sold rows and the best multiple", () => {
    expect(pickupFacts([])).toEqual({ pickups: 0, soldPickups: 0, bestMultiple: null });
    expect(
      pickupFacts([
        { paid: 2, sold_price: 10 },
        { paid: 0, sold_price: 50 },
        { paid: 1, sold_price: null },
      ]),
    ).toEqual({ pickups: 3, soldPickups: 2, bestMultiple: 5 });
  });
});

describe("weekly streaks", () => {
  test("weeks start on Monday in UTC, like date_trunc in the database", () => {
    expect(weekStartUTC("2026-09-28T08:00:00Z")).toBe("2026-09-28"); // Monday
    expect(weekStartUTC("2026-10-04T23:59:00Z")).toBe("2026-09-28"); // Sunday
    expect(weekStartUTC("2026-10-05T00:00:00Z")).toBe("2026-10-05");
  });

  test("longest run of consecutive weeks, ignoring order and duplicates", () => {
    expect(longestWeeklyStreak([])).toBe(0);
    expect(longestWeeklyStreak(["2026-09-28"])).toBe(1);
    expect(longestWeeklyStreak(["2026-09-14", "2026-09-28", "2026-09-21", "2026-09-21", "2026-08-31"])).toBe(3);
    // Across a year boundary.
    expect(longestWeeklyStreak(["2026-12-21", "2026-12-28", "2027-01-04", "2027-01-11"])).toBe(4);
  });
});

describe("countActivityHolders", () => {
  test("counts members, not rows, and leaves out site accounts", () => {
    const pickups = [
      { user_id: "a", paid: 1, sold_price: 12 },
      { user_id: "a", paid: 1, sold_price: null },
      { user_id: "b", paid: 5, sold_price: 10 },
      { user_id: "c", paid: 5, sold_price: null },
      { user_id: "house", paid: 1, sold_price: 100 },
    ];
    const weeks = ["2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31"];
    const posts = [...weeks.map((w) => ({ author_id: "a", created_at: `${w}T12:00:00Z` })), { author_id: "b", created_at: "2026-08-10T12:00:00Z" }];
    expect(countActivityHolders(pickups, posts, new Set(["house"]))).toEqual({ "first-pickup": 3, "first-sold": 2, "sharp-eye": 1, "streak-4": 1, "streak-12": 0 });
  });
});

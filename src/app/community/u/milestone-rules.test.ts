import { describe, expect, test } from "vitest";
import { milestoneDate, sortMilestones, ukToday, validateMilestone } from "@/app/community/u/milestone-rules";

describe("profile milestones", () => {
  test("validates label and date", () => {
    expect(validateMilestone("100th sale", "2026-09-01", "2026-09-30")).toBeNull();
    expect(validateMilestone(" ", "2026-09-01", "2026-09-30")).toMatch(/Say what/);
    expect(validateMilestone("x".repeat(61), "2026-09-01", "2026-09-30")).toMatch(/at most 60/);
    expect(validateMilestone("see www.example.test", "2026-09-01", "2026-09-30")).toBe("No links please.");
    expect(validateMilestone("First sale", "", "2026-09-30")).toBe("Pick a date.");
    expect(validateMilestone("First sale", "2026-10-01", "2026-09-30")).toMatch(/already happened/);
    expect(validateMilestone("First sale", "1989-12-31", "2026-09-30")).toMatch(/after 1990/);
  });

  test("UK today and display dates", () => {
    // 11:30pm UTC on 30 September is 1 October in the UK (BST).
    expect(ukToday(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
    expect(milestoneDate("2025-03-12")).toBe("12 March 2025");
  });

  test("newest first", () => {
    const sorted = sortMilestones([
      { id: "a", label: "First sale", happened_on: "2024-01-01" },
      { id: "b", label: "100th sale", happened_on: "2025-06-01" },
    ]);
    expect(sorted.map((m) => m.id)).toEqual(["b", "a"]);
  });
});

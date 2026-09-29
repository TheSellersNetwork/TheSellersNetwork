import { describe, expect, test } from "vitest";
import starters from "../../content/templates/rituals/starters.json";
import { pickStarter, ritualDue, rituals } from "@/lib/rituals";

describe("rituals", () => {
  test("weekend pickups is due on Saturdays", () => {
    const pickups = rituals.find((r) => r.id === "pickups")!;
    expect(ritualDue(pickups, new Date("2026-10-03T07:00:00Z"))).toBe(true);
    expect(ritualDue(pickups, new Date("2026-10-04T07:00:00Z"))).toBe(false);
  });

  test("starters post on Tuesday and Thursday with different questions", () => {
    const tue = new Date("2026-09-29T07:00:00Z");
    const thu = new Date("2026-10-01T07:00:00Z");
    expect(rituals.filter((r) => r.starter && ritualDue(r, tue))).toHaveLength(1);
    expect(rituals.filter((r) => r.starter && ritualDue(r, thu))).toHaveLength(1);
    expect(pickStarter(starters, tue)?.title).not.toBe(pickStarter(starters, thu)?.title);
  });

  test("every starter goes to a real forum and follows the house style", () => {
    for (const s of starters) {
      expect(s.forum).toMatch(/^[a-z-]+$/);
      expect(`${s.title} ${s.body}`).not.toMatch(/[—!]/);
    }
  });

  test("the rotation steps through the whole list before repeating", () => {
    const seen = new Set<string>();
    const start = new Date("2026-09-29T07:00:00Z").getTime();
    for (let w = 0; w < starters.length / 2; w++) {
      seen.add(pickStarter(starters, new Date(start + w * 7 * 86_400_000))!.title);
      seen.add(pickStarter(starters, new Date(start + (w * 7 + 2) * 86_400_000))!.title);
    }
    expect(seen.size).toBe(starters.length);
  });
});

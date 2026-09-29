import { describe, expect, test } from "vitest";
import { isLive, isScheduled, publishedUkDate, ukDate } from "@/lib/content/schedule";

describe("scheduled blog posts", () => {
  test("the UK date follows British Summer Time", () => {
    // 23:30 UTC on 29 September is 00:30 on 30 September in London (BST).
    expect(ukDate(new Date("2026-09-29T23:30:00Z"))).toBe("2026-09-30");
    expect(ukDate(new Date("2026-09-29T22:59:00Z"))).toBe("2026-09-29");
    // In winter London is on GMT, so UTC midnight is the change of day.
    expect(ukDate(new Date("2026-12-01T23:30:00Z"))).toBe("2026-12-01");
    expect(ukDate(new Date("2026-12-02T00:00:00Z"))).toBe("2026-12-02");
  });

  test("a post dated tomorrow is hidden today and live from UK midnight", () => {
    const published = new Date("2026-09-30T00:00:00Z").toISOString();
    expect(isLive(published, new Date("2026-09-29T12:00:00Z"))).toBe(false);
    expect(isScheduled(published, new Date("2026-09-29T12:00:00Z"))).toBe(true);
    // Midnight in London is 23:00 UTC the day before.
    expect(isLive(published, new Date("2026-09-29T23:00:00Z"))).toBe(true);
    expect(isLive(published, new Date("2026-09-30T07:00:00Z"))).toBe(true);
    expect(isScheduled(published, new Date("2026-09-30T07:00:00Z"))).toBe(false);
  });

  test("posts dated today or earlier are live", () => {
    const now = new Date("2026-09-29T08:00:00Z");
    expect(isLive("2026-09-29", now)).toBe(true);
    expect(isLive("2026-09-29T00:00:00.000Z", now)).toBe(true);
    expect(isLive("2025-01-01", now)).toBe(true);
  });

  test("drafts and unreadable dates are never live and never scheduled", () => {
    expect(isLive(null)).toBe(false);
    expect(isLive(undefined)).toBe(false);
    expect(isLive("not a date")).toBe(false);
    expect(isScheduled(null)).toBe(false);
    expect(isScheduled("not a date")).toBe(false);
  });

  test("date-only and midnight UTC values keep their calendar date", () => {
    expect(publishedUkDate("2026-10-31")).toBe("2026-10-31");
    expect(publishedUkDate(new Date("2026-10-31T00:00:00Z"))).toBe("2026-10-31");
    // A full timestamp is read in UK time.
    expect(publishedUkDate("2026-10-31T23:30:00Z")).toBe("2026-10-31");
    expect(publishedUkDate("2026-06-30T23:30:00Z")).toBe("2026-07-01");
  });
});

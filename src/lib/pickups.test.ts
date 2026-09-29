import { describe, expect, test } from "vitest";
import { multiple, rankByMultiple, soldStampKey, ukMonthStart } from "@/lib/pickups";

describe("pickups", () => {
  test("month start follows the UK calendar", () => {
    expect(ukMonthStart(new Date("2026-09-29T12:00:00Z"))).toBe("2026-09-01");
    // After the clocks go back the UK is on GMT, so 11:30pm UTC is still 31 October.
    expect(ukMonthStart(new Date("2026-10-31T23:30:00Z"))).toBe("2026-10-01");
    // 11:30pm UTC on 30 September is 12:30am on 1 October in the UK (BST).
    expect(ukMonthStart(new Date("2026-09-30T23:30:00Z"))).toBe("2026-10-01");
  });

  test("ranks sold pickups by multiple, leaving out unsold and free finds", () => {
    const rows = [
      { id: "a", paid: 2, sold_price: 20, created_at: "2026-09-01" },
      { id: "b", paid: 1, sold_price: 14, created_at: "2026-09-02" },
      { id: "c", paid: 0, sold_price: 50, created_at: "2026-09-03" },
      { id: "d", paid: 3, sold_price: null, created_at: "2026-09-04" },
      { id: "e", paid: 4, sold_price: 40, created_at: "2026-09-05" },
    ];
    expect(rankByMultiple(rows, 5).map((r) => r.id)).toEqual(["b", "e", "a"]);
    expect(rankByMultiple(rows, 1).map((r) => r.id)).toEqual(["b"]);
  });

  test("multiple label and stamp key", () => {
    expect(multiple(1, 14)).toBe("14x");
    expect(multiple(2, 5)).toBe("2.5x");
    expect(soldStampKey({ id: "x", sold_price: 12 })).toBe("x:12");
  });
});

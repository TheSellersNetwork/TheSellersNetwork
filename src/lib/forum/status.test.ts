import { describe, expect, it } from "vitest";
import { parseStatus, statusFilter, topicStatus, withStatus, type TopicStatus } from "./status";

const t = (reply_count: number, is_solved = false, is_locked = false) => ({ reply_count, is_solved, is_locked });

/* Applies statusFilter to a row the way the database would, to prove the filter and the chip agree. */
function matches(row: ReturnType<typeof t>, status: TopicStatus): boolean {
  return statusFilter(status).every((f) => (f.op === "eq" ? row[f.column] === f.value : Number(row[f.column]) > Number(f.value)));
}

describe("topicStatus", () => {
  it("derives each status", () => {
    expect(topicStatus(t(0))).toBe("open");
    expect(topicStatus(t(3))).toBe("answered");
    expect(topicStatus(t(3, true))).toBe("solved");
    expect(topicStatus(t(3, false, true))).toBe("closed");
    expect(topicStatus(t(0, false, true))).toBe("closed");
  });

  it("shows solved even when the topic is locked", () => {
    expect(topicStatus(t(2, true, true))).toBe("solved");
  });

  it("agrees with the query filter for every combination", () => {
    for (const replies of [0, 1])
      for (const solved of [false, true])
        for (const locked of [false, true]) {
          const row = t(replies, solved, locked);
          const status = topicStatus(row);
          for (const s of ["open", "answered", "solved", "closed"] as TopicStatus[]) {
            expect(matches(row, s)).toBe(s === status);
          }
        }
  });
});

describe("parseStatus", () => {
  it("accepts known values only", () => {
    expect(parseStatus("solved")).toBe("solved");
    expect(parseStatus("SOLVED")).toBeNull();
    expect(parseStatus(["open"])).toBeNull();
    expect(parseStatus(undefined)).toBeNull();
  });
});

describe("withStatus", () => {
  it("sets, replaces and clears the status and drops the cursor", () => {
    expect(withStatus("/community/c/ebay", "open")).toBe("/community/c/ebay?status=open");
    expect(withStatus("/community?view=latest&cursor=abc&status=open", "solved")).toBe("/community?view=latest&status=solved");
    expect(withStatus("/community?view=top&status=open", null)).toBe("/community?view=top");
  });
});

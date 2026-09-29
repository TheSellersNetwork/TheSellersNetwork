import { describe, expect, it } from "vitest";
import { planFeeAlerts, sendKey } from "./fee-alerts";

const changes = [
  { slug: "ebay-fee-rise", platform: "ebay" },
  { slug: "vinted-postage", platform: "vinted" },
  { slug: "hmrc-reporting", platform: "general" },
];
const members = [
  { id: "a", platforms: ["ebay"] },
  { id: "b", platforms: ["vinted", "hmrc"] },
];

describe("planFeeAlerts", () => {
  it("marks everything as baseline on the first run and sends nothing", () => {
    const plan = planFeeAlerts({ changes, seen: [], members, sent: new Set() });
    expect(plan.newSeen.every((s) => s.status === "baseline")).toBe(true);
    expect(plan.newSeen).toHaveLength(3);
    expect(plan.deliveries).toEqual([]);
  });

  it("sends a new change to members with that platform, and general changes to everyone", () => {
    const seen = changes.slice(0, 2).map((c) => ({ slug: c.slug, status: "baseline" as const }));
    const plan = planFeeAlerts({ changes: [...changes, { slug: "ebay-new", platform: "ebay" }], seen, members, sent: new Set() });
    expect(plan.newSeen.map((s) => [s.slug, s.status])).toEqual([
      ["hmrc-reporting", "sending"],
      ["ebay-new", "sending"],
    ]);
    expect(plan.deliveries).toEqual([
      { userId: "a", slug: "hmrc-reporting" },
      { userId: "b", slug: "hmrc-reporting" },
      { userId: "a", slug: "ebay-new" },
    ]);
  });

  it("never sends the same change to a member twice", () => {
    const seen = [
      { slug: "ebay-fee-rise", status: "sending" as const },
      { slug: "vinted-postage", status: "done" as const },
      { slug: "hmrc-reporting", status: "baseline" as const },
    ];
    const plan = planFeeAlerts({ changes, seen, members: [...members, { id: "c", platforms: ["ebay"] }], sent: new Set([sendKey("a", "ebay-fee-rise")]) });
    expect(plan.newSeen).toEqual([]);
    expect(plan.deliveries).toEqual([{ userId: "c", slug: "ebay-fee-rise" }]);
    expect(plan.sending).toEqual(["ebay-fee-rise"]);
  });
});

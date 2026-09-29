import { describe, expect, test } from "vitest";
import { continuePath, coverTopic, groupByTopic, type ShelfPath } from "@/lib/home/sections/guides-shelf-core";

const path = (slug: string, n: number): ShelfPath => ({
  slug,
  title: slug,
  href: `/guides/paths/${slug}`,
  steps: Array.from({ length: n }, (_, i) => ({ key: `guide:${slug}-${i + 1}`, title: `${slug} ${i + 1}`, href: `/guides/${slug}-${i + 1}` })),
});

describe("guides shelf", () => {
  test("cover topics come from the first recognised category", () => {
    expect(coverTopic(["ebay-pricing-and-offers"])).toMatchObject({ label: "eBay", colour: "ebay" });
    expect(coverTopic(["ebay-live"])).toMatchObject({ label: "eBay Live", colour: "live" });
    expect(coverTopic(["amazon-fba-and-fbm", "sourcing-and-stock"])).toMatchObject({ label: "Amazon", colour: "amazon" });
    expect(coverTopic(["unknown", "vinted"])).toMatchObject({ label: "Vinted" });
    expect(coverTopic([])).toMatchObject({ label: "Every platform", colour: "general" });
  });

  test("groups by topic, biggest first", () => {
    const groups = groupByTopic([{ categories: ["vinted"] }, { categories: ["amazon"] }, { categories: ["amazon-ads-and-ppc"] }, { categories: ["ebay"] }], 2);
    expect(groups.map((g) => [g.topic.label, g.items.length])).toEqual([
      ["Amazon", 2],
      ["Vinted", 1],
    ]);
  });

  test("continue picks the started, unfinished path furthest through", () => {
    const paths = [path("a", 4), path("b", 7), path("c", 2)];
    expect(continuePath(paths, [])).toBeNull();
    // c is finished, a is 1 of 4, b is 3 of 7.
    const read = ["guide:c-1", "guide:c-2", "guide:a-1", "guide:b-1", "guide:b-2", "guide:b-4"];
    const state = continuePath(paths, read)!;
    expect(state.path.slug).toBe("b");
    expect(state.done).toBe(3);
    expect(state.total).toBe(7);
    // The first unread step, not the one after the last read.
    expect(state.step).toBe(3);
    expect(state.next.href).toBe("/guides/b-3");
  });
});

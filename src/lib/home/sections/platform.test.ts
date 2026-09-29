import { describe, expect, test } from "vitest";
import {
  categoryMatchesPlatform,
  filterByPlatform,
  homePlatformCookie,
  orderByPlatform,
  parseHomePlatform,
  platformCategorySlugs,
  platformsForCategories,
  startTabForPlatform,
} from "@/lib/home/sections/platform";

describe("home platform", () => {
  test("parses the cookie, falling back to all", () => {
    expect(parseHomePlatform("vinted")).toBe("vinted");
    expect(parseHomePlatform("sourcing")).toBe("sourcing");
    expect(parseHomePlatform("etsy")).toBe("all");
    expect(parseHomePlatform(undefined)).toBe("all");
    expect(parseHomePlatform("")).toBe("all");
  });

  test("cookie string lasts a year, is Lax, and all clears it", () => {
    expect(homePlatformCookie("ebay")).toBe("tsn-home-platform=ebay; Path=/; SameSite=Lax; Max-Age=31536000");
    expect(homePlatformCookie("ebay", true)).toMatch(/; Secure$/);
    expect(homePlatformCookie("all")).toContain("Max-Age=0");
  });

  test("orders the chosen platform first and keeps the rest in order", () => {
    const items = [
      { id: 1, p: ["ebay"] },
      { id: 2, p: ["vinted"] },
      { id: 3, p: [] },
      { id: 4, p: ["vinted", "ebay"] },
    ];
    expect(orderByPlatform(items, "vinted", (i) => i.p).map((i) => i.id)).toEqual([2, 4, 1, 3]);
    expect(orderByPlatform(items, "all", (i) => i.p).map((i) => i.id)).toEqual([1, 2, 3, 4]);
  });

  test("filters to the platform, or keeps everything when nothing matches", () => {
    const items = [{ p: ["ebay"] }, { p: ["amazon"] }];
    expect(filterByPlatform(items, "amazon", (i) => i.p)).toEqual([{ p: ["amazon"] }]);
    expect(filterByPlatform(items, "vinted", (i) => i.p)).toHaveLength(2);
  });

  test("maps to the Start here tabs", () => {
    expect(startTabForPlatform("all")).toBeNull();
    expect(startTabForPlatform("ebay")).toBe("ebay");
    expect(startTabForPlatform("sourcing")).toBe("sourcing");
  });

  test("forum categories include children by parent and by prefix", () => {
    const cats = [
      { id: "1", slug: "ebay", parent_id: null },
      { id: "2", slug: "ebay-pricing-and-offers", parent_id: "1" },
      { id: "3", slug: "odd-child", parent_id: "1" },
      { id: "4", slug: "vinted", parent_id: null },
      { id: "5", slug: "ebay-live", parent_id: "9" },
    ];
    expect(platformCategorySlugs("ebay", cats).sort()).toEqual(["ebay", "ebay-live", "ebay-pricing-and-offers", "odd-child"]);
    expect(platformCategorySlugs("vinted", cats)).toEqual(["vinted"]);
    expect(platformCategorySlugs("sourcing")).toContain("sourcing-and-stock");
    expect(platformCategorySlugs("all", cats)).toEqual([]);
    expect(categoryMatchesPlatform("amazon-fba-and-fbm", "amazon")).toBe(true);
    expect(categoryMatchesPlatform("amazon-fba-and-fbm", "ebay")).toBe(false);
  });

  test("works out an item's platforms from its categories and slug", () => {
    expect(platformsForCategories(["ebay-listings-and-titles", "vinted"])).toEqual(["ebay", "vinted"]);
    expect(platformsForCategories(["sourcing-and-stock"])).toEqual(["sourcing"]);
    expect(platformsForCategories(["tax-bookkeeping-and-legal"], "charity-shop-sourcing")).toEqual(["sourcing"]);
    expect(platformsForCategories(["tax-bookkeeping-and-legal"])).toEqual([]);
  });
});

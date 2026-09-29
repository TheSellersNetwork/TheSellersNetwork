import { test, expect } from "@playwright/test";

/*
  Blog and guides UI: magazine index, comparison tables, reading extras and
  beginner paths. Run against `next start` (production), so staff-only rows
  such as "Scheduled" must not appear.
*/

test.describe("blog index", () => {
  test("shows a featured post and rows by type", async ({ page }) => {
    await page.goto("/blog");
    await expect(page.getByRole("region", { name: "Featured post" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Comparisons" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Fee and policy changes" })).toBeVisible();
    await expect(page.getByTestId("scheduled-row")).toHaveCount(0);
  });

  test("type chips filter and keep older ?type= links working", async ({ page }) => {
    await page.goto("/blog?type=comparisons");
    await expect(page.getByRole("navigation", { name: "Type" }).getByRole("link", { name: /Comparisons/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 2, name: "Comparisons" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Explainers" })).toHaveCount(0);

    const articles = await page.request.get("/blog?type=articles");
    expect(articles.status()).toBe(200);
    const changes = await page.goto("/blog?type=changes&platform=ebay");
    expect(changes?.status()).toBe(200);
    await expect(page.getByRole("navigation", { name: "Platform" }).getByRole("link", { name: "eBay" })).toHaveAttribute("aria-current", "page");
  });

  test("no horizontal scroll from the chips on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout only");
    await page.goto("/blog");
    const main = await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth + 1);
    expect(main).toBe(true);
  });
});

test.describe("comparison tables", () => {
  const url = "/blog/amazon-sourcing-tools-compared";

  test("highlights the pick", async ({ page }) => {
    await page.goto(url);
    const picked = page.locator("[data-picked]");
    await expect(picked).toHaveCount(1);
    await expect(picked).toContainText("SellerAmp SAS");
    await expect(picked).toContainText("Our pick");
  });

  test("sorts by a column header on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "headers are visually hidden on phones; the sort menu is used instead");
    await page.goto(url);
    const header = page.locator("[data-table] th[role=columnheader]").filter({ hasText: "Listed price" });
    await header.getByRole("button").click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await header.getByRole("button").click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
  });

  test("rows become cards with a sort menu on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout only");
    await page.goto(url);
    const table = page.locator("[data-table]").first();
    await table.getByLabel("Sort by").selectOption({ index: 1 });
    await expect(table.locator("tbody tr").first()).toBeVisible();
    const noOverflow = await page.evaluate(() => document.querySelector("main")!.scrollWidth <= document.querySelector("main")!.clientWidth + 1);
    expect(noOverflow).toBe(true);
  });
});

test.describe("reading extras", () => {
  test("progress bar, copy link buttons and key facts on a post", async ({ page, isMobile }) => {
    await page.goto("/blog/business-bank-accounts-for-resellers-compared");
    await expect(page.locator("[data-reading-progress]")).toHaveAttribute("aria-hidden", "true");
    const copy = page.getByRole("button", { name: /^Copy link to "The short version"/ });
    await expect(copy).toHaveCount(1);
    if (isMobile) {
      await expect(page.getByTestId("key-facts")).toBeHidden();
    } else {
      await expect(page.getByTestId("key-facts")).toBeVisible();
      await expect(page.getByTestId("key-facts").locator("li").first()).toBeVisible();
    }
  });

  test("copy link puts the anchor in the address", async ({ page, context, browserName, isMobile }) => {
    test.skip(browserName !== "chromium" || isMobile, "clipboard permission is Chromium desktop only here");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/guides/measuring-clothes-for-listings");
    const heading = page.getByRole("heading", { level: 2 }).first();
    await heading.hover();
    await heading.getByRole("button").click();
    await expect(page.getByText("Link copied")).toBeVisible();
    expect(page.url()).toMatch(/#[a-z0-9-]+$/);
  });
});

test.describe("beginner paths", () => {
  test("index lists the paths and /guides links to them", async ({ page }) => {
    await page.goto("/guides");
    await page.getByRole("link", { name: "All beginner paths" }).click();
    await expect(page).toHaveURL(/\/guides\/paths$/);
    await expect(page.getByRole("heading", { level: 1, name: "Beginner paths" })).toBeVisible();
    expect(await page.locator("main li h2").count()).toBeGreaterThanOrEqual(4);
  });

  test("ticking a step updates progress and survives a reload", async ({ page }) => {
    await page.goto("/guides/paths/starting-on-vinted");
    const progress = page.getByTestId("path-progress").first();
    await expect(progress).toContainText("0 of");
    await page.getByRole("checkbox").first().check({ force: true });
    await expect(progress).toContainText("1 of");
    await page.reload();
    await expect(page.getByTestId("path-progress").first()).toContainText("1 of");
  });

  test("a guide in a path shows where it sits and ticks itself at the end", async ({ page }) => {
    await page.goto("/guides/measuring-clothes-for-listings");
    const banner = page.getByTestId("path-banner");
    await expect(banner).toContainText("Starting on Vinted");
    await expect(banner).toContainText(/step \d+ of \d+/);
    await expect(banner).toContainText("Next:");
    await page.locator("[data-article-end]").scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("tsn:paths:read") ?? "")).toContain("guide:measuring-clothes-for-listings");
  });

  test("an unknown path is a 404", async ({ request }) => {
    const res = await request.get("/guides/paths/not-a-path");
    expect(res.status()).toBe(404);
  });
});

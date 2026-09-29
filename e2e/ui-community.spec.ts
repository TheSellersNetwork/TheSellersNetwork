import { test, expect, type Page } from "@playwright/test";

/*
  Pickups wall, what sold this month, profile activity and badges. The live
  database may have no pickups yet, so each check copes with an empty state
  and never expects made-up examples.
*/

async function noSideScroll(page: Page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}

test.describe("pickups", () => {
  test("wall or empty state, with a sticky filter bar when there are pickups", async ({ page }) => {
    await page.goto("/community/pickups");
    await expect(page.getByRole("heading", { level: 1, name: "Pickups" })).toBeVisible();
    await noSideScroll(page);

    const wall = page.getByRole("list", { name: "Pickups" });
    if ((await wall.count()) === 0) {
      await expect(page.getByText("No pickups here yet.")).toBeVisible();
      return;
    }
    const bar = page.getByRole("navigation", { name: "Filter pickups by source" }).locator("xpath=..");
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");

    await page.getByRole("link", { name: "Sold only" }).click();
    await expect(page).toHaveURL(/sold=1/);
    await expect(page.getByRole("link", { name: "Sold only" })).toHaveAttribute("aria-current", "page");
    // Every tile on the sold-only wall carries a sold stamp.
    const tiles = page.getByRole("list", { name: "Pickups" }).getByRole("listitem");
    const n = await tiles.count();
    for (let i = 0; i < n; i++) await expect(tiles.nth(i).getByText(/^Sold/)).toBeVisible();
  });

  test("category and brand filters apply from the form", async ({ page }) => {
    await page.goto("/community/pickups");
    const select = page.getByLabel("Category");
    test.skip((await select.count()) === 0, "No pickups yet, so no filter bar");
    await select.selectOption("clothing");
    await expect(page).toHaveURL(/category=clothing/);
    await page.getByLabel("Brand").fill("zzzz-no-such-brand");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page).toHaveURL(/brand=zzzz-no-such-brand/);
    await expect(page.getByText("No pickups match these filters.")).toBeVisible();
  });

  for (const path of ["/community/pickups", "/community/pickups/bolo"]) {
    test(`what sold this month on ${path} is real or hidden`, async ({ page }) => {
      await page.goto(path);
      const strip = page.locator("section[aria-labelledby=sold-month-heading]");
      if ((await strip.count()) === 0) return;
      const items = strip.getByRole("listitem");
      expect(await items.count()).toBeGreaterThanOrEqual(3);
      await expect(items.first()).toContainText("Paid");
      await expect(items.first()).toContainText("Found by");
    });
  }
});

test.describe("badges", () => {
  test("every badge is explained with an honest holder count", async ({ page }) => {
    await page.goto("/community/badges");
    await expect(page.getByRole("heading", { level: 1, name: "Badges" })).toBeVisible();
    const names = ["Founding member", "First solved answer", "Helper", "4-week streak", "12-week streak", "First pickup", "First pickup sold", "Sharp eye", "Team"];
    for (const name of names) await expect(page.getByRole("heading", { level: 2, name, exact: true })).toBeVisible();
    await expect(page.getByText(/^0 members/)).toHaveCount(0);
    const counted = await page.getByText(/^(No one yet|\d+ members? holds? this)$/).count();
    expect(counted).toBe(names.length);
    await noSideScroll(page);
  });
});

test.describe("profiles", () => {
  test("activity calendar, badges and pickups sections", async ({ page }) => {
    await page.goto("/community");
    const link = page.locator('a[href^="/community/u/"]').first();
    test.skip((await link.count()) === 0, "No member links on /community");
    await page.goto((await link.getAttribute("href"))!);

    await expect(page.getByRole("heading", { level: 2, name: "Activity" })).toBeVisible();
    const grid = page.getByRole("group", { name: /Activity calendar/ });
    await expect(grid).toBeVisible();
    await grid.focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByText(/Week of \d+ \w+ \d{4}:/)).toBeVisible();

    await page.getByText("Show as a table").click();
    await expect(page.getByRole("table").or(page.getByText("No topics, replies or pickups in these weeks."))).toBeVisible();

    await expect(page.getByRole("heading", { level: 2, name: "Badges" })).toBeVisible();
    await expect(page.getByRole("link", { name: "How badges are earned" })).toHaveAttribute("href", "/community/badges");
    await expect(page.getByRole("heading", { level: 2, name: "Pickups" })).toBeVisible();
    await noSideScroll(page);
  });
});

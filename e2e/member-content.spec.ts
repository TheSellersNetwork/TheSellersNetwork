import { test, expect } from "@playwright/test";

/*
  Member content features: series navigation, guide changelogs, glossary
  pop-ups on blog posts, print styles and the related forum threads under
  guides. Runs against `next start`. Related threads depend on the database,
  so those checks only run when the section is present.
*/

test.describe("series", () => {
  test("the index lists each series with its parts in order", async ({ page }) => {
    await page.goto("/guides/series");
    await expect(page.getByRole("heading", { level: 1, name: "Series" })).toBeVisible();
    const fba = page.locator("#amazon-fba-from-zero");
    await expect(fba.getByRole("heading", { level: 2, name: "Amazon FBA from zero" })).toBeVisible();
    await expect(fba.getByRole("listitem").first()).toContainText("Amazon FBA in the UK");
  });

  test("a guide in a series shows its part and previous and next cards", async ({ page }) => {
    await page.goto("/guides/amazon-ungating-uk");
    const chip = page.getByTestId("series-chip");
    await expect(chip).toContainText(/Part \d+ of \d+ in Amazon FBA from zero/);
    const cards = page.getByTestId("series-prev-next");
    await expect(cards.locator('a[rel="prev"]')).toBeVisible();
    await expect(cards.locator('a[rel="next"]')).toBeVisible();
    await cards.locator('a[rel="next"]').click();
    await expect(page.getByTestId("series-chip")).toContainText(/Part \d+ of \d+/);
  });

  test("an article in both a series and a path gets one combined box", async ({ page }) => {
    await page.goto("/guides/how-to-start-amazon-fba-uk");
    await expect(page.getByTestId("reading-nav")).toHaveCount(1);
    const nav = page.getByTestId("reading-nav");
    await expect(nav.getByTestId("series-chip")).toContainText("Part 1 of");
    await expect(nav.getByTestId("path-banner")).toContainText("Starting Amazon FBA");
    // The first part has no previous card.
    await expect(page.getByTestId("series-prev-next").locator('a[rel="prev"]')).toHaveCount(0);
  });

  test("a blog post in a series shows the chip", async ({ page }) => {
    await page.goto("/blog/every-amazon-fee-on-one-sale");
    await expect(page.getByTestId("series-chip")).toContainText("Part 2 of");
  });
});

test.describe("guide changelog", () => {
  test("shows Updated near the title and opens What changed", async ({ page }) => {
    await page.goto("/guides/bookkeeping-and-tax-for-resellers");
    const updated = page.getByTestId("guide-updated");
    await expect(updated).toContainText("Updated 29 September 2026");
    const log = page.getByTestId("guide-changelog");
    await expect(log).not.toHaveAttribute("open");
    await log.getByText("What changed").click();
    await expect(log).toHaveAttribute("open", "");
    await expect(log).toContainText("more than 2,000 euros");
  });

  test("a guide without changes shows neither", async ({ page }) => {
    await page.goto("/guides/photos-on-a-phone");
    await expect(page.getByTestId("guide-updated")).toHaveCount(0);
    await expect(page.getByTestId("guide-changelog")).toHaveCount(0);
  });
});

test.describe("glossary", () => {
  test("blog posts mark terms and a tap shows the definition", async ({ page }) => {
    await page.goto("/blog/every-amazon-fee-on-one-sale");
    const term = page.locator("#article-body abbr.gloss").first();
    await expect(term).toBeVisible();
    // A tap before the page has hydrated does nothing, so tap again until it opens (only while shut: a tap also closes it).
    const tip = page.getByRole("tooltip");
    await expect(async () => {
      if (!(await tip.isVisible())) await term.click();
      await expect(tip).toBeVisible({ timeout: 1000 });
    }).toPass();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("tooltip")).toHaveCount(0);
  });

  test("focus shows the definition too", async ({ page }) => {
    await page.goto("/blog/every-amazon-fee-on-one-sale");
    const term = page.locator("#article-body abbr.gloss").first();
    await term.focus();
    await expect(page.getByRole("tooltip")).toBeVisible();
  });
});

test.describe("print", () => {
  test("guides and posts have a print button", async ({ page }) => {
    for (const path of ["/guides/bookkeeping-and-tax-for-resellers", "/blog/every-amazon-fee-on-one-sale"]) {
      await page.goto(path);
      await expect(page.getByTestId("print-button")).toBeVisible();
    }
  });

  test("print styles hide the site chrome and show where the page came from", async ({ page }) => {
    await page.goto("/guides/bookkeeping-and-tax-for-resellers");
    await expect(page.getByTestId("print-meta")).toBeHidden();
    await page.emulateMedia({ media: "print" });
    await expect(page.locator("body > header")).toBeHidden();
    await expect(page.locator("body > footer")).toBeHidden();
    await expect(page.getByTestId("print-button")).toBeHidden();
    await expect(page.getByTestId("reading-nav")).toBeHidden();
    await expect(page.getByTestId("print-meta")).toBeVisible();
    await expect(page.getByTestId("print-meta")).toContainText("/guides/bookkeeping-and-tax-for-resellers");
    await expect(page.getByTestId("print-meta")).toContainText("Last updated 29 September 2026");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const after = await page.locator('#article-body .prose a[href^="http"]').first().evaluate((a) => getComputedStyle(a, "::after").content);
    expect(after).toContain("http");
  });
});

test.describe("related threads", () => {
  test("lists recent threads with an Ask the forum link, or hides", async ({ page }) => {
    await page.goto("/guides/how-to-start-amazon-fba-uk");
    const section = page.getByTestId("related-threads");
    if ((await section.count()) === 0) test.skip(true, "No threads in this database");
    await expect(section.getByRole("heading", { name: "Recent questions about this" })).toBeVisible();
    const items = section.getByRole("listitem");
    expect(await items.count()).toBeGreaterThan(0);
    expect(await items.count()).toBeLessThanOrEqual(5);
    await expect(items.first()).toContainText(/\d+ repl(y|ies)/);
    await expect(section.getByRole("link", { name: "Ask the forum" })).toHaveAttribute("href", /^\/community\/new\?category=[a-z0-9-]+$/);
  });
});

import { test, expect, type Page } from "@playwright/test";

/*
  Member calculator features: compare two items, the embeddable calculator and
  its code page, and the saved calculations page gate. Needs no database: the
  save button itself only appears once migration 20260930000300 is applied.
*/

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: "http://localhost:3000" }]);
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBeLessThan(400);
  return { res, errors };
}

test.describe("chromium only", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(() => test.info().project.name !== "chromium", "desktop flows");

  test("compare two items: figures from the link, difference worked out, shareable", async ({ page }) => {
    const { errors } = await open(page, "/tools/calculator/compare?a_platform=facebook_collection&a_price=50&a_cost=10&b_platform=facebook_collection&b_price=60&b_cost=10");
    await expect(page.getByRole("heading", { name: "Compare two items", level: 1 })).toBeVisible();
    await expect(page.getByLabel("Selling price (£)").nth(1)).toHaveValue("60");
    const profit = page.getByRole("row", { name: /^Profit/ });
    await expect(profit).toContainText("£40.00");
    await expect(profit).toContainText("£50.00");
    await expect(profit).toContainText("£10.00 more on B");
    await expect(page.getByText("Item B makes £10.00 more profit.")).toBeVisible();

    await page.getByLabel("Selling price (£)").first().fill("70");
    await expect(page.getByText("Item A makes £10.00 more profit.")).toBeVisible();
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy link to this result" }).click();
    await expect(page).toHaveURL(/a_price=70/);
    await expect(page).toHaveURL(/b_platform=facebook_collection/);
    expect(errors).toEqual([]);
  });

  test("the calculator links to compare mode and the embed code page", async ({ page }) => {
    await open(page, "/tools/calculator");
    await page.getByRole("navigation", { name: "Platforms" }).getByRole("link", { name: "Two items side by side" }).click();
    await expect(page).toHaveURL(/\/tools\/calculator\/compare$/);
    await open(page, "/tools/calculator/ebay");
    await expect(page.getByRole("link", { name: "Put this calculator on your own site" })).toHaveAttribute("href", "/tools/calculator/embed");
  });

  test("platform options travel in the link", async ({ page }) => {
    await open(page, "/tools/calculator/depop?price=40&boost=1");
    await expect(page.getByLabel("Boosted listing")).toBeChecked();
    await expect(page.getByText(/Boosted listing \(/)).toBeVisible();
  });

  test("Amazon FBA opens with the figures from a link", async ({ page }) => {
    await open(page, "/tools/calculator/amazon-fba?price=22&cost=7&fee=3.1");
    await expect(page.getByLabel("Selling price (£, inc VAT)")).toHaveValue("22");
    await expect(page.getByLabel("Or type the fulfilment fee (£)")).toHaveValue("3.1");
    await expect(page.getByRole("button", { name: "Copy link to this result" })).toBeVisible();
  });

  test("embed: framable, no site chrome, no cookies set, theme from the link", async ({ page }) => {
    const { res, errors } = await open(page, "/embed/calculator?platform=vinted&theme=dark");
    const headers = res!.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors *");
    expect(headers["x-frame-options"]).toBeUndefined();
    expect(headers["set-cookie"]).toBeUndefined();
    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
    await expect(page.getByRole("heading", { name: "Vinted fee calculator" })).toBeVisible();
    await expect(page.getByRole("banner")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "Cookies" })).toHaveCount(0);
    // Vinted buyers pay postage, so there is no postage field.
    await expect(page.getByLabel("Buyer pays for postage (£)")).toHaveCount(0);
    await page.getByLabel("Selling price (£)").fill("30");
    const powered = page.getByRole("link", { name: /Powered by The Sellers Network/ });
    await expect(powered).toHaveAttribute("target", "_blank");
    await expect(powered).toHaveAttribute("href", /\/tools\/calculator\/vinted\?price=30/);
    expect(errors).toEqual([]);
  });

  test("embed: other pages stay unframeable", async ({ request }) => {
    for (const path of ["/", "/tools/calculator", "/tools/calculator/embed", "/embedded"]) {
      const res = await request.get(path);
      expect(res.headers()["x-frame-options"], path).toBe("DENY");
      expect(res.headers()["content-security-policy"], path).toContain("frame-ancestors 'none'");
    }
  });

  test("embed: a visitor can choose the platform when the link does not set one", async ({ page }) => {
    await open(page, "/embed/calculator");
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await page.getByLabel("Platform").selectOption("etsy");
    await expect(page.getByText("Fee breakdown")).toBeVisible();
  });

  test("embed code page: options change the code and the preview", async ({ page }) => {
    const { errors } = await open(page, "/tools/calculator/embed");
    const code = page.getByLabel("Code to paste into your page");
    await expect(code).toHaveValue(/\/embed\/calculator\?platform=ebay"/);
    await page.getByLabel("Platform").selectOption("depop");
    await page.getByLabel("Theme").selectOption("dark");
    await page.getByLabel("Height (pixels)").fill("520");
    await expect(code).toHaveValue(/platform=depop&theme=dark/);
    await expect(code).toHaveValue(/height="520"/);
    const preview = page.frameLocator('iframe[title^="Preview"]');
    await expect(preview.getByRole("heading", { name: "Depop fee calculator" })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("saved calculations need signing in", async ({ page }) => {
    await page.goto("/account/calculations");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Fcalculations/);
  });
});

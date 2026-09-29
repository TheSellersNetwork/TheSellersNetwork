import { test, expect, type Page } from "@playwright/test";

/*
  The stock tracker, buyer message templates, label printing tab and
  "What's it worth?" tab. Needs no database or sign-in. Any uncaught page error
  fails the test.
*/

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = test.info().project.use.baseURL ?? "http://localhost:3000";
  // Pretend analytics was already answered so the banner does not cover buttons.
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: base }]);
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBeLessThan(400);
  return errors;
}

const tab = (page: Page) => page.getByRole("tabpanel");

test("tools page lists the new tools", async ({ page }) => {
  const errors = await open(page, "/tools");
  await expect(page.getByRole("link", { name: "Stock tracker", exact: true })).toHaveAttribute("href", "/tools/stock-tracker");
  await expect(page.getByRole("link", { name: "Buyer message templates", exact: true })).toHaveAttribute("href", "/tools/buyer-messages");
  await expect(page.getByText("What's it worth? search links")).toBeVisible();
  await expect(page.getByText("Label printing settings")).toBeVisible();
  expect(errors).toEqual([]);
});

test("stock tracker: add, sell with worked-out fees, keep after reload, export", async ({ page }) => {
  const errors = await open(page, "/tools/stock-tracker");
  await expect(page.getByText("Stored only on this device")).toBeVisible();
  await page.getByRole("button", { name: "Add an item" }).click();
  await expect(page.locator("#st-sku")).toHaveValue("1001");
  await page.locator("#st-item").fill("Barbour wax jacket");
  await page.locator("#st-cost").fill("12");
  await page.getByRole("group", { name: "Listed on" }).getByText("eBay", { exact: true }).click();
  await page.locator("#st-status").selectOption("sold");
  await page.locator("#st-sold-price").fill("45");
  await page.locator("#st-postage").fill("3.20");
  await page.getByRole("button", { name: "Work out fees" }).click();
  await expect(page.locator("#st-fees")).not.toHaveValue("");
  await page.getByRole("button", { name: "Save item" }).click();
  await expect(page.getByRole("cell", { name: "Barbour wax jacket" })).toBeVisible();

  await page.getByRole("button", { name: "Add an item" }).click();
  await expect(page.locator("#st-sku")).toHaveValue("1002");
  await page.locator("#st-item").fill("Lego Galaxy Explorer");
  await page.locator("#st-cost").fill("40");
  await page.getByRole("button", { name: "Save item" }).click();

  await page.reload();
  await expect(page.getByText("Showing 2 of 2 items.")).toBeVisible();
  await expect(page.getByText("£40.00").first()).toBeVisible();

  await page.locator("#st-search").fill("lego");
  await expect(page.getByText("Showing 1 of 2 items.")).toBeVisible();

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]);
  expect(download.suggestedFilename()).toMatch(/^stock-.*\.csv$/);
  expect(errors).toEqual([]);
});

test("buyer messages: fill in and switch templates", async ({ page }) => {
  const errors = await open(page, "/tools/buyer-messages");
  await page.getByRole("button", { name: "Asked to deal off the platform" }).click();
  await expect(page.getByRole("heading", { name: "Asked to deal off the platform" })).toBeVisible();
  await page.getByLabel("Buyer's name").fill("Sam");
  await expect(page.getByTestId("bm-reply")).toContainText("Hi Sam,");
  await expect(page.getByRole("link", { name: /eBay help/ })).toBeVisible();
  await page.getByRole("button", { name: "Low offer" }).click();
  await page.getByLabel("Their offer (£)").fill("20");
  await expect(page.getByTestId("bm-reply")).toContainText("£20");
  expect(errors).toEqual([]);
});

test("postage: label printing tab", async ({ page }) => {
  const errors = await open(page, "/tools/postage?tab=labels");
  await expect(tab(page).getByText("Actual size, or 100%. Not fit to page")).toBeVisible();
  await tab(page).getByLabel("Where the label comes from").selectOption("inpost");
  await expect(tab(page).getByText(/does not need printing/)).toBeVisible();
  await expect(tab(page).getByRole("link", { name: /InPost: how to send a parcel/ })).toHaveAttribute("href", "https://inpost.co.uk/how-to-send-a-parcel");
  expect(errors).toEqual([]);
});

test("pricing: what's it worth tab builds search links", async ({ page }) => {
  const errors = await open(page, "/tools/pricing?tab=worth");
  await tab(page).getByLabel("Brand or maker").fill("Lego");
  await tab(page).getByLabel("Item", { exact: true }).fill("10497");
  await tab(page).getByLabel("Kind of item").selectOption("lego");
  const ebay = tab(page).getByRole("link", { name: /on eBay UK/ });
  await expect(ebay).toHaveAttribute("href", /LH_Sold=1&LH_Complete=1/);
  await expect(tab(page).getByText(/Vinted has no sold filter/)).toBeVisible();
  await expect(tab(page).getByRole("link", { name: /on BrickLink/ })).toBeVisible();
  await tab(page).getByRole("link", { name: "what to list at" }).click();
  await expect(page.getByRole("tab", { name: "What to list at" })).toHaveAttribute("aria-selected", "true");
  expect(errors).toEqual([]);
});

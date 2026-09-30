import { test, expect } from "@playwright/test";
import postingData from "../content/christmas-posting.json";

/*
  Christmas last posting dates (/tools/postage/christmas-last-posting-dates):
  one h1 with the year from the data file, metadata, JSON-LD that parses,
  a row for every service, the countdown box, and a link from the postage hub.
  Needs no database.
*/

const path = "/tools/postage/christmas-last-posting-dates";

test("Christmas posting page: h1, metadata, JSON-LD, table and countdown", async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: baseURL ?? "http://localhost:3000" }]);
  const res = await page.goto(path);
  expect(res?.status()).toBeLessThan(400);

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(`Christmas last posting dates ${postingData.year}`);
  const title = await page.title();
  expect(title).toContain(`Christmas last posting dates ${postingData.year} UK`);
  expect(title.length).toBeLessThan(60);
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/tools\/postage\/christmas-last-posting-dates$/);

  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const types = raw.map((r) => (JSON.parse(r) as { "@type": string })["@type"]);
  expect(types).toContain("BreadcrumbList");

  for (const c of postingData.carriers) {
    const block = page.getByTestId(`carrier-${c.id}`);
    await expect(block.locator("tbody tr")).toHaveCount(c.services.length);
    const missing = c.services.filter((s) => s.date === null).length;
    await expect(block.getByText("Not announced yet")).toHaveCount(missing);
  }

  await expect(page.getByTestId("christmas-countdown")).toBeVisible();
  await expect(page.getByText("[TOM:")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("Postage hub links to the Christmas dates", async ({ page }) => {
  await page.goto("/tools/postage");
  await page.getByRole("link", { name: "Christmas last posting dates" }).first().click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
});

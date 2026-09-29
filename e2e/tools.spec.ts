import { test, expect, type Page } from "@playwright/test";

/*
  Clicks through every free tool, the cookie banner, glossary tooltips and the
  public forms, the way a visitor would. Needs no database. Any uncaught page
  error fails the test.
*/


async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Pretend analytics was already answered so the banner does not cover buttons.
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: "http://localhost:3000" }]);
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBeLessThan(400);
  return errors;
}

async function fill(page: Page, label: string | RegExp, value: string) {
  const field = page.getByLabel(label, { exact: typeof label === "string" }).first();
  await field.fill(value);
}

test.describe("chromium only", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(() => test.info().project.name !== "chromium", "desktop flows");

  test("cookie banner: reject hides it and remembers the choice; settings reopen it", async ({ page }) => {
    await page.goto("/tools");
    const banner = page.getByRole("dialog", { name: "Cookies" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Reject analytics" }).click();
    await expect(banner).toBeHidden();
    expect((await page.context().cookies()).find((c) => c.name === "tsn-consent")?.value).toBe("essential");
    await page.getByRole("button", { name: "Cookie settings" }).click();
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: "Accept analytics" }).click();
    expect((await page.context().cookies()).find((c) => c.name === "tsn-consent")?.value).toBe("analytics");
  });

  test("where to sell: ranks platforms, private eBay only when asked, breakdown opens", async ({ page }) => {
    const errors = await open(page, "/tools/where-to-sell");
    await fill(page, "Selling price (£)", "40");
    await expect(page.getByText("eBay (business seller)")).toBeVisible();
    await expect(page.getByText("eBay (private seller)")).toHaveCount(0);
    await page.getByLabel(/clearing out my own things/).check();
    await expect(page.getByText("eBay (private seller)")).toBeVisible();
    await page.getByRole("button", { name: /Depop/ }).click();
    await expect(page.getByText("Payment processing")).toBeVisible();
    await expect(page.getByRole("link", { name: /Official fee page/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const slug of ["ebay", "vinted", "depop", "etsy", "tiktok-shop", "whatnot", "ebay-live", "amazon"]) {
    test(`fee calculator: ${slug}`, async ({ page }) => {
      const errors = await open(page, `/tools/fees/${slug}`);
      await fill(page, "Selling price (£)", "30");
      await expect(page.getByText("You receive").first()).toBeVisible();
      await expect(page.getByText(/List at £\d/)).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("offer calculator gives a lowest offer and a ladder", async ({ page }) => {
    const errors = await open(page, "/tools/offer-calculator");
    await page.getByLabel("Platform").selectOption("depop");
    await expect(page.getByText("Lowest offer to accept", { exact: true })).toBeVisible();
    await expect(page.getByText("25% off")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("FBA calculator shows profit, ROI and max buy price", async ({ page }) => {
    const errors = await open(page, "/tools/fba-calculator");
    await fill(page, "Selling price (£, inc VAT)", "20");
    await expect(page.getByText("Profit per unit")).toBeVisible();
    await expect(page.getByText(/Most to pay for/)).toBeVisible();
    await page.getByLabel("Size tier (fulfilment fee)").selectOption({ index: 2 });
    expect(errors).toEqual([]);
  });

  test("worth my time, trip cost, eBay shop, claims deadline", async ({ page }) => {
    let errors = await open(page, "/tools/worth-my-time");
    await fill(page, "Profit on the item (£)", "30");
    await expect(page.getByText("What you earned per hour", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/trip-cost");
    await expect(page.getByText("Expected profit from the haul")).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/ebay-shop");
    await fill(page, "New listings a month", "600");
    await expect(page.getByText("With a shop")).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/claims-deadline");
    await expect(page.getByText("Claim by")).toBeVisible();
    await page.getByLabel("What happened").selectOption("removal");
    expect(errors).toEqual([]);
  });

  test("show planner adds and removes items", async ({ page }) => {
    const errors = await open(page, "/tools/show-planner");
    const rows = page.getByRole("textbox", { name: "Item name" });
    await expect(rows).toHaveCount(3);
    await page.getByRole("button", { name: "Add an item" }).click();
    await expect(rows).toHaveCount(4);
    await page.getByRole("button", { name: "Remove" }).first().click();
    await expect(rows).toHaveCount(3);
    await page.getByLabel("Platform").selectOption("ebay_live");
    expect(errors).toEqual([]);
  });

  test("postage finder and parcel size checker", async ({ page }) => {
    let errors = await open(page, "/tools/postage-finder");
    await expect(page.getByText(/Royal Mail|Evri/).first()).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/parcel-size");
    await fill(page, "Length (cm)", "40");
    await fill(page, "Width (cm)", "30");
    await fill(page, "Depth (cm)", "12");
    await fill(page, "Weight", "1500");
    await expect(page.getByText(/services take this parcel/)).toBeVisible();
    await page.getByRole("radio", { name: "Tube or roll" }).click();
    await expect(page.getByLabel("Diameter (cm)")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("listing builder makes a title and counts characters", async ({ page }) => {
    const errors = await open(page, "/tools/listing-builder");
    await fill(page, "Brand", "Barbour");
    await fill(page, "What it is", "Wax jacket");
    await fill(page, "Size", "Size L");
    await expect(page.locator("#lb-ebay-title")).toHaveValue("Barbour Wax jacket Size L");
    await expect(page.locator("#lb-ebay-title-count")).toHaveText(/^25 of 80 characters/);
    await expect(page.locator("#lb-etsy-title-count")).toHaveText(/of 140 characters/);
    expect(errors).toEqual([]);
  });

  test("stock ageing, VAT, reporting check, scam check", async ({ page }) => {
    let errors = await open(page, "/tools/stock-ageing");
    await fill(page, "You paid", "8");
    await fill(page, "Listed at", "35");
    await fill(page, "Days listed", "70");
    await expect(page.getByText(/due now/).first()).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/vat");
    await fill(page, "You bought it for (£)", "10");
    await fill(page, "You sold it for (£)", "40");
    await expect(page.getByText("VAT due on the margin (1/6)")).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/reporting-check");
    await page.locator("#rc-s-eBay").fill("31");
    await expect(page.getByText("This platform will report you to HMRC.")).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/scam-check");
    await page.getByLabel(/asked for a code/).check();
    await expect(page.getByText(/signs of a scam/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("ISBN checker validates numbers", async ({ page }) => {
    const errors = await open(page, "/tools/isbn");
    await fill(page, /ISBN/, "9780141439518");
    await expect(page.getByText("Valid ISBN.")).toBeVisible();
    await fill(page, /ISBN/, "9780141439519");
    await expect(page.getByText(/not a valid ISBN/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("bulk price change reads a CSV and offers a download", async ({ page }) => {
    const errors = await open(page, "/tools/bulk-price");
    const csv = "Item number,Title,Current price\n1,Wax jacket,40.00\n2,Mug,10.00\n";
    await page.locator('input[type="file"]').setInputFiles({ name: "listings.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText("Wax jacket")).toBeVisible();
    await expect(page.getByText("£35.99")).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download new prices/ }).click();
    expect((await download).suggestedFilename()).toBe("new-prices.csv");
    expect(errors).toEqual([]);
  });

  test("sold comps: pasted prices give a median and what you keep", async ({ page }) => {
    const errors = await open(page, "/tools/sold-comps");
    await page.getByLabel("Paste the sold prices you found").fill(["Sold £20.00", "Sold £24.00 + £3.20 postage", "Sold £22", "Sold £90"].join("\n"));
    await expect(page.getByText("Median (middle price)")).toBeVisible();
    await expect(page.getByText("£23.00").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("repricer floors: pasted SKUs give a floor price table", async ({ page }) => {
    const errors = await open(page, "/tools/repricer-floors");
    await page.getByLabel("Or paste or type them here, with a header row").fill(["sku,cost", "TEST-1,5", "TEST-2,8.50"].join("\n"));
    await expect(page.getByText("TEST-2").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Amazon settlement summariser reads a settlement file", async ({ page }) => {
    const errors = await open(page, "/tools/amazon-settlement");
    const tsv = [
      "settlement-id	settlement-start-date	settlement-end-date	deposit-date	total-amount	currency	transaction-type	order-id	amount-type	amount-description	amount	posted-date",
      "111	2026-09-01	2026-09-14	2026-09-16	15.50	GBP						",
      "111						Order	026-0000000-0000001	ItemPrice	Principal	20.00	2026-09-03",
      "111						Order	026-0000000-0000001	ItemFees	Commission	-3.00	2026-09-03",
      "111						Order	026-0000000-0000001	ItemFees	FBAPerUnitFulfillmentFee	-1.50	2026-09-03",
    ].join("\n");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "settlement.txt", mimeType: "text/plain", buffer: Buffer.from(tsv) });
    await expect(page.getByText("£20.00").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("new tool pages open without errors", async ({ page }) => {
    for (const path of ["/tools/amazon-reimbursements", "/tools/background-remover", "/tools/calendar", "/tools/listing-builder"]) {
      const errors = await open(page, path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(errors, path).toEqual([]);
    }
  });

  test("reseller calendar exports a valid iCalendar file", async ({ request }) => {
    const res = await request.get("/tools/calendar/calendar.ics?categories=tax");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/calendar");
    const body = await res.text();
    expect(body.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(body).toContain("BEGIN:VEVENT");
  });

  test("profit report reads a sales CSV", async ({ page }) => {
    const errors = await open(page, "/tools/profit-report");
    const csv = [
      "Transaction creation date,Type,Item title,Gross transaction amount,Final value fee,Net amount",
      "10/04/2026,Order,Wax jacket,45.00,-5.40,39.60",
      "02/05/2026,Order,Mug,10.00,-1.30,8.70",
      "03/05/2026,Payout,,,,-48.30",
    ].join("\n");
    await page.locator('input[type="file"]').setInputFiles({ name: "ebay.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(page.getByText("All files together")).toBeVisible();
    await expect(page.getByText("2026 to 27")).toBeVisible();
    await expect(page.getByText("£55.00").first()).toBeVisible();
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /Download monthly summary/ }).click();
    expect((await download).suggestedFilename()).toBe("sales-summary.csv");
    expect(errors).toEqual([]);
  });

  test("tax dates show upcoming deadlines", async ({ page }) => {
    const errors = await open(page, "/tools/tax-dates");
    await expect(page.getByText(/In \d+ days|Today|Tomorrow/).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("glossary underline shows a tooltip on hover", async ({ page }) => {
    const errors = await open(page, "/guides/how-to-start-amazon-fba-uk");
    const term = page.locator("abbr.gloss").first();
    await expect(term).toBeVisible();
    await term.hover();
    await expect(page.getByRole("tooltip")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("change post calculator works", async ({ page }) => {
    const errors = await open(page, "/blog/ebay-business-per-order-fee-40p");
    await page.getByLabel("Orders over £10 a month").fill("200");
    await expect(page.getByText("A year")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("blog filters and guides jump links", async ({ page }) => {
    let errors = await open(page, "/blog");
    await page.getByRole("link", { name: "Fee and policy changes", exact: true }).first().click();
    await expect(page).toHaveURL(/type=changes/);
    await page.getByRole("link", { name: "Postage", exact: true }).click();
    await expect(page).toHaveURL(/platform=postage/);
    expect(errors).toEqual([]);
    errors = await open(page, "/guides");
    await page.getByRole("navigation", { name: "Platforms" }).getByRole("link").first().click();
    await expect(page).toHaveURL(/#/);
    expect(errors).toEqual([]);
  });

  test("tools page links all work", async ({ page }) => {
    await open(page, "/tools");
    const hrefs = await page.locator("main a[href^='/']").evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute("href")!))]);
    expect(hrefs.length).toBeGreaterThan(20);
    for (const href of hrefs) {
      const res = await page.request.get(href);
      expect(res.status(), href).toBeLessThan(400);
    }
  });

  test("pickups: post button asks visitors to sign in", async ({ page }) => {
    await open(page, "/community/pickups");
    await page.getByRole("link", { name: /Post a pickup/ }).first().click();
    await expect(page).toHaveURL(/\/login\?next=%2Fcommunity%2Fpickups%2Fnew/);
  });

  test("sign-up needs the age and terms boxes ticked", async ({ page }) => {
    await open(page, "/signup");
    const age = page.getByLabel("I am 18 or over.");
    await expect(age).toBeVisible();
    expect(await age.evaluate((el: HTMLInputElement) => el.required)).toBe(true);
    expect(await page.getByLabel(/I agree to the/).evaluate((el: HTMLInputElement) => el.required)).toBe(true);
  });

  test("contact form: choosing a topic changes the guidance", async ({ page }) => {
    const errors = await open(page, "/contact");
    await page.getByLabel("What is it about?").selectOption("defamation");
    await expect(page.getByText(/Defamation \(Operators of Websites\) Regulations 2013/)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test.describe("header controls", () => {
  test("dark mode button switches the theme", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "desktop");
    await open(page, "/");
    const html = page.locator("html");
    const before = await html.getAttribute("class");
    await page.getByRole("button", { name: /Switch to (light|dark) mode/ }).click();
    await expect.poll(async () => html.getAttribute("class")).not.toBe(before);
  });

  test("search box goes to search results", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "desktop");
    await open(page, "/");
    const box = page.locator("#header-search");
    await box.fill("royal mail");
    await box.press("Enter");
    await expect(page).toHaveURL(/\/community\/search\?q=royal/);
  });

  test("new topic asks visitors to sign in", async ({ page }) => {
    test.skip(test.info().project.name !== "chromium", "desktop");
    await open(page, "/community");
    await page.getByRole("link", { name: /New topic/ }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("phone menu opens and its links work", async ({ page }) => {
    test.skip(test.info().project.name !== "mobile", "phone");
    await open(page, "/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Tools" }).click();
    await expect(page).toHaveURL(/\/tools$/);
  });
});

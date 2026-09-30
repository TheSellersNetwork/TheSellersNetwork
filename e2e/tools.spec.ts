import { test, expect, type Locator, type Page } from "@playwright/test";

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

async function fill(scope: Page | Locator, label: string | RegExp, value: string) {
  const field = scope.getByLabel(label, { exact: typeof label === "string" }).first();
  await field.fill(value);
}

/* The open tab on a tool page with tabs. Hidden panels are left out of the accessibility tree, so this is always the visible one. */
const tab = (page: Page) => page.getByRole("tabpanel");

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

  test("calculator compare view: ranks platforms, private eBay only when asked, breakdown opens", async ({ page }) => {
    const errors = await open(page, "/tools/calculator");
    const compare = page.locator("#where-to-sell");
    await fill(compare, "Selling price (£)", "40");
    await expect(compare.getByText("eBay (business seller)")).toBeVisible();
    await expect(compare.getByText("eBay (private seller)")).toHaveCount(0);
    await compare.getByLabel(/clearing out my own things/).check();
    await expect(compare.getByText("eBay (private seller)")).toBeVisible();
    await compare.getByRole("button", { name: /Depop/ }).click();
    await expect(compare.getByText("Payment processing")).toBeVisible();
    await expect(compare.getByRole("link", { name: /Official fee page/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  for (const slug of ["ebay", "vinted", "depop", "etsy", "tiktok-shop", "whatnot", "ebay-live", "amazon"]) {
    test(`fee calculator: ${slug}`, async ({ page }) => {
      const errors = await open(page, `/tools/calculator/${slug}`);
      await fill(page, "Selling price (£)", "30");
      await expect(page.getByText("You receive").first()).toBeVisible();
      await expect(page.getByText(/List at £\d/)).toBeVisible();
      await expect(page.locator("#lowest-offer")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("calculator platform switcher goes to each platform's own page", async ({ page }) => {
    const errors = await open(page, "/tools/calculator");
    const nav = page.getByRole("navigation", { name: "Platforms" });
    await expect(nav.getByRole("link", { name: "Compare all" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Vinted" }).click();
    await expect(page).toHaveURL(/\/tools\/calculator\/vinted$/);
    await expect(page.getByRole("heading", { level: 1, name: "Vinted fee calculator" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Vinted" })).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Amazon FBA" }).click();
    await expect(page).toHaveURL(/\/tools\/calculator\/amazon-fba$/);
    await expect(page.getByRole("heading", { level: 1, name: "Amazon FBA profit calculator" })).toBeVisible();
    await nav.getByRole("link", { name: "Compare all" }).click();
    await expect(page).toHaveURL(/\/tools\/calculator$/);
    expect(errors).toEqual([]);
  });

  test("offer calculator gives a lowest offer and a ladder", async ({ page }) => {
    const errors = await open(page, "/tools/calculator");
    const offer = page.locator("#lowest-offer");
    await offer.getByLabel("Platform").selectOption("depop");
    await expect(offer.getByText("Lowest offer to accept", { exact: true })).toBeVisible();
    await expect(offer.getByText("25% off")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("FBA calculator shows profit, ROI and max buy price", async ({ page }) => {
    const errors = await open(page, "/tools/calculator/amazon-fba");
    await fill(page, "Selling price (£, inc VAT)", "20");
    await expect(page.getByText("Profit per unit")).toBeVisible();
    await expect(page.getByText(/Most to pay for/)).toBeVisible();
    await page.getByLabel("Size tier (fulfilment fee)").selectOption({ index: 2 });
    expect(errors).toEqual([]);
  });

  test("worth it, trip cost, eBay shop, claims deadline", async ({ page }) => {
    let errors = await open(page, "/tools/worth-it");
    await fill(tab(page), "Profit on the item (£)", "30");
    await expect(tab(page).getByText("What you earned per hour", { exact: true })).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/worth-it?tab=trip");
    await expect(tab(page).getByText("Expected profit from the haul")).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/calculator/ebay");
    const shop = page.locator("#ebay-shop");
    await fill(shop, "New listings a month", "600");
    await expect(shop.getByText("With a shop")).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/amazon-claims?tab=deadline");
    await expect(tab(page).getByText("Claim by")).toBeVisible();
    await tab(page).getByLabel("What happened").selectOption("removal");
    expect(errors).toEqual([]);
  });

  test("show planner adds and removes items", async ({ page }) => {
    const errors = await open(page, "/tools/calculator/whatnot");
    const planner = page.locator("#show-planner");
    const rows = planner.getByRole("textbox", { name: "Item name" });
    await expect(rows).toHaveCount(3);
    await planner.getByRole("button", { name: "Add an item" }).click();
    await expect(rows).toHaveCount(4);
    await planner.getByRole("button", { name: "Remove" }).first().click();
    await expect(rows).toHaveCount(3);
    await planner.getByLabel("Platform").selectOption("ebay_live");
    expect(errors).toEqual([]);
  });

  test("postage finder and parcel size checker", async ({ page }) => {
    let errors = await open(page, "/tools/postage");
    await expect(tab(page).getByText(/Royal Mail|Evri/).first()).toBeVisible();
    expect(errors).toEqual([]);
    errors = await open(page, "/tools/postage?tab=size");
    const panel = tab(page);
    await fill(panel, "Length (cm)", "40");
    await fill(panel, "Width (cm)", "30");
    await fill(panel, "Depth (cm)", "12");
    await fill(panel, "Weight", "1500");
    await expect(panel.getByText(/services take this parcel/)).toBeVisible();
    await panel.getByRole("radio", { name: "Tube or roll" }).click();
    await expect(panel.getByLabel("Diameter (cm)")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("hub tabs: switching updates ?tab=, keeps what was typed and works with arrow keys", async ({ page }) => {
    const errors = await open(page, "/tools/worth-it");
    await expect(page.getByRole("tab", { name: "One flip" })).toHaveAttribute("aria-selected", "true");
    await fill(tab(page), "Profit on the item (£)", "42");
    await page.getByRole("tab", { name: "Sourcing trip" }).click();
    await expect(page).toHaveURL(/[?&]tab=trip/);
    await expect(page.getByRole("tab", { name: "Sourcing trip" })).toHaveAttribute("aria-selected", "true");
    await expect(tab(page).getByText("Expected profit from the haul")).toBeVisible();
    await page.getByRole("tab", { name: "Sourcing trip" }).press("ArrowLeft");
    await expect(page).toHaveURL(/[?&]tab=flip/);
    await expect(page.getByRole("tab", { name: "One flip" })).toBeFocused();
    await expect(tab(page).getByLabel("Profit on the item (£)")).toHaveValue("42");
    expect(errors).toEqual([]);
  });

  test("a link with ?tab= opens that tab", async ({ page }) => {
    const errors = await open(page, "/tools/pricing?tab=bulk");
    await expect(page.getByRole("tab", { name: "Change prices in bulk" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tab", { name: "What to list at" })).toHaveAttribute("aria-selected", "false");
    await expect(tab(page)).toHaveAttribute("id", "tool-panel-bulk");
    expect(errors).toEqual([]);
  });

  test("old tool addresses redirect to the new pages", async ({ request }) => {
    const cases: [string, string][] = [
      ["/tools/where-to-sell", "/tools/calculator"],
      ["/tools/fees/ebay", "/tools/calculator/ebay"],
      ["/tools/fba-calculator", "/tools/calculator/amazon-fba"],
      ["/tools/parcel-size", "/tools/postage?tab=size"],
      ["/tools/isbn", "/tools/pricing?tab=books"],
      ["/tools/claims-deadline", "/tools/amazon-claims?tab=deadline"],
    ];
    for (const [from, to] of cases) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect(res.status(), from).toBe(308);
      expect(res.headers()["location"], from).toBe(to);
    }
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
    let errors = await open(page, "/tools/pricing?tab=markdowns");
    await fill(tab(page), "You paid", "8");
    await fill(tab(page), "Listed at", "35");
    await fill(tab(page), "Days listed", "70");
    await expect(tab(page).getByText(/due now/).first()).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/tax?tab=vat");
    await fill(tab(page), "You bought it for (£)", "10");
    await fill(tab(page), "You sold it for (£)", "40");
    await expect(tab(page).getByText("VAT due on the margin (1/6)")).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/tax?tab=reporting");
    await page.locator("#rc-s-eBay").fill("31");
    await expect(tab(page).getByText("This platform will report you to HMRC.")).toBeVisible();
    expect(errors).toEqual([]);

    errors = await open(page, "/tools/scam-check");
    await page.getByLabel(/asked for a code/).check();
    await expect(page.getByText(/signs of a scam/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("ISBN checker validates numbers", async ({ page }) => {
    const errors = await open(page, "/tools/pricing?tab=books");
    await fill(tab(page), /ISBN/, "9780141439518");
    await expect(tab(page).getByText("Valid ISBN.")).toBeVisible();
    await fill(tab(page), /ISBN/, "9780141439519");
    await expect(tab(page).getByText(/not a valid ISBN/)).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("bulk price change reads a CSV and offers a download", async ({ page }) => {
    const errors = await open(page, "/tools/pricing?tab=bulk");
    const panel = tab(page);
    const csv = "Item number,Title,Current price\n1,Wax jacket,40.00\n2,Mug,10.00\n";
    await panel.locator('input[type="file"]').setInputFiles({ name: "listings.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(panel.getByText("Wax jacket")).toBeVisible();
    await expect(panel.getByText("£35.99")).toBeVisible();
    const download = page.waitForEvent("download");
    await panel.getByRole("button", { name: /Download new prices/ }).click();
    expect((await download).suggestedFilename()).toBe("new-prices.csv");
    expect(errors).toEqual([]);
  });

  test("sold comps: pasted prices give a median and what you keep", async ({ page }) => {
    const errors = await open(page, "/tools/pricing");
    const panel = tab(page);
    await panel.getByLabel("Paste the sold prices you found").fill(["Sold £20.00", "Sold £24.00 + £3.20 postage", "Sold £22", "Sold £90"].join("\n"));
    await expect(panel.getByText("Median (middle price)")).toBeVisible();
    await expect(panel.getByText("£23.00").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("repricer floors: pasted SKUs give a floor price table", async ({ page }) => {
    const errors = await open(page, "/tools/pricing?tab=amazon-floors");
    const panel = tab(page);
    await panel.getByLabel("Or paste or type them here, with a header row").fill(["sku,cost", "TEST-1,5", "TEST-2,8.50"].join("\n"));
    await expect(panel.getByText("TEST-2").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("Amazon settlement summariser reads a settlement file", async ({ page }) => {
    const errors = await open(page, "/tools/sales-reports?tab=amazon-settlement");
    const panel = tab(page);
    const tsv = [
      "settlement-id\tsettlement-start-date\tsettlement-end-date\tdeposit-date\ttotal-amount\tcurrency\ttransaction-type\torder-id\tamount-type\tamount-description\tamount\tposted-date",
      "111\t2026-09-01\t2026-09-14\t2026-09-16\t15.50\tGBP\t\t\t\t\t\t",
      "111\t\t\t\t\t\tOrder\t026-0000000-0000001\tItemPrice\tPrincipal\t20.00\t2026-09-03",
      "111\t\t\t\t\t\tOrder\t026-0000000-0000001\tItemFees\tCommission\t-3.00\t2026-09-03",
      "111\t\t\t\t\t\tOrder\t026-0000000-0000001\tItemFees\tFBAPerUnitFulfillmentFee\t-1.50\t2026-09-03",
    ].join("\n");
    await panel.locator('input[type="file"]').first().setInputFiles({ name: "settlement.txt", mimeType: "text/plain", buffer: Buffer.from(tsv) });
    await expect(panel.getByText("£20.00").first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("tool pages open without errors", async ({ page }) => {
    for (const path of ["/tools/amazon-claims", "/tools/background-remover", "/tools/calendar", "/tools/listing-builder", "/tools/downloads", "/tools/glossary"]) {
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
    const errors = await open(page, "/tools/sales-reports");
    const panel = tab(page);
    const csv = [
      "Transaction creation date,Type,Item title,Gross transaction amount,Final value fee,Net amount",
      "10/04/2026,Order,Wax jacket,45.00,-5.40,39.60",
      "02/05/2026,Order,Mug,10.00,-1.30,8.70",
      "03/05/2026,Payout,,,,-48.30",
    ].join("\n");
    await panel.locator('input[type="file"]').setInputFiles({ name: "ebay.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(panel.getByText("All files together")).toBeVisible();
    await expect(panel.getByText("2026 to 27")).toBeVisible();
    await expect(panel.getByText("£55.00").first()).toBeVisible();
    const download = page.waitForEvent("download");
    await panel.getByRole("button", { name: /Download monthly summary/ }).click();
    expect((await download).suggestedFilename()).toBe("sales-summary.csv");
    expect(errors).toEqual([]);
  });

  test("tax dates show upcoming deadlines", async ({ page }) => {
    const errors = await open(page, "/tools/tax");
    await expect(tab(page).getByText(/In \d+ days|Today|Tomorrow/).first()).toBeVisible();
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
    expect(hrefs.length).toBeGreaterThanOrEqual(12);
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
    await expect(page.getByText(/Defamation Act 2013 and its regulations/)).toBeVisible();
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

test.describe("background remover", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(() => test.info().project.name !== "chromium", "desktop flows; the model runs once per test");

  async function openRemover(page: Page) {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = test.info().project.use.baseURL ?? "http://localhost:3000";
    await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: base }]);
    const res = await page.goto("/tools/background-remover");
    expect(res?.status()).toBeLessThan(400);
    // Cross-origin isolation for multi-threaded WASM on this route only.
    expect(res?.headers()["cross-origin-embedder-policy"]).toBe("credentialless");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    return errors;
  }

  test("presets change the settings and say where their sizes come from", async ({ page }) => {
    const errors = await openRemover(page);
    await page.getByRole("button", { name: "eBay", exact: true }).click();
    await expect(page.getByLabel("Size (longest side)")).toHaveValue("1600");
    await expect(page.getByLabel("Square (1:1)")).toBeChecked();
    await expect(page.getByTestId("bg-preset-note")).toContainText("1600 by 1600");
    await page.getByRole("button", { name: "Vinted", exact: true }).click();
    await expect(page.getByLabel("Portrait (4:5)")).toBeChecked();
    await expect(page.getByTestId("bg-preset-note")).toContainText("our own");
    await page.getByRole("button", { name: "Etsy", exact: true }).click();
    await expect(page.getByLabel("Size (longest side)")).toHaveValue("2000");
    // Changing a preset's setting drops the preset label.
    await page.getByLabel("Portrait (4:5)").check();
    await expect(page.getByTestId("bg-preset-note")).toHaveCount(0);
    // Settings are remembered after a reload.
    await page.reload();
    await expect(page.getByLabel("Portrait (4:5)")).toBeChecked();
    expect(errors).toEqual([]);
  });

  test("a bulk batch of 12 photos downloads as one zip", async ({ page }) => {
    test.setTimeout(120_000);
    const errors = await openRemover(page);
    // Twelve small generated product photos, added through the photo picker.
    await page.evaluate(async () => {
      const dt = new DataTransfer();
      for (let i = 0; i < 12; i++) {
        const c = document.createElement("canvas");
        c.width = 480;
        c.height = 360;
        const x = c.getContext("2d")!;
        x.fillStyle = "rgb(230, 226, 218)";
        x.fillRect(0, 0, 480, 360);
        x.fillStyle = `hsl(${i * 30} 60% 40%)`;
        x.beginPath();
        x.ellipse(240, 180, 90 + i * 3, 120, 0, 0, Math.PI * 2);
        x.fill();
        const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), "image/jpeg", 0.9));
        dt.items.add(new File([blob], `photo-${i + 1}.jpg`, { type: "image/jpeg" }));
      }
      const input = document.querySelector<HTMLInputElement>('input[aria-label="Choose photos"]')!;
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(page.getByTestId("bg-progress")).toContainText("12 of 12 done", { timeout: 90_000 });
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /Download all as a zip \(12\)/ }).click()]);
    expect(download.suggestedFilename()).toBe("photos-no-background.zip");
    const path = await download.path();
    const { readFileSync } = await import("node:fs");
    const zip = readFileSync(path);
    // End of central directory record: signature, then the number of files.
    const end = zip.length - 22;
    expect(zip.readUInt32LE(end)).toBe(0x06054b50);
    expect(zip.readUInt16LE(end + 10)).toBe(12);
    expect(zip.includes(Buffer.from("photo-1-no-background.jpg"))).toBe(true);
    expect(errors).toEqual([]);
  });
});

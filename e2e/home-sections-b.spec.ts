import { test, expect, type Page } from "@playwright/test";

/*
  Lower home page sections (ideas 3, 4, 7, 8 and 10) on their temporary
  preview route. The route 404s in production, so run these against the
  development server:
    PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/home-sections-b.spec.ts
  Once the sections are on the home page, point `url` at "/". The live
  database may have no threads, pickups or visitors, so every check copes
  with the honest empty state.
*/

const url = "/";

async function open(page: Page, path = url) {
  const res = await page.goto(path);
  test.skip(res?.status() === 404, "The preview route only exists outside production");
}

async function noSideScroll(page: Page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}

test.describe("I sell on switcher", () => {
  test("stores the choice in a cookie and the server reads it back", async ({ page, context }) => {
    await open(page);
    const group = page.getByRole("group", { name: "I sell on:" });
    await expect(group.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");

    await group.getByRole("button", { name: "Car boots" }).click();
    await expect(group.getByRole("button", { name: "Car boots" })).toHaveAttribute("aria-pressed", "true");
    // The server reads the cookie back: Start here now opens on the chosen platform.
    await expect(page.getByRole("tablist", { name: "Where you sell" }).getByRole("tab").first()).toContainText("Car boots");
    const cookie = (await context.cookies()).find((c) => c.name === "tsn-home-platform");
    expect(cookie?.value).toBe("sourcing");
    expect(cookie?.sameSite).toBe("Lax");
    expect(cookie!.expires - Date.now() / 1000).toBeGreaterThan(360 * 86_400);

    await page.reload();
    await expect(page.getByRole("group", { name: "I sell on:" }).getByRole("button", { name: "Car boots" })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("group", { name: "I sell on:" }).getByRole("button", { name: "All" }).click();
    await expect(page.getByRole("tablist", { name: "Where you sell" }).getByRole("tab").first()).toContainText("eBay");
    expect((await context.cookies()).find((c) => c.name === "tsn-home-platform")).toBeUndefined();
  });
});

test.describe("the week's rhythm", () => {
  test("seven days, today marked, past threads link to the forum", async ({ page }) => {
    await open(page);
    const week = page.getByRole("list", { name: "This week" });
    await expect(week.locator(":scope > li")).toHaveCount(7);
    await expect(week.locator(":scope > li").first()).toContainText("Mon");
    await expect(week.locator(":scope > li").last()).toContainText("Sun");
    await expect(week.locator('[aria-current="date"]')).toHaveCount(1);
    await expect(week.locator('[aria-current="date"]')).toContainText("Today");
    for (const href of await week.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))) {
      expect(href).toMatch(/^\/community\/t\/|^\/tools\/calendar$/);
    }
  });

  test("today is scrolled into view on a phone", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Phones only");
    await open(page);
    const week = page.getByRole("list", { name: "This week" });
    // Bring the strip on screen vertically only; the strip itself scrolls sideways to today.
    await week.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 120));
    await expect(week.locator('[aria-current="date"]')).toBeInViewport({ ratio: 0.5 });
    await noSideScroll(page);
  });
});

test.describe("guides shelf", () => {
  test("covers link to guides, and a started path offers Continue", async ({ page }) => {
    await open(page);
    const shelf = page.getByTestId("guides-shelf");
    test.skip((await shelf.count()) === 0, "No guides");
    const hrefs = await shelf.getByRole("listitem").getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThan(1);
    for (const href of hrefs) expect(href).toMatch(/^\/(guides|blog)(\/|$)/);
    await expect(page.getByTestId("shelf-continue")).toHaveCount(0);

    // Tick the first step of the first path, as reading it would.
    const first = hrefs[0].match(/^\/(guides|blog)\/(.+)$/)!;
    const key = `${first[1] === "guides" ? "guide" : "blog"}:${first[2]}`;
    await page.evaluate((k) => localStorage.setItem("tsn:paths:read", JSON.stringify([k])), key);
    await page.reload();
    const card = page.getByTestId("shelf-continue");
    await expect(card).toContainText(/Continue: step 2 of \d+/);
    await page.evaluate(() => localStorage.removeItem("tsn:paths:read"));
  });

  test("scroll buttons move the row on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "Buttons are for wider screens");
    await open(page, url);
    const right = page.getByRole("button", { name: "Scroll guides right" });
    test.skip((await right.count()) === 0, "No guides");
    // Both buttons start disabled until the page has loaded and measured the row.
    const scrolls = await expect(right)
      .toBeEnabled({ timeout: 10_000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!scrolls, "Row fits without scrolling");
    await right.click();
    await expect(page.getByRole("button", { name: "Scroll guides left" })).toBeEnabled();
  });
});

test.describe("sidebar", () => {
  test("around now always shows; the column sticks on wide screens", async ({ page, isMobile }) => {
    await open(page, url);
    const sidebar = page.getByTestId("home-sidebar");
    await expect(sidebar.getByRole("heading", { name: "Around now" })).toBeVisible();
    const online = sidebar.getByRole("list", { name: "Members here now" });
    if ((await online.count()) === 0) await expect(sidebar.getByText("Be the first here today.")).toBeVisible();
    if (!isMobile) expect(await sidebar.evaluate((el) => getComputedStyle(el).position)).toBe("sticky");
  });
});

test.describe("pickups section", () => {
  test("a compact preview, or how pickups work", async ({ page }) => {
    await open(page);
    const section = page.getByTestId("pickups-section");
    await expect(section.getByRole("link", { name: "BOLO list" })).toHaveAttribute("href", "/community/pickups/bolo");
    const list = section.getByRole("list", { name: "Latest pickups" });
    if ((await list.count()) === 0) {
      await expect(section.getByText("Post a find")).toBeVisible();
      await expect(section.getByText("It feeds the BOLO list")).toBeVisible();
      await expect(section.getByRole("link", { name: "Post a pickup" })).toHaveAttribute("href", "/community/pickups/new");
      return;
    }
    expect(await list.locator(":scope > li").count()).toBeLessThanOrEqual(6);
    await expect(section.getByRole("link", { name: /All pickups/ })).toHaveAttribute("href", "/community/pickups");
  });
});

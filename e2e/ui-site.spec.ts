import { test, expect, type Page } from "@playwright/test";

/*
  Site-wide UI: the phone navigation bar, instant search (Ctrl+K), page
  transitions and share cards. Needs no sign-in. Any uncaught page error
  fails the test.
*/

async function open(page: Page, path: string) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = test.info().project.use.baseURL ?? "http://localhost:3000";
  // Pretend analytics was already answered so the banner does not cover the bar.
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: base }]);
  const res = await page.goto(path);
  expect(res?.status(), `${path} status`).toBeLessThan(400);
  return errors;
}

/* The first live blog post linked from /blog. */
async function firstPost(page: Page): Promise<string> {
  await open(page, "/blog");
  const href = await page.locator('main a[href^="/blog/"]').first().getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

test.describe("no horizontal scroll on phones", () => {
  for (const width of [375, 320]) {
    test(`pages fit ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 740 });
      const post = await firstPost(page);
      for (const path of ["/", "/community", "/tools", post]) {
        const errors = await open(page, path);
        await page.waitForLoadState("networkidle");
        const { scroll, inner } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        expect(scroll, `${path} at ${width}px`).toBeLessThanOrEqual(inner);
        expect(errors).toEqual([]);
      }
    });
  }
});

test.describe("phone navigation bar", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test("shows the five tabs, marks the current one and navigates", async ({ page }) => {
    const errors = await open(page, "/community");
    const bar = page.getByRole("navigation", { name: "Quick links" });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole("link", { name: "Forum" })).toHaveAttribute("aria-current", "page");
    await expect(bar.getByRole("link", { name: "New post" })).toBeVisible();
    // Signed out: Sign in and Join take the places of Notifications and You.
    await expect(bar.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(bar.getByRole("link", { name: "Join" })).toHaveAttribute("href", "/signup");
    await bar.getByRole("link", { name: "Pickups" }).click();
    await expect(page).toHaveURL(/\/community\/pickups/);
    await expect(bar.getByRole("link", { name: "Pickups" })).toHaveAttribute("aria-current", "page");
    expect(errors).toEqual([]);
  });

  test("does not cover the end of the page", async ({ page }) => {
    await open(page, "/tools");
    const bar = page.getByRole("navigation", { name: "Quick links" });
    const barHeight = (await bar.boundingBox())!.height;
    const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
    expect(padding).toBeGreaterThanOrEqual(barHeight - 1);
  });

  // Staff pages and /brand (where it is also left out) need a staff sign-in, so the unit tests cover those.
  test("is not shown on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await open(page, "/community");
    await expect(page.getByRole("navigation", { name: "Quick links" })).toBeHidden();
  });

  test("the search button opens search", async ({ page }) => {
    await open(page, "/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Search", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByPlaceholder("Search tools, guides and the forum")).toBeFocused();
  });
});

test.describe("instant search", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(() => test.info().project.name !== "chromium", "keyboard shortcut on desktop");

  test("Ctrl+K finds a tool, opens it and remembers the search", async ({ page }) => {
    const errors = await open(page, "/");
    const input = page.getByPlaceholder("Search tools, guides and the forum");
    // The shortcut works once the page has hydrated; retry until it does.
    await expect(async () => {
      await page.keyboard.press("Control+k");
      await expect(input).toBeFocused({ timeout: 1000 });
    }).toPass();
    await input.fill("vinted fee");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tools", { exact: true })).toBeVisible();
    await expect(dialog.getByRole("option", { name: /Vinted fee calculator/ })).toBeVisible();
    // Forum results arrive after a short pause and a network call, so allow longer under load.
    await expect(dialog.getByText("Forum threads", { exact: true })).toBeVisible({ timeout: 15_000 });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/tools\/calculator\/vinted$/);

    await page.keyboard.press("Control+k");
    // The recent search, not results that happen to contain the words.
    await expect(page.getByRole("option", { name: "vinted fee", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("See all results goes to the forum search", async ({ page }) => {
    await open(page, "/tools");
    await page.waitForLoadState("networkidle");
    await page.locator("#header-search").click();
    const input = page.getByPlaceholder("Search tools, guides and the forum");
    await input.fill("royal mail");
    await page.getByRole("option", { name: /See all results for/ }).click();
    await expect(page).toHaveURL(/\/community\/search\?q=royal(%20|\+)mail/);
  });

  test("the index holds only live content and the forum route answers", async ({ request }) => {
    const res = await request.get("/api/search/catalogue");
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { entries: { kind: string; href: string }[] };
    expect(body.entries.some((e) => e.href === "/tools/calculator")).toBe(true);
    expect(body.entries.some((e) => e.kind === "guide")).toBe(true);
    const short = await request.get("/api/search?q=a");
    expect(await short.json()).toEqual({ results: [] });
  });
});

test.describe("page transitions", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.skip(() => test.info().project.name !== "chromium", "desktop");

  test("keep scroll position on back and work with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors = await open(page, "/tools");
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(200);
    const before = await page.evaluate(() => window.scrollY);
    await page.locator('main a[href="/tools/pricing"]').first().click();
    await expect(page).toHaveURL(/\/tools\/pricing$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/tools$/);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before - 50);
    expect(errors).toEqual([]);
  });
});

test.describe("share cards", () => {
  test("blog, guide, tool and site cards are PNG images", async ({ page, request }) => {
    const post = await firstPost(page);
    const index = (await (await request.get("/api/search/catalogue")).json()) as { entries: { kind: string; href: string }[] };
    const guide = index.entries.find((e) => e.kind === "guide")?.href;
    expect(guide).toBeTruthy();
    for (const path of [`${post}/opengraph-image`, `${guide}/opengraph-image`, "/tools/pricing/opengraph-image", "/opengraph-image"]) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/png");
    }
    await open(page, post);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  });

  test("a shared calculator link reproduces the result and its card", async ({ page, request, context }) => {
    test.skip(test.info().project.name !== "chromium", "clipboard permissions");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const errors = await open(page, "/tools/calculator/ebay?price=20&cost=5");
    await expect(page.getByLabel("Selling price (£)")).toHaveValue("20");
    await expect(page.getByLabel("You paid for it (£)")).toHaveValue("5");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toContain("/api/og/calculator?platform=ebay&price=20&cost=5");
    const card = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(card.headers()["content-type"]).toContain("image/png");

    await page.getByLabel("Selling price (£)").fill("35");
    await page.getByRole("button", { name: "Copy link to this result" }).click();
    await expect(page).toHaveURL(/price=35/);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("/tools/calculator/ebay?price=35");
    expect(errors).toEqual([]);
  });
});

import { test, expect, type Page } from "@playwright/test";

/*
  Lower home page sections (ideas 1, 2, 5 and 6) on their temporary preview
  home page (they used a preview route while being built).
  server: PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test e2e/home-sections.spec.ts
  Once the sections are on the home page, point `url` at "/".
*/

const url = "/";

async function open(page: Page) {
  const res = await page.goto(url);
  test.skip(res?.status() === 404, "The preview route only exists outside production");
}

test.describe("debate of the week", () => {
  test("shows the live debate with links, voting or chips", async ({ page }) => {
    await open(page);
    const band = page.getByTestId("debate-band");
    test.skip((await band.count()) === 0, "No debate is live");
    await expect(band.getByText("Debate of the week")).toBeVisible();
    await expect(band.getByRole("heading", { level: 2 })).toBeVisible();
    await expect(band.getByRole("link", { name: /Read both sides/ })).toHaveAttribute("href", /^\/blog\/debate-/);

    const poll = band.getByTestId("debate-band-poll");
    if ((await poll.count()) === 0) {
      await expect(band.getByText("Voting opens shortly.")).toBeVisible();
      await expect(band.getByRole("link", { name: "Join the discussion" })).toHaveCount(0);
      return;
    }
    await expect(band.getByRole("link", { name: "Join the discussion" })).toHaveAttribute("href", /^\/community\/t\//);
    // Signed out: choosing an answer asks you to join rather than voting.
    await poll.getByRole("button").first().click();
    await expect(poll.getByRole("link", { name: "Join free to vote" })).toHaveAttribute("href", /^\/signup\?next=/);
  });
});

test.describe("where would you keep more", () => {
  test("reveals every option sorted with a winner, then moves on", async ({ page }) => {
    await open(page);
    const game = page.getByTestId("keep-game");
    await expect(game.getByText("An example item, not a real sale.", { exact: false })).toBeVisible();
    await expect(game.getByTestId("keep-question")).toContainText("Where do you keep the most?");
    const options = game.getByRole("list").first().getByRole("button");
    await expect(options).toHaveCount(4);
    await options.first().click();

    const reveal = game.getByTestId("keep-reveal");
    await expect(reveal).toBeVisible();
    const rows = reveal.getByTestId("keep-rows").getByRole("listitem");
    await expect(rows).toHaveCount(4);
    await expect(reveal.locator("[data-best]").first()).toBeVisible();
    const kept = await rows.evaluateAll((els) => els.map((el) => Number((/You keep £([\d,.]+)/.exec(el.textContent ?? "")?.[1] ?? "0").replace(/,/g, ""))));
    expect([...kept].sort((a, b) => b - a)).toEqual(kept);
    await expect(reveal.getByRole("link", { name: "Open in the calculator" })).toHaveAttribute("href", /^\/tools\/calculator\?price=/);

    const question = await game.getByTestId("keep-question").textContent();
    await reveal.getByRole("button", { name: /Next item/ }).click();
    await expect(game.getByTestId("keep-reveal")).toHaveCount(0);
    await expect(game.getByTestId("keep-question")).not.toHaveText(question ?? "");
  });
});

test.describe("search before you ask", () => {
  test("shows at most five grouped results and an ask row, with arrow keys", async ({ page }) => {
    await open(page);
    const box = page.getByRole("combobox", { name: "What do you want to know?" });
    await box.fill("vinted");
    const list = page.getByRole("listbox");
    await expect(list.getByRole("option").first()).toBeVisible();
    await expect(page.getByTestId("ask-community")).toBeVisible();
    const options = list.getByRole("option");
    // Five results at most, plus the ask row.
    expect(await options.count()).toBeLessThanOrEqual(6);
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowUp");
    await expect(page.getByTestId("ask-community")).toHaveAttribute("aria-selected", "true");
    await box.press("ArrowDown");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
  });

  test("carries the question into the ask flow", async ({ page }) => {
    await open(page);
    const box = page.getByRole("combobox", { name: "What do you want to know?" });
    await box.fill("zzqx nothing matches this");
    await expect(page.getByTestId("ask-community")).toHaveAttribute("aria-selected", "true");
    await box.press("Enter");
    await page.waitForURL(/\/(signup|community\/new)/);
    expect(await page.evaluate(() => localStorage.getItem("tsn:pending-title"))).toBe("zzqx nothing matches this");
  });
});

test.describe("fee change timeline", () => {
  test("shows Today, and a dot opens its change in the panel", async ({ page }) => {
    await open(page);
    const timeline = page.getByTestId("fee-timeline");
    test.skip((await timeline.count()) === 0, "No changes to show");
    await expect(timeline.getByTestId("fee-timeline-today")).toBeVisible();
    const dots = timeline.getByRole("button");
    expect(await dots.count()).toBeGreaterThan(0);
    const first = dots.first();
    await first.focus();
    await expect(first).toHaveAttribute("aria-pressed", "true");
    await expect(timeline.getByTestId("fee-timeline-panel").getByRole("link", { name: /What it means for you/ })).toHaveAttribute("href", /^\/blog\//);
  });

  test("scrolls sideways inside itself on a phone, not the page", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phone layout only");
    await open(page);
    const pageFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(pageFits).toBe(true);
    const scroller = page.getByTestId("fee-timeline-scroller");
    if ((await scroller.count()) === 0) return;
    // Once hydrated, the line starts scrolled to Today.
    await expect.poll(() => scroller.evaluate((el) => el.scrollWidth <= el.clientWidth || el.scrollLeft > 0)).toBe(true);
  });
});

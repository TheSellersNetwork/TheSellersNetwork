import { test, expect } from "@playwright/test";

/*
  Forum UI upgrades: profile hover cards, topic previews, the accepted answer
  card and quote to reply. Needs a database with at least one topic.
  Optional:
    E2E_SOLVED_TOPIC  path of a solved topic, e.g. /community/t/slug/abcd1234
    E2E_STORAGE_STATE a Playwright storage state file for a signed-in member
*/

const solvedTopic = process.env.E2E_SOLVED_TOPIC;
const storageState = process.env.E2E_STORAGE_STATE;

async function firstTopicPath(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/community?view=latest");
  const href = await page.locator(".topic-row a.topic-title").first().getAttribute("href");
  expect(href).toBeTruthy();
  return href!;
}

test.describe("topic list", () => {
  test("hovering a title shows the start of the opening post on desktop", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop only");
    await page.goto("/community?view=latest");
    const title = page.locator(".topic-row a.topic-title").first();
    await title.hover();
    const preview = page.getByTestId("topic-preview");
    await expect(preview).toBeVisible();
    await expect(preview).not.toBeEmpty();
    await page.mouse.move(0, 0);
    await expect(preview).toBeHidden();
  });

  test("keyboard focus on a title shows the preview too", async ({ page, isMobile }) => {
    test.skip(isMobile, "Desktop only");
    await page.goto("/community?view=latest");
    const title = page.locator(".topic-row a.topic-title").first();
    await title.focus();
    // Programmatic focus is not focus-visible in every browser, so tab onto it.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("topic-preview")).toBeVisible();
  });

  test("thumbnails, when present, are small images from storage", async ({ page }) => {
    await page.goto("/community?view=latest");
    const thumbs = page.getByTestId("topic-thumb");
    const count = await thumbs.count();
    for (let i = 0; i < count; i++) {
      await expect(thumbs.nth(i)).toHaveAttribute("alt", "");
    }
  });

  test("no horizontal scroll at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/community?view=latest");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("profile hover cards", () => {
  test("hovering an avatar in the topic list opens the card", async ({ page, isMobile }) => {
    test.skip(isMobile, "Avatars are hidden in the list on phones");
    await page.goto("/community?view=latest");
    const avatar = page.locator(".topic-row a[href^='/community/u/']").first();
    await avatar.hover();
    const card = page.getByTestId("profile-card");
    await expect(card).toBeVisible();
    await expect(card.getByText(/^@/)).toBeVisible();
    await expect(card.getByRole("link", { name: "View profile" })).toBeVisible();
    await expect(card.getByText("Joined")).toBeVisible();
  });

  test("keyboard focus on a post author's name opens the card, Escape closes it", async ({ page, isMobile }) => {
    test.skip(isMobile, "Keyboard test");
    await page.goto(await firstTopicPath(page));
    const name = page.locator("article#post-1 header a.font-semibold").first();
    test.skip((await name.count()) === 0, "Opening post is anonymous or deleted");
    await name.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const card = page.getByTestId("profile-card");
    await expect(card).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(card).toBeHidden();
  });

  test("on a touch screen the first tap on an avatar opens the card instead of navigating", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Touch only");
    const path = await firstTopicPath(page);
    await page.goto(path);
    const avatar = page.locator("article#post-1 header a[href^='/community/u/']").first();
    test.skip((await avatar.count()) === 0, "Opening post is anonymous or deleted");
    await avatar.tap();
    await expect(page.getByTestId("profile-card")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(path);
  });

  test("anonymous posts have no card", async ({ page }) => {
    await page.goto(await firstTopicPath(page));
    const anonymous = page.locator("article[data-quote-anonymous='true'] header");
    const count = await anonymous.count();
    for (let i = 0; i < count; i++) {
      await expect(anonymous.nth(i).locator("a[href^='/community/u/']")).toHaveCount(0);
    }
  });
});

test.describe("accepted answer", () => {
  test.skip(!solvedTopic, "Set E2E_SOLVED_TOPIC to a solved topic path");

  test("shows under the opening post and jumps to the answer", async ({ page }) => {
    await page.goto(solvedTopic!);
    const card = page.getByTestId("accepted-answer");
    await expect(card).toBeVisible();
    await expect(card.getByRole("heading", { name: "Accepted answer" })).toBeVisible();
    const jump = card.getByRole("link", { name: "Jump to answer" });
    const target = (await jump.getAttribute("href"))!;
    await jump.click();
    await expect(page).toHaveURL(new RegExp(`${target}$`));
    const post = page.locator(target);
    await expect(post).toBeInViewport();
    await expect(post).toHaveAttribute("data-flash", "true");
    await expect(post).toBeFocused();
  });
});

test.describe("quote to reply", () => {
  test.skip(!storageState, "Set E2E_STORAGE_STATE to a signed-in member's storage state");
  test.use({ storageState: storageState ?? undefined });

  test("selecting text shows a Quote button that fills the composer", async ({ page, isMobile }) => {
    test.skip(isMobile, "Mouse selection");
    await page.goto(await firstTopicPath(page));
    const body = page.locator("article#post-1 [data-quote-body] p").first();
    await body.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(range);
    });
    const button = page.getByTestId("quote-selection");
    await expect(button).toBeVisible();
    await button.click();
    const editor = page.locator("#reply .ProseMirror");
    await expect(editor).toBeFocused();
    await expect(editor).toContainText("wrote:");
  });

  test("the Quote action under a post quotes the whole post from the keyboard", async ({ page }) => {
    await page.goto(await firstTopicPath(page));
    const quote = page.locator("article#post-1 footer").getByRole("button", { name: "Quote" });
    await quote.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#reply .ProseMirror")).toContainText("wrote:");
  });
});

import { test, expect, type Page } from "@playwright/test";

/*
  Topic status labels and filter, tag pages, the one-click unsubscribe route,
  the digest crons and the add to home screen card. Runs signed out against
  whatever the database holds, so every check copes with empty lists.
*/

async function noSideScroll(page: Page) {
  const [scroll, inner] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(scroll).toBeLessThanOrEqual(inner);
}

async function chipStatuses(page: Page): Promise<string[]> {
  return page.getByTestId("status-chip").evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.status ?? ""));
}

test.describe("topic status", () => {
  test("every topic row has a status chip", async ({ page }) => {
    await page.goto("/community?view=latest");
    const rows = await page.locator(".topic-row").count();
    const chips = await chipStatuses(page);
    expect(chips.length).toBe(rows);
    for (const s of chips) expect(["open", "answered", "solved", "closed"]).toContain(s);
    await noSideScroll(page);
  });

  for (const status of ["open", "answered", "solved", "closed"] as const) {
    test(`the ${status} filter only lists ${status} topics`, async ({ page }) => {
      await page.goto("/community?view=latest");
      const filter = page.getByRole("navigation", { name: "Filter by status" });
      await filter.getByRole("link", { name: new RegExp(`^${status}$`, "i") }).click();
      await expect(page).toHaveURL(new RegExp(`status=${status}`));
      await expect(filter.getByRole("link", { name: new RegExp(`^${status}$`, "i") })).toHaveAttribute("aria-current", "page");
      const chips = await chipStatuses(page);
      if (chips.length === 0) await expect(page.getByText("No topics with that status here yet.")).toBeVisible();
      for (const s of chips) expect(s).toBe(status);
    });
  }

  test("a forum page filters by status from the URL and keeps the view", async ({ page }) => {
    await page.goto("/community");
    const forum = page.locator('a[href^="/community/c/"]').first();
    test.skip((await forum.count()) === 0, "No forums yet");
    const href = await forum.getAttribute("href");
    await page.goto(`${href}?view=latest&status=answered`);
    for (const s of await chipStatuses(page)) expect(s).toBe("answered");
    const any = page.getByRole("navigation", { name: "Filter by status" }).getByRole("link", { name: "Any status" });
    await expect(any).toHaveAttribute("href", `${href}?view=latest`);
  });

  test("a topic page shows its status at the top", async ({ page }) => {
    await page.goto("/community?view=latest");
    const first = page.locator(".topic-row .topic-title").first();
    test.skip((await first.count()) === 0, "No topics yet");
    const listed = (await chipStatuses(page))[0];
    await first.click();
    await expect(page.locator("header").getByTestId("status-chip").first()).toHaveAttribute("data-status", listed);
  });
});

test.describe("tags", () => {
  test("an unknown tag is a 404", async ({ page }) => {
    const res = await page.goto("/community/tag/no-such-tag-anywhere");
    expect(res?.status()).toBe(404);
  });

  test("tag chips link to tag pages that list the topic", async ({ page }) => {
    await page.goto("/community?view=latest");
    const tag = page.locator('.topic-row a[href^="/community/tag/"]').first();
    test.skip((await tag.count()) === 0, "No tagged topics yet");
    const name = (await tag.textContent())?.trim() ?? "";
    await tag.click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByRole("navigation", { name: "Filter by status" })).toBeVisible();
    // Signed out, following asks the visitor to sign in rather than failing silently.
    const follow = page.getByTestId("tag-follow");
    if ((await follow.count()) > 0) {
      await follow.click();
      await expect(page.getByText("Sign in to follow tags.")).toBeVisible();
    }
  });
});

test.describe("email", () => {
  test("a bad unsubscribe link explains itself", async ({ page }) => {
    const res = await page.goto("/email/unsubscribe?token=not-a-real-token");
    expect(res?.status()).toBe(400);
    await expect(page.getByRole("heading", { name: "That link did not work" })).toBeVisible();
  });

  test("one-click unsubscribe with a forged token is refused", async ({ request }) => {
    const res = await request.post("/email/unsubscribe?token=00000000-0000-4000-8000-000000000000.digest.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA", {
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: "List-Unsubscribe=One-Click",
    });
    expect(res.status()).toBe(400);
  });

  test("the digest and fee alert crons need the cron secret", async ({ request }) => {
    expect((await request.get("/api/cron/digest")).status()).toBe(401);
    expect((await request.get("/api/cron/digest/fee-alerts")).status()).toBe(401);
    expect((await request.get("/api/cron/digest", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
  });
});

test.describe("add to home screen", () => {
  test("never shows to signed-out visitors, even on a later visit", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem("tsn-install-visits", "5");
      } catch {}
    });
    await page.goto("/community");
    await page.evaluate(() => {
      const e = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(e, { prompt: async () => {}, userChoice: Promise.resolve({ outcome: "dismissed" }) });
      window.dispatchEvent(e);
    });
    await expect(page.getByTestId("install-prompt")).toHaveCount(0);
  });
});

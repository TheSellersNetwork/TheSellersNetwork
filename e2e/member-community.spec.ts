import { test, expect } from "@playwright/test";

/*
  Pickup comments and votes, profile milestones and the welcome checklist,
  as a signed-out visitor sees them. The live database may have no pickups
  and the migration may not be applied yet, in which case these features
  are hidden, so each check copes with that rather than expecting data.
*/

async function firstPickupHref(page: import("@playwright/test").Page): Promise<string | null> {
  await page.goto("/community/pickups");
  const link = page.getByRole("list", { name: "Pickups" }).getByRole("link").first();
  return (await link.count()) === 0 ? null : await link.getAttribute("href");
}

test.describe("pickup talk", () => {
  test("signed-out visitors are asked to sign in to comment and to vote", async ({ page }) => {
    const href = await firstPickupHref(page);
    test.skip(!href, "No pickups yet");
    await page.goto(href!);

    const comments = page.locator("#comments");
    if ((await comments.count()) > 0) {
      await expect(comments.getByRole("heading", { level: 2 })).toHaveText(/comment/i);
      await expect(comments.getByRole("link", { name: "Sign in" })).toBeVisible();
      await expect(comments.getByRole("textbox")).toHaveCount(0);
    }

    const vote = page.getByRole("heading", { name: /^Would you have bought it at/ });
    if ((await vote.count()) > 0) {
      const section = page.locator("section", { has: vote });
      await expect(section.getByText(/to answer and see the results/)).toBeVisible();
      await expect(section.getByRole("button", { name: "Yes" })).toHaveCount(0);
    }
  });

  test("pickup cards label comment and answer counts for screen readers", async ({ page }) => {
    await page.goto("/community/pickups");
    const counts = page.getByRole("list", { name: "Pickups" }).locator(".sr-only", { hasText: /comment|to would you have bought it/ });
    for (const text of await counts.allTextContents()) expect(text.trim()).toMatch(/^(comments?|answers? to would you have bought it)$/);
  });

  test("the pickup form needs an account", async ({ page }) => {
    await page.goto("/community/pickups/new");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});

test.describe("milestones", () => {
  test("milestones are labelled as shared by the member", async ({ page }) => {
    await page.goto("/community");
    const profile = page.locator('a[href^="/community/u/"]').first();
    test.skip((await profile.count()) === 0, "No member links on the community page");
    await page.goto((await profile.getAttribute("href"))!);
    const heading = page.getByRole("heading", { name: /^Milestones shared by / });
    if ((await heading.count()) === 0) return;
    await expect(page.getByText("Self-declared by the member")).toBeVisible();
    // Visitors cannot edit someone else's milestones.
    await expect(page.getByRole("button", { name: /Add a milestone|Edit milestone|Delete milestone/ })).toHaveCount(0);
  });
});

test.describe("welcome checklist", () => {
  test("is not shown to signed-out visitors", async ({ page }) => {
    for (const path of ["/", "/community"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "Getting started" })).toHaveCount(0);
    }
  });
});

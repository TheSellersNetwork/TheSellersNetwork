import { test, expect } from "@playwright/test";

/*
  Smoke tests that run without a database: every public page renders its
  heading and the header, and nothing 500s. Flows that need Supabase live in
  e2e/forum.spec.ts and are skipped until E2E_SUPABASE is set.
*/

const pages: { path: string; heading: RegExp }[] = [
  { path: "/", heading: /landing headline/i },
  { path: "/community", heading: /Explore forums/ },
  { path: "/community?view=latest", heading: /Latest topics/ },
  { path: "/community/c/ebay", heading: /eBay/ },
  { path: "/community/rules", heading: /House rules/ },
  { path: "/community/search?q=royal", heading: /Search/ },
  { path: "/blog", heading: /blog/i },
  { path: "/guides", heading: /Guides/ },
  { path: "/login", heading: /Sign in/ },
  { path: "/signup", heading: /Join/ },
  { path: "/mentoring", heading: /Mentoring/ },
  { path: "/partners", heading: /Partners/ },
];

for (const page of pages) {
  test(`${page.path} renders`, async ({ page: p }) => {
    const response = await p.goto(page.path);
    expect(response?.status()).toBeLessThan(500);
    await expect(p.getByRole("heading", { level: 1, name: page.heading })).toBeVisible();
    await expect(p.getByRole("link", { name: "The Sellers Network home" })).toBeVisible();
  });
}

test("site defaults are slate and warm, and brand is staff only", async ({ page }) => {
  await page.goto("/community");
  await expect(page.locator("html")).toHaveAttribute("data-brand", "slate");
  await expect(page.locator("html")).toHaveAttribute("data-style", "warm");
  await page.goto("/brand");
  await expect(page).toHaveURL(/\/login/);
});

test("protected pages redirect to sign in", async ({ page }) => {
  await page.goto("/community/new");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/admin/flags");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/admin/partners");
  await expect(page).toHaveURL(/\/login/);
});

test("outbound redirect falls back to the partners page", async ({ page }) => {
  await page.goto("/go/00000000-0000-0000-0000-000000000000");
  await expect(page).toHaveURL(/\/partners$/);
});

test("robots and sitemap respond", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBeTruthy();
  expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await request.get("/sitemap/0.xml");
  expect(sitemap.ok()).toBeTruthy();
});

import { test, expect } from "@playwright/test";

test("home page renders the wordmark", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("The Sellers Network").first()).toBeVisible();
});

test("brand page switches palette", async ({ page }) => {
  await page.goto("/brand");
  await page.getByRole("button", { name: /Navy/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-brand", "navy");
});

import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { sampleLabelPdf } from "./label-sample";

/*
  Vinted label cropper page (/tools/vinted-label-cropper): one h1, metadata,
  JSON-LD that parses, the FAQ, and the cropper working on a made-up label
  from label-sample.ts, with the forum card shown only after a download.
  Needs no database: with no Vinted threads the card still shows, without a list.
*/

async function open(page: Page, baseURL: string | undefined, path = "/tools/vinted-label-cropper") {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: baseURL ?? "http://localhost:3000" }]);
  const res = await page.goto(path);
  expect(res?.status()).toBeLessThan(400);
  return errors;
}

type Ld = Record<string, unknown> & { "@type": string };

async function jsonLd(page: Page): Promise<Ld[]> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  // JSON.parse throws on anything invalid, which fails the test.
  return raw.map((r) => JSON.parse(r) as Ld);
}

test("Vinted page: one h1, metadata, valid JSON-LD and the FAQ", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Vinted label cropper");
  const title = await page.title();
  expect(title).toContain("Vinted label cropper");
  expect(title.length).toBeLessThan(60);
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toMatch(/Vinted/);
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/tools\/vinted-label-cropper$/);
  expect(await page.locator('meta[property="og:image"]').first().getAttribute("content")).toMatch(/vinted-label-cropper\/opengraph-image/);
  expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
  await expect(page.getByText("Not affiliated with or endorsed by Vinted.").first()).toBeVisible();

  const ld = await jsonLd(page);
  const app = ld.find((d) => d["@type"] === "WebApplication")!;
  expect(app).toBeTruthy();
  expect(app.operatingSystem).toBe("Any (web browser)");
  expect(app.isAccessibleForFree).toBe(true);
  expect(app.offers).toMatchObject({ price: "0", priceCurrency: "GBP" });
  expect(String(app.url)).toMatch(/\/tools\/vinted-label-cropper$/);
  const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList") as { itemListElement: { position: number; name: string }[] } & Ld;
  expect(crumbs.itemListElement.map((i) => i.name)).toEqual(["Tools", "Shipping label cropper", "Vinted label cropper"]);
  const faq = ld.find((d) => d["@type"] === "FAQPage") as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] } & Ld;
  expect(faq.mainEntity.length).toBeGreaterThanOrEqual(6);
  expect(faq.mainEntity.length).toBeLessThanOrEqual(10);

  // The visible FAQ matches the structured data, question for question.
  const shown = page.getByTestId("vinted-faq").locator("dt");
  await expect(shown).toHaveCount(faq.mainEntity.length);
  expect(await shown.allTextContents()).toEqual(faq.mainEntity.map((q) => q.name));
  await expect(page.getByRole("heading", { name: "How to print a Vinted label on a thermal printer" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vinted labels by carrier" })).toBeVisible();
  await expect(page.getByRole("link", { name: "thermal label printers compared" })).toHaveAttribute("href", "/blog/thermal-label-printers-compared");
  expect(errors).toEqual([]);
});

test("Vinted page: crops a label to 4x6, then offers the forum without blocking", async ({ page, baseURL }) => {
  const pdfRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/vendor/pdfjs-dist/")) pdfRequests.push(r.url());
  });
  const errors = await open(page, baseURL);
  // PDF.js is only fetched once a file is added.
  await page.waitForLoadState("networkidle");
  expect(pdfRequests).toEqual([]);
  await expect(page.getByText("Drop your Vinted label PDF or screenshot here")).toBeVisible();
  await expect(page.getByLabel("4 x 6 inch (101.6 x 152.4 mm), thermal")).toBeChecked();
  await expect(page.getByTestId("vinted-join-card")).toHaveCount(0);

  await page.getByLabel("Choose label files").setInputFiles([{ name: "vinted-label.pdf", mimeType: "application/pdf", buffer: Buffer.from(await sampleLabelPdf()) }]);
  await expect(page.getByTestId("lc-page")).toHaveCount(1, { timeout: 30_000 });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download 1 label" }).click()]);
  const doc = await PDFDocument.load(await readFile((await dl.path())!));
  expect(doc.getPageCount()).toBe(1);
  expect([Math.round(doc.getPage(0).getWidth()), Math.round(doc.getPage(0).getHeight())]).toEqual([288, 432]);

  const card = page.getByTestId("vinted-join-card");
  await expect(card).toBeVisible();
  await expect(card.getByRole("link", { name: "Join free" })).toHaveAttribute("href", "/signup?next=%2Fcommunity%2Fc%2Fvinted");
  expect(await card.locator("li").count()).toBeLessThanOrEqual(3);
  // No sideways scrolling, on phones too.
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  expect(errors).toEqual([]);
});

test("general cropper page links to the Vinted page and has its own JSON-LD", async ({ page, baseURL }) => {
  await open(page, baseURL, "/tools/label-cropper");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Vinted label cropper" }).first()).toHaveAttribute("href", "/tools/vinted-label-cropper");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(/\/tools\/label-cropper$/);
  const ld = await jsonLd(page);
  expect(ld.map((d) => d["@type"])).toEqual(expect.arrayContaining(["WebApplication", "BreadcrumbList"]));
  expect(ld.find((d) => d["@type"] === "FAQPage")).toBeUndefined();
});

test("Vinted page is in the sitemap and the search index", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap/0.xml")).text();
  expect(sitemap).toContain("/tools/vinted-label-cropper</loc>");
  expect(sitemap).toContain("/tools/label-cropper</loc>");
  const index = (await (await request.get("/api/search/catalogue")).json()) as { entries: { href: string }[] };
  expect(index.entries.map((e) => e.href)).toEqual(expect.arrayContaining(["/tools/vinted-label-cropper", "/tools/label-cropper"]));
});

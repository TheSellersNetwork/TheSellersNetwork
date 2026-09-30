import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { A4, LABEL_BOX, rotatedLabelPdf, sampleLabelPdf } from "./label-sample";

/*
  Shipping label cropper: made-up label PDFs are generated here with pdf-lib,
  added through the file input, and the downloaded PDF is opened with pdf-lib
  to check its pages. Needs no database.
*/

async function open(page: Page, baseURL: string | undefined) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Pretend analytics was already answered so the banner does not cover buttons.
  await page.context().addCookies([{ name: "tsn-consent", value: "essential", url: baseURL ?? "http://localhost:3000" }]);
  const res = await page.goto("/tools/label-cropper");
  expect(res?.status()).toBeLessThan(400);
  return errors;
}

const pdfFile = (name: string, bytes: Uint8Array) => ({ name, mimeType: "application/pdf", buffer: Buffer.from(bytes) });

async function add(page: Page, files: ReturnType<typeof pdfFile>[], pages: number) {
  await page.getByLabel("Choose label files").setInputFiles(files);
  await expect(page.getByTestId("lc-page")).toHaveCount(pages, { timeout: 30_000 });
  await expect(page.getByTestId("lc-reading")).toHaveCount(0);
}

async function download(page: Page) {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /^Download \d+ labels?/ }).click()]);
  const bytes = await readFile((await dl.path())!);
  return { name: dl.suggestedFilename(), bytes };
}

async function cropOf(page: Page, i: number) {
  return JSON.parse((await page.getByTestId("lc-page").nth(i).getAttribute("data-crop"))!) as { x: number; y: number; w: number; h: number };
}

/* The label's place on the sample page, as fractions of the page from the top left. */
const expected = {
  x: LABEL_BOX.left / A4.w,
  y: (A4.h - LABEL_BOX.top) / A4.h,
  w: (LABEL_BOX.right - LABEL_BOX.left) / A4.w,
  h: (LABEL_BOX.top - LABEL_BOX.bottom) / A4.h,
};

function expectNear(a: { x: number; y: number; w: number; h: number }, b: typeof a, tol = 0.02) {
  for (const k of ["x", "y", "w", "h"] as const) expect(Math.abs(a[k] - b[k]), k).toBeLessThanOrEqual(tol);
}

test("one A4 PDF: finds the label and downloads a 4x6 PDF", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await expect(page.getByText(/never leave your device/)).toBeVisible();
  await add(page, [pdfFile("vinted-label.pdf", await sampleLabelPdf())], 1);
  expectNear(await cropOf(page, 0), expected);
  await expect(page.getByTestId("lc-crop-size")).toContainText("as found");
  // No sideways scrolling, on phones too.
  const viewport = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport);

  const out = await download(page);
  expect(out.name).toMatch(/^labels-4x6-\d{4}-\d{2}-\d{2}\.pdf$/);
  const doc = await PDFDocument.load(out.bytes);
  expect(doc.getPageCount()).toBe(1);
  const { width, height } = doc.getPage(0).getSize();
  expect(Math.round(width)).toBe(288);
  expect(Math.round(height)).toBe(432);
  expect(errors).toEqual([]);
});

test("bulk: three files, one with two pages, make one 4x6 PDF of four labels", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await add(
    page,
    [pdfFile("a.pdf", await sampleLabelPdf({ seed: 1 })), pdfFile("b.pdf", await sampleLabelPdf({ seed: 2, pages: 2 })), pdfFile("c.pdf", await sampleLabelPdf({ seed: 3 }))],
    4,
  );
  for (let i = 0; i < 4; i++) expectNear(await cropOf(page, i), expected);
  await expect(page.getByRole("button", { name: "Download 4 labels" })).toBeEnabled();

  const out = await download(page);
  const doc = await PDFDocument.load(out.bytes);
  expect(doc.getPageCount()).toBe(4);
  for (const p of doc.getPages()) expect([Math.round(p.getWidth()), Math.round(p.getHeight())]).toEqual([288, 432]);

  // Two to an A4 sheet: four labels on two sheets.
  await page.getByLabel("A4, 2 labels a sheet").check();
  const sheets = await download(page);
  expect(sheets.name).toMatch(/^labels-a4-2-up-/);
  const a4 = await PDFDocument.load(sheets.bytes);
  expect(a4.getPageCount()).toBe(2);
  expect([Math.round(a4.getPage(0).getWidth()), Math.round(a4.getPage(0).getHeight())]).toEqual([595, 842]);

  // Separate PDFs come as a zip.
  await page.getByLabel("4 x 6 inch (101.6 x 152.4 mm), thermal").check();
  await page.getByLabel("A PDF for each label, in a zip").check();
  const zip = await download(page);
  expect(zip.name).toMatch(/^labels-4x6-.*\.zip$/);
  expect(zip.bytes.subarray(0, 2).toString()).toBe("PK");
  expect(errors).toEqual([]);
});

test("a label-sized page with /Rotate 270 and an offset CropBox comes out as one upright 4x6 page", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await add(page, [pdfFile("locker-label.pdf", await rotatedLabelPdf())], 1);
  const crop = await cropOf(page, 0);
  // The whole label fills the shown page; the block outside the CropBox is ignored.
  expect(crop.w).toBeGreaterThan(0.9);
  expect(crop.h).toBeGreaterThan(0.9);
  const doc = await PDFDocument.load((await download(page)).bytes);
  expect(doc.getPageCount()).toBe(1);
  expect([Math.round(doc.getPage(0).getWidth()), Math.round(doc.getPage(0).getHeight())]).toEqual([288, 432]);
  expect(errors).toEqual([]);
});

test("crop box: arrow keys move it, reset puts it back, and skipped pages are left out", async ({ page, baseURL }) => {
  const errors = await open(page, baseURL);
  await add(page, [pdfFile("two.pdf", await sampleLabelPdf({ pages: 2 }))], 2);
  const before = await cropOf(page, 0);
  const box = page.getByTestId("lc-crop-box");
  await box.focus();
  await page.keyboard.press("Shift+ArrowRight");
  await expect.poll(async () => (await cropOf(page, 0)).x).toBeGreaterThan(before.x + 0.04);
  await expect(page.getByText("Crop set by you")).toBeVisible();

  await page.getByRole("button", { name: "Reset to detected" }).click();
  await expect.poll(async () => (await cropOf(page, 0)).x).toBeCloseTo(before.x, 5);

  // Move the second label first, then skip it.
  await page.getByRole("button", { name: "Move label 2 up" }).click();
  await expect(page.getByTestId("lc-page").first()).toContainText("page 2 of 2");
  await page.getByRole("button", { name: /Adjust label 1:/ }).click();
  await page.getByRole("button", { name: "Skip this page" }).click();
  await expect(page.getByRole("button", { name: "Download 1 label" })).toBeVisible();
  const doc = await PDFDocument.load((await download(page)).bytes);
  expect(doc.getPageCount()).toBe(1);
  expect(errors).toEqual([]);
});

test("rejects files that are not labels, with a clear message", async ({ page, baseURL }) => {
  await open(page, baseURL);
  await page.getByLabel("Choose label files").setInputFiles([{ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") }]);
  await expect(page.getByTestId("lc-dropzone").getByRole("alert")).toContainText("is not a PDF, PNG, JPEG or WebP");
  await expect(page.getByTestId("lc-page")).toHaveCount(0);
});

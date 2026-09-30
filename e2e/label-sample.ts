import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

/*
  Makes a made-up A4 shipping label PDF for tests: a bordered label in the top
  left with a barcode-like pattern and a square code, and instruction text and
  a dashed cut line elsewhere on the page, roughly how A4 label PDFs from
  selling apps are laid out. No real names or addresses. The label is at
  LABEL_BOX, in PDF points from the bottom left.

  Options: pages (default 1), rotate to store the page with /Rotate.
*/

export const A4 = { w: 595.28, h: 841.89 };
export const LABEL_BOX = { left: 36, bottom: A4.h - 36 - 420, right: 36 + 280, top: A4.h - 36 };

export async function sampleLabelPdf(opts: { pages?: number; seed?: number } = {}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  for (let n = 0; n < (opts.pages ?? 1); n++) {
    const page = doc.addPage([A4.w, A4.h]);
    const { left, bottom, right, top } = LABEL_BOX;
    // Label border.
    page.drawRectangle({ x: left, y: bottom, width: right - left, height: top - bottom, borderColor: black, borderWidth: 1.5 });
    page.drawText("SAMPLE CARRIER", { x: left + 14, y: top - 34, size: 16, font: bold });
    page.drawText(`Parcel ${String((opts.seed ?? 1) * 100 + n + 1).padStart(6, "0")}`, { x: left + 14, y: top - 54, size: 10, font });
    ["Deliver to:", "Test Recipient", "1 Example Road", "Sampletown", "AB1 2CD"].forEach((line, i) =>
      page.drawText(line, { x: left + 14, y: top - 90 - i * 16, size: i === 0 ? 9 : 13, font: i === 0 ? font : bold }),
    );
    // Square code, a grid of filled cells.
    let s = 7 + n + (opts.seed ?? 0);
    const rand = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
    for (let gy = 0; gy < 21; gy++)
      for (let gx = 0; gx < 21; gx++) if (rand() > 0.5) page.drawRectangle({ x: right - 104 + gx * 4, y: top - 190 + gy * 4, width: 4, height: 4, color: black });
    // Barcode: bars of varying width.
    let x = left + 20;
    while (x < right - 22) {
      const w = 1 + Math.floor(rand() * 3);
      page.drawRectangle({ x, y: bottom + 60, width: w, height: 90, color: black });
      x += w + 1 + Math.floor(rand() * 3);
    }
    page.drawText("TRACKING 0000 0000 0000", { x: left + 50, y: bottom + 40, size: 11, font });
    // Instructions on the right and below, in small text, plus a dashed cut line.
    const words = "Fold the label along the line and attach it to the parcel so the barcode is flat and easy to scan".split(" ");
    for (let i = 0; i < 14; i++) page.drawText(words.slice(i % 6, (i % 6) + 7).join(" "), { x: right + 30, y: top - 20 - i * 14, size: 8, font });
    page.drawText("How to send your parcel", { x: 40, y: 250, size: 14, font: bold });
    for (let i = 0; i < 10; i++) page.drawText(words.slice(i % 8, (i % 8) + 12).join(" "), { x: 40, y: 225 - i * 13, size: 9, font });
    for (let dx = 20; dx < A4.w - 20; dx += 12) page.drawLine({ start: { x: dx, y: bottom - 30 }, end: { x: dx + 6, y: bottom - 30 }, thickness: 0.8, color: black });
    page.drawText("cut here", { x: A4.w - 70, y: bottom - 44, size: 7, font });
  }
  return doc.save();
}

/*
  A label-sized page stored the awkward way some carrier PDFs are: a larger
  MediaBox, a CropBox of 427 x 303 points that does not start at the origin,
  and /Rotate 270, so it shows as an upright portrait label about 107 x 151 mm.
  The content is drawn turned a quarter clockwise so it reads upright once
  shown. Ink outside the CropBox must never reach the output.
*/
export const ROTATED_CROP = { x: 147, y: 7, width: 427, height: 303 };

export async function rotatedLabelPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const black = rgb(0, 0, 0);
  const page = doc.addPage([720, 320]);
  page.setCropBox(ROTATED_CROP.x, ROTATED_CROP.y, ROTATED_CROP.width, ROTATED_CROP.height);
  page.setRotation(degrees(270));
  // Outside the CropBox: a solid block that would show up if the MediaBox were used.
  page.drawRectangle({ x: 10, y: 10, width: 120, height: 300, color: black });
  const { x, y, width, height } = ROTATED_CROP;
  page.drawRectangle({ x: x + 6, y: y + 6, width: width - 12, height: height - 12, borderColor: black, borderWidth: 1.5 });
  // Shown upright, "up" on the label is +x in PDF space, so text runs down the page (rotate -90).
  page.drawText("SAMPLE LOCKER", { x: x + width - 40, y: y + height - 20, size: 22, font, rotate: degrees(-90) });
  let s = 11;
  const rand = () => ((s = (s * 16807) % 2147483647), s / 2147483647);
  // Barcode bars across the label as shown, so they run along PDF y.
  for (let yy = y + 30; yy < y + height - 30; ) {
    const w = 1 + Math.floor(rand() * 3);
    page.drawRectangle({ x: x + 40, y: yy, width: 110, height: w, color: black });
    yy += w + 1 + Math.floor(rand() * 3);
  }
  page.drawText("TEST 0000 0000", { x: x + 30, y: y + height - 60, size: 12, font, rotate: degrees(-90) });
  return doc.save();
}

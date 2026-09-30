import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  FULL,
  MIN_SIDE,
  OUTPUT_SIZES,
  clampRect,
  cropToPdfBox,
  detectLabel,
  dilate,
  fileKind,
  fitLabel,
  layoutPdfLabel,
  luminance,
  moveRect,
  outputName,
  outputSize,
  padRect,
  placement,
  resizeRect,
  sheetCount,
  shownSize,
  sizeKey,
  slotFor,
  type Rect,
  type Slot,
} from "./label-crop";

/* A synthetic greyscale page: white paper we draw dark rectangles on. */
function paper(w: number, h: number, level = 255) {
  const lum = new Uint8Array(w * h).fill(level);
  const fill = (x0: number, y0: number, x1: number, y1: number, v = 0) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) lum[y * w + x] = v;
  };
  return { lum, w, h, fill };
}

/* A label: a 1 px border, a barcode of stripes and a few lines of "text". */
function drawLabel(p: ReturnType<typeof paper>, x0: number, y0: number, x1: number, y1: number, ink = 0) {
  p.fill(x0, y0, x1, y0 + 1, ink);
  p.fill(x0, y1 - 1, x1, y1, ink);
  p.fill(x0, y0, x0 + 1, y1, ink);
  p.fill(x1 - 1, y0, x1, y1, ink);
  const bw = x1 - x0;
  const bh = y1 - y0;
  for (let x = x0 + Math.round(bw * 0.1); x < x0 + bw * 0.9; x += 3) p.fill(x, y0 + Math.round(bh * 0.55), x + (x % 2 ? 2 : 1), y0 + Math.round(bh * 0.8), ink);
  for (let row = 0; row < 4; row++) {
    const y = y0 + Math.round(bh * 0.1) + row * 6;
    p.fill(x0 + Math.round(bw * 0.1), y, x0 + Math.round(bw * 0.7), y + 2, ink);
  }
}

const near = (a: Rect, b: Rect, tol: number) => {
  expect(Math.abs(a.x - b.x)).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.w - b.w)).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.h - b.h)).toBeLessThanOrEqual(tol);
};

describe("detectLabel", () => {
  it("finds a single label block", () => {
    const p = paper(210, 297);
    drawLabel(p, 20, 30, 120, 180);
    const d = detectLabel(p.lum, p.w, p.h);
    expect(d).not.toBeNull();
    near(d!.rect, { x: 20 / 210, y: 30 / 297, w: 100 / 210, h: 150 / 297 }, 0.01);
  });

  it("prefers the label over instruction text and a cut line elsewhere on the page", () => {
    const p = paper(210, 297);
    drawLabel(p, 15, 15, 115, 150);
    // A dashed cut line across the page below the label.
    for (let x = 0; x < 210; x += 6) p.fill(x, 170, x + 3, 171);
    // Scattered instruction text in the bottom third: short words on lines.
    for (let line = 0; line < 8; line++) {
      const y = 190 + line * 10;
      for (let x = 20; x < 190; x += 14) p.fill(x, y, x + 8 + (x % 3), y + 2);
    }
    // A logo-sized blob top right.
    p.fill(170, 20, 190, 32);
    const d = detectLabel(p.lum, p.w, p.h);
    expect(d).not.toBeNull();
    near(d!.rect, { x: 15 / 210, y: 15 / 297, w: 100 / 210, h: 135 / 297 }, 0.01);
  });

  it("keeps a label with no border together, but leaves out text in the next column", () => {
    const p = paper(210, 297);
    // Address lines, then a big gap, then a barcode, all in one column.
    for (let row = 0; row < 4; row++) p.fill(20, 20 + row * 7, 90, 23 + row * 7);
    for (let x = 20; x < 110; x += 3) p.fill(x, 65, x + 2, 95);
    // Instructions in a column to the right.
    for (let line = 0; line < 12; line++) p.fill(125, 20 + line * 6, 190, 22 + line * 6);
    const d = detectLabel(p.lum, p.w, p.h)!;
    near(d.rect, { x: 20 / 210, y: 20 / 297, w: 89 / 210, h: 75 / 297 }, 0.01);
  });

  it("finds a landscape label on its side", () => {
    const p = paper(210, 297);
    drawLabel(p, 20, 160, 190, 270);
    const d = detectLabel(p.lum, p.w, p.h)!;
    expect(d.rect.w).toBeGreaterThan(d.rect.h);
    near(d.rect, { x: 20 / 210, y: 160 / 297, w: 170 / 210, h: 110 / 297 }, 0.01);
  });

  it("returns null for a blank page and for dust", () => {
    const blank = paper(200, 280);
    expect(detectLabel(blank.lum, blank.w, blank.h)).toBeNull();
    blank.fill(50, 50, 51, 51);
    expect(detectLabel(blank.lum, blank.w, blank.h)).toBeNull();
  });

  it("finds a white label photographed on a dark table", () => {
    const p = paper(300, 400, 60);
    p.fill(60, 50, 240, 330, 245);
    drawLabel(p, 80, 80, 220, 300, 10);
    const d = detectLabel(p.lum, p.w, p.h)!;
    near(d.rect, { x: 60 / 300, y: 50 / 400, w: 180 / 300, h: 280 / 400 }, 0.01);
  });

  it("ignores faint grey that is close to the paper", () => {
    const p = paper(200, 280);
    p.fill(0, 0, 200, 280, 235);
    drawLabel(p, 30, 30, 150, 200);
    const d = detectLabel(p.lum, p.w, p.h)!;
    near(d.rect, { x: 30 / 200, y: 30 / 280, w: 120 / 200, h: 170 / 280 }, 0.01);
  });
});

describe("dilate and luminance", () => {
  it("grows a single pixel into a square", () => {
    const m = new Uint8Array(25);
    m[12] = 1;
    const out = dilate(m, 5, 5, 1);
    expect(Array.from(out).reduce((a, b) => a + b, 0)).toBe(9);
    expect(out[0]).toBe(0);
    expect(out[6]).toBe(1);
  });

  it("shrinks RGBA by averaging and treats transparency as white", () => {
    const rgba = new Uint8ClampedArray(4 * 4 * 4);
    for (let i = 0; i < 16; i++) rgba.set(i < 8 ? [0, 0, 0, 255] : [0, 0, 0, 0], i * 4);
    const { lum, w, h } = luminance(rgba, 4, 4, 2);
    expect([w, h]).toEqual([2, 2]);
    expect(Array.from(lum)).toEqual([0, 0, 255, 255]);
  });
});

describe("crop box maths", () => {
  it("clamps, pads and moves inside the page", () => {
    expect(clampRect({ x: 0.9, y: -0.1, w: 0.5, h: 0.001 })).toEqual({ x: 0.5, y: 0, w: 0.5, h: MIN_SIDE });
    expect(padRect({ x: 0.01, y: 0.5, w: 0.2, h: 0.2 }, 0.02, 0.02)).toEqual({ x: 0, y: 0.48, w: 0.23, h: 0.24 });
    expect(moveRect({ x: 0.8, y: 0.8, w: 0.3, h: 0.1 }, 0.5, -1)).toEqual({ x: 0.7, y: 0, w: 0.3, h: 0.1 });
  });

  it("resizes from a corner or edge and keeps a minimum size", () => {
    const r = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 };
    const se = resizeRect(r, "se", 0.1, 0.1);
    expect(se.x).toBe(0.2);
    expect(se.w).toBeCloseTo(0.5);
    const nw = resizeRect(r, "nw", 1, 1);
    expect(nw.w).toBeCloseTo(MIN_SIDE);
    expect(nw.x + nw.w).toBeCloseTo(0.6);
    const n = resizeRect(r, "n", 0.3, -0.5);
    expect(n.x).toBe(0.2);
    expect(n.y).toBe(0);
    expect(n.h).toBeCloseTo(0.6);
  });

  it("matches page sizes to the nearest point", () => {
    expect(sizeKey("pdf", 595.28, 841.89)).toBe(sizeKey("pdf", 595.2, 842.1));
    expect(sizeKey("pdf", 595, 842)).not.toBe(sizeKey("image", 595, 842));
  });
});

describe("PDF coordinates", () => {
  const view: [number, number, number, number] = [10, 20, 610, 820]; // 600 wide, 800 tall

  it("maps the whole page to the visible box at every rotation", () => {
    for (const r of [0, 90, 180, 270]) expect(cropToPdfBox(FULL, view, r)).toEqual({ left: 10, bottom: 20, right: 610, top: 820 });
  });

  it("maps the top left quarter as shown, allowing for /Rotate", () => {
    const q = { x: 0, y: 0, w: 0.5, h: 0.5 };
    // Unrotated: the top left of the page.
    expect(cropToPdfBox(q, view, 0)).toEqual({ left: 10, bottom: 420, right: 310, top: 820 });
    // Turned clockwise 90: the top left as shown is the bottom left of the page.
    expect(cropToPdfBox(q, view, 90)).toEqual({ left: 10, bottom: 20, right: 310, top: 420 });
    // 180: the bottom right.
    expect(cropToPdfBox(q, view, 180)).toEqual({ left: 310, bottom: 20, right: 610, top: 420 });
    // 270: the top right.
    expect(cropToPdfBox(q, view, 270)).toEqual({ left: 310, bottom: 420, right: 610, top: 820 });
  });

  it("swaps width and height of the shown page for quarter turns", () => {
    expect(shownSize(view, 90)).toEqual({ w: 800, h: 600 });
    expect(shownSize(view, 180)).toEqual({ w: 600, h: 800 });
  });
});

/* Where pdf-lib's rotate-about-(x, y) puts the corners of a w by h object. */
function drawnBox(w: number, h: number, p: { x: number; y: number; scale: number; ccw: number }): Slot {
  const a = (p.ccw * Math.PI) / 180;
  const pts = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ].map(([u, v]) => [p.x + p.scale * (u * Math.cos(a) - v * Math.sin(a)), p.y + p.scale * (u * Math.sin(a) + v * Math.cos(a))]);
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

const sameBox = (a: Slot, b: Slot) => {
  for (const k of ["x", "y", "w", "h"] as const) expect(a[k]).toBeCloseTo(b[k], 6);
};

describe("output layout", () => {
  const four = outputSize("4x6");

  it("has the sizes asked for, 4x6 first", () => {
    expect(OUTPUT_SIZES.map((s) => s.id)).toEqual(["4x6", "a6", "100x150", "a4-2", "a4-4"]);
    expect([four.pageW, four.pageH]).toEqual([288, 432]);
    expect(outputSize("nonsense").id).toBe("4x6");
  });

  it("fits a portrait label straight and centres it with the margin", () => {
    const f = fitLabel(200, 300, four.slots[0], 0);
    expect(f.turn).toBe(0);
    expect(f.scale).toBeCloseTo(1.44);
    sameBox(f.box, { x: 0, y: 0, w: 288, h: 432 });
    const m = fitLabel(288, 432, four.slots[0], 10);
    // Width is the tighter side: 268 of 288 across, so 402 tall, centred top to bottom.
    sameBox(m.box, { x: 10, y: 15, w: 268, h: 402 });
  });

  it("turns a landscape label to fill a portrait page", () => {
    const f = fitLabel(600, 400, four.slots[0], 0);
    expect(f.turn).toBe(90);
    sameBox(f.box, { x: 0, y: 0, w: 288, h: 432 });
  });

  it("puts 2 and 4 labels on an A4 sheet top first, left to right", () => {
    const two = outputSize("a4-2");
    const s0 = slotFor(0, two).slot;
    const s1 = slotFor(1, two).slot;
    expect(s0.y).toBeGreaterThan(s1.y);
    expect(slotFor(2, two).sheet).toBe(1);
    expect(sheetCount(3, two)).toBe(2);
    const quad = outputSize("a4-4");
    const q = [0, 1, 2, 3].map((i) => slotFor(i, quad).slot);
    expect(q[0].x).toBe(0);
    expect(q[1].x).toBeCloseTo(quad.pageW / 2);
    expect(q[0].y).toBeCloseTo(quad.pageH / 2);
    expect(q[2].y).toBe(0);
    expect(q[3]).toEqual({ x: quad.pageW / 2, y: 0, w: quad.pageW / 2, h: quad.pageH / 2 });
    // A 4x6 portrait label goes into the landscape half-sheet on its side.
    expect(fitLabel(288, 432, s0, 0).turn).toBe(90);
  });

  it("places a turned object exactly in its box at every angle", () => {
    const box = { x: 30, y: 40, w: 0, h: 0 };
    for (const ccw of [0, 90, 180, 270]) {
      const quarter = ccw % 180 === 90;
      const target = { ...box, w: (quarter ? 50 : 100) * 2, h: (quarter ? 100 : 50) * 2 };
      const p = placement(100, 50, ccw, 2, target);
      sameBox(drawnBox(100, 50, p), target);
    }
  });

  it("undoes /Rotate and fits the label, for a page shown turned", () => {
    // A4 page stored portrait with /Rotate 90 (shown landscape). The label is the left half as shown.
    const a4: [number, number, number, number] = [0, 0, 595, 842];
    const { box, fit, place } = layoutPdfLabel({ x: 0, y: 0, w: 0.5, h: 1 }, a4, 90, four.slots[0], 0);
    expect(box).toEqual({ left: 0, bottom: 0, right: 595, top: 421 });
    // As shown the label is 421 wide and 595 tall: portrait, so no extra turn.
    expect(fit.turn).toBe(0);
    // Undoing a clockwise quarter turn is 270 anticlockwise.
    expect(place.ccw).toBe(270);
    sameBox(drawnBox(595, 421, place), fit.box);
  });
});

describe("names and files", () => {
  it("names the download by size and date", () => {
    expect(outputName(outputSize("4x6"), new Date(2026, 8, 30), "pdf")).toBe("labels-4x6-2026-09-30.pdf");
    expect(outputName(outputSize("a4-2"), new Date(2026, 0, 5), "zip")).toBe("labels-a4-2-up-2026-01-05.zip");
  });

  it("accepts PDFs and PNG, JPEG and WebP pictures only", () => {
    expect(fileKind({ name: "label.PDF", type: "" })).toBe("pdf");
    expect(fileKind({ name: "x", type: "image/webp" })).toBe("image");
    expect(fileKind({ name: "photo.jpeg", type: "" })).toBe("image");
    expect(fileKind({ name: "photo.heic", type: "image/heic" })).toBeNull();
  });

  it("serves the PDF.js worker for the installed version from the site", () => {
    const root = path.resolve(__dirname, "../../..");
    const { version } = JSON.parse(readFileSync(path.join(root, "node_modules/pdfjs-dist/package.json"), "utf8"));
    expect(existsSync(path.join(root, "public/vendor/pdfjs-dist", version, "pdf.worker.min.mjs"))).toBe(true);
  });
});

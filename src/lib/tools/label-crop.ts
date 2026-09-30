/*
  Shipping label cropper: the pure parts. Finding the label on a page from a
  small greyscale render, the crop box maths for the editor, turning a crop
  into PDF coordinates, and laying labels out on the output pages. Nothing
  here touches the DOM, PDF.js or pdf-lib, so it can all be unit tested.

  Crops are kept as fractions of the page as it is shown (0 to 1, from the top
  left), so they do not depend on the preview's resolution and can be copied
  between pages of the same size.
*/

export type Rect = { x: number; y: number; w: number; h: number };

/* Limits stated on the page. */
export const MAX_PAGES = 200;
export const MAX_FILE_MB = 25;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export const MM = 72 / 25.4;
export const MAX_MARGIN_MM = 5;
export const DEFAULT_MARGIN_MM = 2;

/* ---------- Detection ---------- */

export type Detection = { rect: Rect; ink: number };

/* The most common value among the pixels near the edge of the page, in steps of 8. Usually white paper, or the table under a photographed label. */
export function backgroundLevel(lum: Uint8Array, w: number, h: number): number {
  const ring = Math.max(1, Math.round(Math.min(w, h) * 0.02));
  const bins = new Uint32Array(32);
  for (let y = 0; y < h; y++) {
    const edgeRow = y < ring || y >= h - ring;
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x >= ring && x < w - ring) {
        x = w - ring - 1;
        continue;
      }
      bins[lum[y * w + x] >> 3]++;
    }
  }
  let best = 31;
  for (let i = 0; i < 32; i++) if (bins[i] > bins[best]) best = i;
  return best * 8 + 4;
}

/* 1 where a pixel differs clearly from the background. */
export function inkMask(lum: Uint8Array, w: number, h: number, threshold = 56): Uint8Array {
  const bg = backgroundLevel(lum, w, h);
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = Math.abs(lum[i] - bg) > threshold ? 1 : 0;
  return mask;
}

/* Grows every marked pixel into a square of side 2r+1, with running sums so it stays quick on big masks. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  if (r <= 0) return mask.slice();
  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let count = 0;
    const row = y * w;
    for (let x = 0; x < Math.min(r, w); x++) count += mask[row + x];
    for (let x = 0; x < w; x++) {
      if (x + r < w) count += mask[row + x + r];
      if (x - r - 1 >= 0) count -= mask[row + x - r - 1];
      tmp[row + x] = count > 0 ? 1 : 0;
    }
  }
  const out = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) {
    let count = 0;
    for (let y = 0; y < Math.min(r, h); y++) count += tmp[y * w + x];
    for (let y = 0; y < h; y++) {
      if (y + r < h) count += tmp[(y + r) * w + x];
      if (y - r - 1 >= 0) count -= tmp[(y - r - 1) * w + x];
      out[y * w + x] = count > 0 ? 1 : 0;
    }
  }
  return out;
}

type Block = { x0: number; y0: number; x1: number; y1: number; tx0: number; ty0: number; tx1: number; ty1: number; ink: number; area: number };

/*
  Finds the label on a page. The page is a greyscale render (0 black to 255
  white), w by h pixels. Returns the crop as fractions of the page, or null if
  the page is blank.

  How: mark every pixel that differs from the paper, join marks closer than
  about 1% of the page into blocks, merge blocks whose outlines overlap (so a
  label's border and what is inside it become one), then pick the block with
  the most ink, weighted by how solidly it fills its rectangle. A label with a
  barcode is dense and rectangular; instruction text and cut lines are
  sparser, thinner or smaller, so they lose.
*/
export function detectLabel(lum: Uint8Array, w: number, h: number): Detection | null {
  if (w < 4 || h < 4 || lum.length < w * h) return null;
  const mask = inkMask(lum, w, h);
  let total = 0;
  for (let i = 0; i < mask.length; i++) total += mask[i];
  // Fewer marked pixels than 0.02% of the page is dust, not a label.
  if (total < Math.max(4, w * h * 0.0002)) return null;

  const r = Math.max(1, Math.round(Math.max(w, h) * 0.01));
  const grown = dilate(mask, w, h, r);

  // Connected blocks of the grown mask, with the tight box of the ink inside each.
  const labels = new Int32Array(w * h).fill(-1);
  const blocks: Block[] = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (!grown[start] || labels[start] !== -1) continue;
    const id = blocks.length;
    const b: Block = { x0: w, y0: h, x1: -1, y1: -1, tx0: w, ty0: h, tx1: -1, ty1: -1, ink: 0, area: 0 };
    let sp = 0;
    stack[sp++] = start;
    labels[start] = id;
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      b.area++;
      if (x < b.x0) b.x0 = x;
      if (x > b.x1) b.x1 = x;
      if (y < b.y0) b.y0 = y;
      if (y > b.y1) b.y1 = y;
      if (mask[p]) {
        b.ink++;
        if (x < b.tx0) b.tx0 = x;
        if (x > b.tx1) b.tx1 = x;
        if (y < b.ty0) b.ty0 = y;
        if (y > b.ty1) b.ty1 = y;
      }
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && grown[q] && labels[q] === -1) {
          labels[q] = id;
          stack[sp++] = q;
        }
      }
    }
    if (b.ink > 0) blocks.push(b);
  }

  // Merge blocks whose outlines overlap, such as a border and the barcode inside it.
  const minInk = Math.max(2, total * 0.002);
  // At most 500 blocks can each hold 0.2% of the ink, so this stays small.
  const merged = blocks.filter((b) => b.ink >= minInk);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < merged.length; i++) {
      for (let j = i + 1; j < merged.length; j++) {
        const a = merged[i];
        const c = merged[j];
        if (a.x0 <= c.x1 && c.x0 <= a.x1 && a.y0 <= c.y1 && c.y0 <= a.y1) {
          merged[i] = {
            x0: Math.min(a.x0, c.x0),
            y0: Math.min(a.y0, c.y0),
            x1: Math.max(a.x1, c.x1),
            y1: Math.max(a.y1, c.y1),
            tx0: Math.min(a.tx0, c.tx0),
            ty0: Math.min(a.ty0, c.ty0),
            tx1: Math.max(a.tx1, c.tx1),
            ty1: Math.max(a.ty1, c.ty1),
            ink: a.ink + c.ink,
            area: a.area + c.area,
          };
          merged.splice(j, 1);
          j = i;
          changed = true;
        }
      }
    }
  }
  if (merged.length === 0) return null;

  // Score: ink, weighted by how solidly the grown block fills its box (rectangular blocks win) and by ink density.
  let best: Block | null = null;
  let bestScore = -1;
  for (const b of merged) {
    const box = (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
    const fill = Math.min(1, b.area / box);
    const tight = (b.tx1 - b.tx0 + 1) * (b.ty1 - b.ty0 + 1);
    const density = b.ink / tight;
    // A long thin rule (a cut line) is never the label.
    const thin = Math.min(b.tx1 - b.tx0 + 1, b.ty1 - b.ty0 + 1) <= Math.max(2, r);
    const score = thin ? 0 : b.ink * fill * Math.sqrt(density);
    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  }
  if (!best || bestScore <= 0) return null;
  let chosen: Block = best;

  /*
    A label with no border can come apart into blocks (address, code,
    barcode) with big gaps between them. Unless the chosen block has a frame
    round it, add blocks stacked in the same column within about 10%
    of the page, nearest first. Only above and below: instructions beside
    the label are in another column, so they stay out.
  */
  if (!framed(mask, w, chosen)) {
    const gap = Math.max(w, h) * 0.1;
    const tolX = w * 0.03;
    const rest = merged.filter((b) => b !== chosen && Math.min(b.tx1 - b.tx0 + 1, b.ty1 - b.ty0 + 1) > Math.max(2, r));
    for (let grew = true; grew; ) {
      grew = false;
      let pick = -1;
      let pickGap = Infinity;
      rest.forEach((c, i) => {
        const inColumn = c.tx0 >= chosen.tx0 - tolX && c.tx1 <= chosen.tx1 + tolX;
        const g = inColumn ? Math.max(c.ty0 - chosen.ty1, chosen.ty0 - c.ty1) : Infinity;
        if (g <= gap && g < pickGap) {
          pick = i;
          pickGap = g;
        }
      });
      if (pick >= 0) {
        const c = rest.splice(pick, 1)[0];
        chosen = { ...chosen, tx0: Math.min(chosen.tx0, c.tx0), ty0: Math.min(chosen.ty0, c.ty0), tx1: Math.max(chosen.tx1, c.tx1), ty1: Math.max(chosen.ty1, c.ty1), ink: chosen.ink + c.ink };
        grew = true;
      }
    }
  }

  return {
    rect: { x: chosen.tx0 / w, y: chosen.ty0 / h, w: (chosen.tx1 - chosen.tx0 + 1) / w, h: (chosen.ty1 - chosen.ty0 + 1) / h },
    ink: chosen.ink / total,
  };
}

/* True when a block's ink box has a line along most of each of its four edges, like a label's printed border. */
function framed(mask: Uint8Array, w: number, b: Block): boolean {
  const across = (y: number) => {
    let n = 0;
    for (let x = b.tx0; x <= b.tx1; x++) n += mask[y * w + x] | mask[Math.min(b.ty1, y + 1) * w + x] | mask[Math.max(b.ty0, y - 1) * w + x];
    return n / (b.tx1 - b.tx0 + 1);
  };
  const down = (x: number) => {
    let n = 0;
    for (let y = b.ty0; y <= b.ty1; y++) n += mask[y * w + x] | mask[y * w + Math.min(b.tx1, x + 1)] | mask[y * w + Math.max(b.tx0, x - 1)];
    return n / (b.ty1 - b.ty0 + 1);
  };
  return across(b.ty0) > 0.8 && across(b.ty1) > 0.8 && down(b.tx0) > 0.8 && down(b.tx1) > 0.8;
}

/* Greyscale from RGBA canvas pixels, shrunk by a whole factor (averaging each square) so detection works on a small image. Transparent pixels count as white paper. */
export function luminance(rgba: Uint8ClampedArray, w: number, h: number, factor = 1): { lum: Uint8Array; w: number; h: number } {
  const f = Math.max(1, Math.floor(factor));
  const ow = Math.max(1, Math.floor(w / f));
  const oh = Math.max(1, Math.floor(h / f));
  const lum = new Uint8Array(ow * oh);
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      let sum = 0;
      for (let dy = 0; dy < f; dy++) {
        for (let dx = 0; dx < f; dx++) {
          const i = ((oy * f + dy) * w + ox * f + dx) * 4;
          const a = rgba[i + 3] / 255;
          const l = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
          sum += l * a + 255 * (1 - a);
        }
      }
      lum[oy * ow + ox] = Math.round(sum / (f * f));
    }
  }
  return { lum, w: ow, h: oh };
}

/* ---------- Crop box maths ---------- */

export const FULL: Rect = { x: 0, y: 0, w: 1, h: 1 };
export const MIN_SIDE = 0.03;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/* Keeps a crop inside the page and at least MIN_SIDE on each side. */
export function clampRect(r: Rect): Rect {
  const w = clamp(r.w, MIN_SIDE, 1);
  const h = clamp(r.h, MIN_SIDE, 1);
  return { x: clamp(r.x, 0, 1 - w), y: clamp(r.y, 0, 1 - h), w, h };
}

/* Adds space around a crop, as fractions of the page across and down, without leaving the page. */
export function padRect(r: Rect, padX: number, padY: number): Rect {
  const x0 = clamp(r.x - padX, 0, 1);
  const y0 = clamp(r.y - padY, 0, 1);
  const x1 = clamp(r.x + r.w + padX, 0, 1);
  const y1 = clamp(r.y + r.h + padY, 0, 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function moveRect(r: Rect, dx: number, dy: number): Rect {
  return { ...r, x: clamp(r.x + dx, 0, 1 - r.w), y: clamp(r.y + dy, 0, 1 - r.h) };
}

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

/* Drags one corner or edge of the crop by dx, dy, keeping the opposite side still. */
export function resizeRect(r: Rect, handle: Handle, dx: number, dy: number): Rect {
  let x0 = r.x;
  let y0 = r.y;
  let x1 = r.x + r.w;
  let y1 = r.y + r.h;
  if (handle.includes("w")) x0 = clamp(x0 + dx, 0, x1 - MIN_SIDE);
  if (handle.includes("e")) x1 = clamp(x1 + dx, x0 + MIN_SIDE, 1);
  if (handle.includes("n")) y0 = clamp(y0 + dy, 0, y1 - MIN_SIDE);
  if (handle.includes("s")) y1 = clamp(y1 + dy, y0 + MIN_SIDE, 1);
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* Quick crops for when detection misses. Plain page areas, not a claim about any carrier's layout. */
export const QUICK_CROPS: { id: string; label: string; rect: Rect }[] = [
  { id: "whole", label: "Whole page", rect: FULL },
  { id: "top", label: "Top half", rect: { x: 0, y: 0, w: 1, h: 0.5 } },
  { id: "bottom", label: "Bottom half", rect: { x: 0, y: 0.5, w: 1, h: 0.5 } },
  { id: "left", label: "Left half", rect: { x: 0, y: 0, w: 0.5, h: 1 } },
  { id: "right", label: "Right half", rect: { x: 0.5, y: 0, w: 0.5, h: 1 } },
];

/* Pages "have the same size" when their shown sizes match to the nearest point (or pixel, for pictures). */
export function sizeKey(kind: "pdf" | "image", w: number, h: number): string {
  return `${kind}:${Math.round(w)}x${Math.round(h)}`;
}

/* ---------- PDF coordinates ---------- */

export type Box = { left: number; bottom: number; right: number; top: number };

/*
  Turns a crop, as fractions of the page as shown, into PDF user space
  coordinates for pdf-lib's embedPage. view is the page's visible box
  [x0, y0, x1, y1] and rotate its /Rotate value (clockwise, a multiple of 90).
*/
export function cropToPdfBox(crop: Rect, view: [number, number, number, number], rotate: number): Box {
  const [x0, y0, x1, y1] = view;
  const vw = x1 - x0;
  const vh = y1 - y0;
  const rot = (((rotate % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const toUser = (dx: number, dy: number): [number, number] => {
    switch (rot) {
      case 90:
        return [x0 + dy * vw, y0 + dx * vh];
      case 180:
        return [x1 - dx * vw, y0 + dy * vh];
      case 270:
        return [x1 - dy * vw, y1 - dx * vh];
      default:
        return [x0 + dx * vw, y1 - dy * vh];
    }
  };
  const [ax, ay] = toUser(crop.x, crop.y);
  const [bx, by] = toUser(crop.x + crop.w, crop.y + crop.h);
  return { left: Math.min(ax, bx), bottom: Math.min(ay, by), right: Math.max(ax, bx), top: Math.max(ay, by) };
}

/* The page's size as shown (after /Rotate), in points. */
export function shownSize(view: [number, number, number, number], rotate: number): { w: number; h: number } {
  const vw = view[2] - view[0];
  const vh = view[3] - view[1];
  return Math.abs(rotate) % 180 === 90 ? { w: vh, h: vw } : { w: vw, h: vh };
}

/* ---------- Output layout ---------- */

export type OutputSizeId = "4x6" | "a6" | "100x150" | "a4-2" | "a4-4";
export type Slot = { x: number; y: number; w: number; h: number };
export type OutputSize = { id: OutputSizeId; label: string; short: string; pageW: number; pageH: number; slots: Slot[] };

const A4W = 210 * MM;
const A4H = 297 * MM;

function page(w: number, h: number): Slot[] {
  return [{ x: 0, y: 0, w, h }];
}

/* PDF points, origin bottom left. Slots are filled in reading order: top first, then left to right. */
export const OUTPUT_SIZES: OutputSize[] = [
  { id: "4x6", label: "4 x 6 inch (101.6 x 152.4 mm), thermal", short: "4x6", pageW: 288, pageH: 432, slots: page(288, 432) },
  { id: "a6", label: "A6 (105 x 148 mm)", short: "a6", pageW: 105 * MM, pageH: 148 * MM, slots: page(105 * MM, 148 * MM) },
  { id: "100x150", label: "100 x 150 mm", short: "100x150", pageW: 100 * MM, pageH: 150 * MM, slots: page(100 * MM, 150 * MM) },
  {
    id: "a4-2",
    label: "A4, 2 labels a sheet",
    short: "a4-2-up",
    pageW: A4W,
    pageH: A4H,
    slots: [
      { x: 0, y: A4H / 2, w: A4W, h: A4H / 2 },
      { x: 0, y: 0, w: A4W, h: A4H / 2 },
    ],
  },
  {
    id: "a4-4",
    label: "A4, 4 labels a sheet",
    short: "a4-4-up",
    pageW: A4W,
    pageH: A4H,
    slots: [
      { x: 0, y: A4H / 2, w: A4W / 2, h: A4H / 2 },
      { x: A4W / 2, y: A4H / 2, w: A4W / 2, h: A4H / 2 },
      { x: 0, y: 0, w: A4W / 2, h: A4H / 2 },
      { x: A4W / 2, y: 0, w: A4W / 2, h: A4H / 2 },
    ],
  },
];

export function outputSize(id: string): OutputSize {
  return OUTPUT_SIZES.find((s) => s.id === id) ?? OUTPUT_SIZES[0];
}

/* Which sheet and slot each label goes in. */
export function slotFor(index: number, size: OutputSize): { sheet: number; slot: Slot } {
  const n = size.slots.length;
  return { sheet: Math.floor(index / n), slot: size.slots[index % n] };
}

export function sheetCount(labels: number, size: OutputSize): number {
  return Math.ceil(labels / size.slots.length);
}

export type Fit = { turn: 0 | 90; scale: number; box: Slot };

/*
  Fits a label of w by h (as shown) into a slot with a margin on every side,
  centred. The label is turned a quarter anticlockwise when that makes it
  bigger, so a landscape label fills a portrait page.
*/
export function fitLabel(w: number, h: number, slot: Slot, margin: number): Fit {
  const sw = Math.max(1, slot.w - 2 * margin);
  const sh = Math.max(1, slot.h - 2 * margin);
  const straight = Math.min(sw / w, sh / h);
  const turned = Math.min(sw / h, sh / w);
  const turn: 0 | 90 = turned > straight * 1.0001 ? 90 : 0;
  const scale = turn ? turned : straight;
  const bw = (turn ? h : w) * scale;
  const bh = (turn ? w : h) * scale;
  return { turn, scale, box: { x: slot.x + (slot.w - bw) / 2, y: slot.y + (slot.h - bh) / 2, w: bw, h: bh } };
}

/*
  Where to put an object of rawW by rawH (before any turning) for pdf-lib's
  drawPage or drawImage, which turn it anticlockwise by `ccw` degrees about
  the (x, y) given, so that it lands exactly in box at the given scale.
*/
export function placement(rawW: number, rawH: number, ccw: number, scale: number, box: Slot): { x: number; y: number; scale: number; ccw: number } {
  const t = (((ccw % 360) + 360) % 360) as 0 | 90 | 180 | 270;
  const W = rawW * scale;
  const H = rawH * scale;
  switch (t) {
    case 90:
      return { x: box.x + H, y: box.y, scale, ccw: t };
    case 180:
      return { x: box.x + W, y: box.y + H, scale, ccw: t };
    case 270:
      return { x: box.x, y: box.y + W, scale, ccw: t };
    default:
      return { x: box.x, y: box.y, scale, ccw: 0 };
  }
}

/*
  The whole layout for one label from a PDF page: the crop in PDF space, how
  much to turn it (undoing the page's /Rotate as well as fitting), and where
  it goes.
*/
export function layoutPdfLabel(crop: Rect, view: [number, number, number, number], rotate: number, slot: Slot, margin: number) {
  const box = cropToPdfBox(crop, view, rotate);
  const rawW = box.right - box.left;
  const rawH = box.top - box.bottom;
  const quarter = Math.abs(rotate) % 180 === 90;
  const fit = fitLabel(quarter ? rawH : rawW, quarter ? rawW : rawH, slot, margin);
  const ccw = (360 - (((rotate % 360) + 360) % 360) + fit.turn) % 360;
  return { box, fit, place: placement(rawW, rawH, ccw, fit.scale, fit.box) };
}

/* labels-4x6-2026-09-30.pdf, in local time. */
export function outputName(size: OutputSize, when: Date, ext: "pdf" | "zip"): string {
  const d = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  return `labels-${size.short}-${d}.${ext}`;
}

/* Accepted inputs. HEIC photos from iPhones are not readable by most browsers, so they get a clear message instead. */
export function fileKind(file: { name: string; type: string }): "pdf" | "image" | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (["image/png", "image/jpeg", "image/webp"].includes(file.type) || /\.(png|jpe?g|webp)$/.test(name)) return "image";
  return null;
}

export function describeCrop(crop: Rect, pageW: number, pageH: number, unit: "pt" | "px"): string {
  if (unit === "pt") return `${Math.round((crop.w * pageW) / MM)} by ${Math.round((crop.h * pageH) / MM)} mm`;
  return `${Math.round(crop.w * pageW)} by ${Math.round(crop.h * pageH)} pixels`;
}

/*
  Pure maths and settings for the in-browser background remover
  (/tools/background-remover). Nothing here touches the DOM, so it can be
  unit tested. Mask maths is in mask-ops.ts, colour and shadow in
  photo-ops.ts, the zip writer in zip.ts.

  Model: U-2-Net small ("u2netp"), ONNX export published by the rembg project.
    Weights and architecture: https://github.com/xuebinqin/U-2-Net (Apache License 2.0)
    ONNX file: https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx
      (rembg is MIT licensed; the file's MD5 8e83ca70e441ab06c318d82300c84806 matches
      the hash rembg pins in rembg/sessions/u2netp.py)
    Served from public/models/u2netp/u2netp.onnx, 4,574,861 bytes,
    SHA-256 309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8.
    Licence text: public/models/u2netp/LICENSE.txt.
  Runtime: onnxruntime-web 1.30.0 (MIT, https://github.com/microsoft/onnxruntime),
    the WASM build and the WebGPU build, copied into
    public/vendor/onnxruntime-web/<version>/ by `npm run tools:ort`.
    Licence text: public/vendor/onnxruntime-web/LICENSE.txt.
  Both are served by this site, so no photo-related request goes anywhere else.

  A larger "high quality" model was tried and not shipped: see the report in
  the pull request. The official ONNX files of permissively licensed
  alternatives (ISNet, BiRefNet) are 176 MB or more.
*/

export const ORT_VERSION = "1.30.0";
export const ORT_BASE = `/vendor/onnxruntime-web/${ORT_VERSION}/`;
export const MODEL_URL = "/models/u2netp/u2netp.onnx";
export const MODEL_SHA256 = "309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8";
export const MODEL_BYTES = 4_574_861;
/*
  Largest first download, uncompressed: the model plus the WebGPU runtime
  (26.8 MB). Browsers without WebGPU get the 14.2 MB WASM runtime instead.
  Most hosts compress the runtime to about a quarter of that.
*/
export const DOWNLOAD_MB = 32;
export const WORKER_URL = "/workers/background-remover.mjs";

/* u2netp takes a 320 by 320 RGB image. */
export const MODEL_SIZE = 320;
export const MAX_FILES = 500;
export const MAX_FILE_BYTES = 40 * 1024 * 1024;
/* Photos are decoded at no more than this longest side, to keep memory in check. */
export const MAX_DECODE_SIDE = 3000;
/* The mask is worked on (cleaned, refined, touched up) at this longest side. */
export const EDIT_SIDE = 1280;
/* Longest side of the download when the size is left on automatic. */
export const MAX_OUTPUT_SIDE = 2000;
/* Zip downloads are split into parts of about this size. */
export const ZIP_PART_BYTES = 200 * 1024 * 1024;
/* Small batches redo finished photos as soon as settings change; bigger ones wait for a click. */
export const AUTO_APPLY_LIMIT = 12;

export type Background = "white" | "grey" | "transparent";
export type Aspect = "1:1" | "4:5";
export const OUTPUT_SIDES = [0, 1080, 1600, 2000] as const;
export type OutputSide = (typeof OUTPUT_SIDES)[number];

/* Output pixel colours (these are image colours, not interface colours). */
export const BACKGROUND_FILL: Record<Exclude<Background, "transparent">, string> = {
  white: "rgb(255, 255, 255)",
  grey: "rgb(242, 242, 242)",
};
export const SHADOW_COLOUR = (alpha: number) => `rgba(0, 0, 0, ${alpha.toFixed(3)})`;

export type Settings = {
  background: Background;
  aspect: Aspect;
  /* Space around the item, per cent of the canvas on each side. */
  padding: number;
  /* Edge softness, 0 to 100. */
  softness: number;
  /* Longest side in pixels, or 0 for automatic (the photo's own size, up to MAX_OUTPUT_SIDE). */
  outputSide: OutputSide;
  cleanup: boolean;
  refine: boolean;
  shadow: boolean;
  shadowStrength: number;
  enhance: boolean;
  /* The preset last picked, if the settings still match it. */
  preset: PresetId | null;
};

export const DEFAULT_SETTINGS: Settings = {
  background: "white",
  aspect: "1:1",
  padding: 8,
  softness: 20,
  outputSide: 0,
  cleanup: true,
  refine: true,
  shadow: false,
  shadowStrength: 50,
  enhance: false,
  preset: null,
};

export type PresetId = "ebay" | "vinted" | "depop" | "etsy";
export type Preset = {
  id: PresetId;
  label: string;
  aspect: Aspect;
  outputSide: OutputSide;
  background: Background;
  /* What the platform publishes, with the page it is from, or null when the preset is our own choice. */
  source: { url: string; says: string } | null;
};

/*
  Only sizes a platform publishes on its own help pages are used as theirs.
  Checked September 2026.
*/
export const PRESETS: Preset[] = [
  {
    id: "ebay",
    label: "eBay",
    aspect: "1:1",
    outputSide: 1600,
    background: "white",
    source: {
      url: "https://www.ebay.co.uk/help/selling/listings/adding-pictures-listings?id=4148",
      says: "eBay recommends images of about 1600 by 1600 pixels, says 1:1 photos look best, and that white backgrounds are generally best.",
    },
  },
  {
    id: "etsy",
    label: "Etsy",
    aspect: "1:1",
    outputSide: 2000,
    background: "white",
    source: {
      url: "https://help.etsy.com/hc/en-gb/articles/115015663347",
      says: "Etsy recommends listing photos at least 2000 pixels wide and high. The square shape and white background are our choice.",
    },
  },
  { id: "vinted", label: "Vinted", aspect: "4:5", outputSide: 1600, background: "white", source: null },
  { id: "depop", label: "Depop", aspect: "1:1", outputSide: 1600, background: "white", source: null },
];

export function applyPreset(s: Settings, id: PresetId): Settings {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return s;
  return { ...s, aspect: p.aspect, outputSide: p.outputSide, background: p.background, preset: id };
}

/* The preset still matches if its three settings have not been changed since. */
export function matchingPreset(s: Settings): PresetId | null {
  const p = PRESETS.find((x) => x.id === s.preset);
  return p && p.aspect === s.aspect && p.outputSide === s.outputSide && p.background === s.background ? p.id : null;
}

/* Settings read back from browser storage, checked field by field, falling back to defaults. */
export function parseSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(raw);
    if (!v || typeof v !== "object") return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
  const num = (x: unknown, lo: number, hi: number, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= lo && x <= hi ? x : d);
  const bool = (x: unknown, d: boolean) => (typeof x === "boolean" ? x : d);
  const d = DEFAULT_SETTINGS;
  const s: Settings = {
    background: v.background === "grey" || v.background === "transparent" || v.background === "white" ? v.background : d.background,
    aspect: v.aspect === "4:5" || v.aspect === "1:1" ? v.aspect : d.aspect,
    padding: num(v.padding, 0, 25, d.padding),
    softness: num(v.softness, 0, 100, d.softness),
    outputSide: (OUTPUT_SIDES as readonly number[]).includes(v.outputSide as number) ? (v.outputSide as OutputSide) : d.outputSide,
    cleanup: bool(v.cleanup, d.cleanup),
    refine: bool(v.refine, d.refine),
    shadow: bool(v.shadow, d.shadow),
    shadowStrength: num(v.shadowStrength, 0, 100, d.shadowStrength),
    enhance: bool(v.enhance, d.enhance),
    preset: PRESETS.some((p) => p.id === v.preset) ? (v.preset as PresetId) : null,
  };
  return { ...s, preset: matchingPreset(s) };
}

/* A stable key for the settings that change the output (the preset label does not). */
export function settingsKey(s: Settings): string {
  const { preset: _preset, ...rest } = s;
  void _preset;
  return JSON.stringify(rest);
}

export type Box = { x: number; y: number; w: number; h: number };

/* ImageNet mean and standard deviation, as rembg uses for u2netp. */
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

/*
  RGBA pixels (already resized to size by size) to the model's input tensor:
  planar RGB, float32, shape [1, 3, size, size]. Like rembg, pixels are divided
  by the brightest channel value in the image before normalising.
*/
export function toModelInput(rgba: ArrayLike<number>, size = MODEL_SIZE): Float32Array {
  const n = size * size;
  let max = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (rgba[o] > max) max = rgba[o];
    if (rgba[o + 1] > max) max = rgba[o + 1];
    if (rgba[o + 2] > max) max = rgba[o + 2];
  }
  const div = max || 1;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    for (let c = 0; c < 3; c++) out[c * n + i] = (rgba[o + c] / div - MEAN[c]) / STD[c];
  }
  return out;
}

/* The model's raw prediction, stretched to 0..1 (min-max), as rembg does. */
export function normalisePrediction(pred: ArrayLike<number>): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pred.length; i++) {
    if (pred[i] < min) min = pred[i];
    if (pred[i] > max) max = pred[i];
  }
  const range = max - min || 1;
  const out = new Float32Array(pred.length);
  for (let i = 0; i < pred.length; i++) out[i] = (pred[i] - min) / range;
  return out;
}

/* A 0..1 mask stored in a quarter of the memory, for keeping one per photo in a big batch. */
export function toBytes(mask: ArrayLike<number>): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.round(Math.min(1, Math.max(0, mask[i])) * 255);
  return out;
}

/*
  Edge softness, 0 to 100. At 0 the mask is close to a hard cut at 0.5; higher
  values widen the ramp between background and item so edges fade out.
*/
export function softnessWidth(softness: number): number {
  const s = Math.min(100, Math.max(0, softness)) / 100;
  return 0.04 + s * 0.96;
}

export function applySoftness(value: number, softness: number): number {
  const w = softnessWidth(softness);
  const t = Math.min(1, Math.max(0, (value - (0.5 - w / 2)) / w));
  return t * t * (3 - 2 * t);
}

/* Blur radius in output pixels used when the mask is scaled up to the output. 0 at no softness. */
export function featherRadius(softness: number, longSide: number): number {
  const s = Math.min(100, Math.max(0, softness)) / 100;
  return Math.round(s * 2.5 * Math.max(1, longSide / 1000) * 10) / 10;
}

/* The 0..1 mask as 8-bit alpha, softness applied. */
export function maskToAlpha(mask: ArrayLike<number>, softness: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < mask.length; i++) out[i] = Math.round(applySoftness(mask[i], softness) * 255);
  return out;
}

/* Tight box around values at or above threshold, or null if there are none. */
export function boundingBox(alpha: ArrayLike<number>, w: number, h: number, threshold = 128): Box | null {
  let x0 = w;
  let y0 = h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (alpha[y * w + x] >= threshold) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* A box found on one size of image, in another size's pixels (rounded outwards, clamped). */
export function scaleBox(box: Box, from: { w: number; h: number }, to: { w: number; h: number }): Box {
  const sx = to.w / from.w;
  const sy = to.h / from.h;
  const x = Math.max(0, Math.floor(box.x * sx));
  const y = Math.max(0, Math.floor(box.y * sy));
  const r = Math.min(to.w, Math.ceil((box.x + box.w) * sx));
  const b = Math.min(to.h, Math.ceil((box.y + box.h) * sy));
  return { x, y, w: r - x, h: b - y };
}

/* Grow a box by margin pixels on every side, staying inside the image. Keeps soft edges from being clipped. */
export function expandBox(box: Box, margin: number, bounds: { w: number; h: number }): Box {
  const m = Math.max(0, Math.round(margin));
  const x = Math.max(0, box.x - m);
  const y = Math.max(0, box.y - m);
  const r = Math.min(bounds.w, box.x + box.w + m);
  const b = Math.min(bounds.h, box.y + box.h + m);
  return { x, y, w: r - x, h: b - y };
}

/* Size to work at: the photo, scaled down so its longest side is at most max. */
export function fitWithin(w: number, h: number, max: number): { w: number; h: number } {
  const long = Math.max(w, h);
  if (long <= max) return { w, h };
  const s = max / long;
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

export function aspectRatio(aspect: Aspect): { w: number; h: number } {
  return aspect === "4:5" ? { w: 4, h: 5 } : { w: 1, h: 1 };
}

export type Layout = {
  /* Output canvas size. */
  width: number;
  height: number;
  /* Where the item's box is drawn on the output. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /* Output pixels per box pixel. */
  scale: number;
};

/*
  Output canvas and placement for an item box. padding is the share of the
  canvas (0 to 0.4) kept clear on each side; the item is scaled to fill the
  rest in its tighter direction and centred.
  With outputSide 0 (automatic) the item keeps its own pixels (never
  enlarged) and the canvas is capped at maxSide. With a fixed outputSide the
  canvas's longest side is exactly that, and the item is scaled to fit.
*/
export function layout(box: { w: number; h: number }, aspect: Aspect, padding: number, outputSide = 0, maxSide = MAX_OUTPUT_SIDE): Layout {
  const pad = Math.min(0.4, Math.max(0, padding));
  const inner = 1 - 2 * pad;
  const r = aspectRatio(aspect);
  let width: number;
  let height: number;
  let scale: number;
  if (outputSide > 0) {
    // Longest side of the canvas is outputSide.
    width = r.w >= r.h ? outputSide : Math.round((outputSide * r.w) / r.h);
    height = r.h >= r.w ? outputSide : Math.round((outputSide * r.h) / r.w);
    scale = Math.min((width * inner) / box.w, (height * inner) / box.h);
  } else {
    // Smallest canvas (at the item's own scale) whose inner area holds the box.
    let w = Math.max(box.w / inner, ((box.h / inner) * r.w) / r.h);
    let h = (w * r.h) / r.w;
    scale = 1;
    const long = Math.max(w, h);
    if (long > maxSide) {
      scale = maxSide / long;
      w *= scale;
      h *= scale;
    }
    width = Math.max(1, Math.round(w));
    height = Math.max(1, Math.round((width * r.h) / r.w));
  }
  const dw = box.w * scale;
  const dh = box.h * scale;
  return { width, height, dx: (width - dw) / 2, dy: (height - dh) / 2, dw, dh, scale };
}

/*
  How a photo maps onto the output: out = photo * scale + offset. Used to draw
  the "before" picture in exactly the same place as the result.
*/
export type Placement = { scale: number; offsetX: number; offsetY: number; width: number; height: number };

export function placementFor(box: Box, l: Layout): Placement {
  return { scale: l.scale, offsetX: l.dx - box.x * l.scale, offsetY: l.dy - box.y * l.scale, width: l.width, height: l.height };
}

export function outputType(background: Background): { mime: "image/png" | "image/jpeg"; ext: "png" | "jpg" } {
  return background === "transparent" ? { mime: "image/png", ext: "png" } : { mime: "image/jpeg", ext: "jpg" };
}

/* "Red jumper.HEIC" becomes "Red jumper-no-background.jpg". Folders in the name are dropped. */
export function outputName(original: string, background: Background): string {
  const file = original.split(/[\\/]/).pop() ?? "";
  const base = file.replace(/\.[^.]+$/, "").trim() || "photo";
  return `${base}-no-background.${outputType(background).ext}`;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|bmp|heic|heif)$/i;

/* Whether a picked or dropped file looks like a photo (dropped folders often give no type). */
export function isImageFile(f: { name: string; type: string }): boolean {
  return f.type ? f.type.startsWith("image/") : IMAGE_EXT.test(f.name);
}

/* Estimated time left from recent per-photo times (ms), or null until there is enough to go on. */
export function timeLeft(durations: number[], remaining: number): number | null {
  if (durations.length === 0 || remaining <= 0) return remaining <= 0 ? 0 : null;
  const recent = durations.slice(-10);
  return (recent.reduce((a, b) => a + b, 0) / recent.length) * remaining;
}

/* "45 seconds", "3 minutes 20 seconds", "1 hour 5 minutes". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (h) return m ? `${unit(h, "hour")} ${unit(m, "minute")}` : unit(h, "hour");
  if (m) return s ? `${unit(m, "minute")} ${unit(s, "second")}` : unit(m, "minute");
  return unit(s, "second");
}

export function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

/* Plain-English reason for a failure, for the page. */
export function describeError(err: unknown): string {
  const msg = err instanceof Error ? `${err.name} ${err.message}` : String(err);
  if (/memory|RangeError|allocation|OOM/i.test(msg))
    return "Your device ran out of memory. Try fewer photos at once, smaller photos, or close other tabs.";
  if (/decode|InvalidState|source image|EncodingError|could not be opened/i.test(msg))
    return "This photo could not be opened. Save it as a JPEG or PNG and try again.";
  if (/fetch|network|Failed to load|404/i.test(msg))
    return "The background remover could not be downloaded. Check your connection and try again.";
  if (/checksum/i.test(msg)) return "The downloaded model did not match what we expected, so it was not used. Try again later.";
  if (/NotAllowed|permission/i.test(msg)) return "The browser did not allow saving to that folder. Choose the folder again.";
  return "Something went wrong removing the background. Try again, or try a different photo.";
}

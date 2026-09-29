/*
  Browser-side steps of the background remover: decoding photos, preparing
  the model input, building the mask and drawing the result. Uses canvas, so
  it runs in the browser only; the maths it calls is unit tested in
  src/lib/tools. Canvases are emptied as soon as they are finished with, and
  bitmaps are closed by the caller, so a batch of hundreds of photos never
  holds more than one full-size photo at a time.
*/

import {
  BACKGROUND_FILL,
  EDIT_SIDE,
  MAX_DECODE_SIDE,
  MODEL_SIZE,
  SHADOW_COLOUR,
  applySoftness,
  boundingBox,
  expandBox,
  featherRadius,
  fitWithin,
  layout,
  outputType,
  placementFor,
  scaleBox,
  toModelInput,
  type Placement,
  type Settings,
} from "@/lib/tools/background-remover";
import { cleanMask, combineEdit, luminance, refineEdges, refineRadius, resizeBilinear, NEUTRAL } from "@/lib/tools/mask-ops";
import { enhanceFrom, enhanceLut, isNeutral, shadowFor } from "@/lib/tools/photo-ops";
import { crc32 } from "@/lib/tools/zip";

export function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas not available (out of memory)");
  return [c, ctx] as const;
}

/* Free a canvas's pixel memory straight away rather than waiting for garbage collection. */
export function release(...cs: HTMLCanvasElement[]) {
  for (const c of cs) {
    c.width = 0;
    c.height = 0;
  }
}

function toBlob(c: HTMLCanvasElement, mime: string, quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the image (out of memory)"))), mime, quality),
  );
}

/* The photo's size without keeping a decoded copy (the browser decodes an <img> lazily). */
function naturalSize(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/*
  Decodes a photo, scaled down during decoding when it is bigger than
  MAX_DECODE_SIDE so a 48 megapixel phone photo never sits in memory at full
  size. Only the width is given, so the shape is always kept.
*/
export async function decode(file: File): Promise<ImageBitmap> {
  const size = await naturalSize(file);
  try {
    if (size && Math.max(size.w, size.h) > MAX_DECODE_SIDE) {
      const fit = fitWithin(size.w, size.h, MAX_DECODE_SIDE);
      return await createImageBitmap(file, { resizeWidth: fit.w, resizeQuality: "high", imageOrientation: "from-image" });
    }
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new Error("This photo could not be opened");
    }
  }
}

/* Photo to the model's input: stretched to 320 by 320, as the model was trained. */
export function modelInput(bmp: ImageBitmap): Float32Array {
  const [c, ctx] = canvas(MODEL_SIZE, MODEL_SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const data = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
  release(c);
  return toModelInput(data);
}

export type EditData = { w: number; h: number; rgba: Uint8ClampedArray };

/* The photo at the mask's working size (at most EDIT_SIDE on its longest side). */
export function editData(bmp: ImageBitmap): EditData {
  const { w, h } = fitWithin(bmp.width, bmp.height, EDIT_SIDE);
  const [c, ctx] = canvas(w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  const rgba = ctx.getImageData(0, 0, w, h).data;
  release(c);
  return { w, h, rgba };
}

/*
  The automatic mask at the working size: the model's 320px prediction
  (bytes, 0 to 255) scaled up, cleaned, refined against the photo, and
  softened as the settings say. Values 0..1.
*/
export function autoAlpha(photo: EditData, prob: Uint8Array, s: Settings): Float32Array {
  const { w, h } = photo;
  let p = resizeBilinear(prob, MODEL_SIZE, MODEL_SIZE, w, h, 1 / 255);
  if (s.cleanup) p = cleanMask(p, w, h);
  if (s.refine) p = refineEdges(luminance(photo.rgba, w * h), p, w, h, refineRadius(w, h));
  for (let i = 0; i < p.length; i++) p[i] = applySoftness(p[i], s.softness);
  return p;
}

/* The automatic mask with any touch-up applied. */
export function finalAlpha(auto: Float32Array, edits: Uint8Array | undefined): Float32Array {
  if (!edits) return auto;
  const out = new Float32Array(auto.length);
  for (let i = 0; i < auto.length; i++) out[i] = edits[i] === NEUTRAL ? auto[i] : combineEdit(auto[i], edits[i]);
  return out;
}

export type Rendered = {
  blob: Blob;
  crc: number;
  thumb: Blob;
  width: number;
  height: number;
  placement: Placement;
};

/* Draws the cut-out item on the chosen background and crop, and encodes it. */
export async function compose(bmp: ImageBitmap, photo: EditData, alpha: Float32Array, s: Settings): Promise<Rendered> {
  const E = { w: photo.w, h: photo.h };
  const O = { w: bmp.width, h: bmp.height };

  // The mask as a canvas (alpha only), so the browser scales it up smoothly.
  const [mask, mctx] = canvas(E.w, E.h);
  const img = mctx.createImageData(E.w, E.h);
  const bytes = new Uint8ClampedArray(alpha.length);
  for (let i = 0; i < alpha.length; i++) {
    bytes[i] = alpha[i] * 255;
    img.data[i * 4 + 3] = bytes[i];
  }
  mctx.putImageData(img, 0, 0);

  const found = boundingBox(bytes, E.w, E.h, 128);
  const boxE = found ? expandBox(found, 2 + Math.max(E.w, E.h) * 0.01, E) : { x: 0, y: 0, w: E.w, h: E.h };
  const boxO = scaleBox(boxE, E, O);
  const L = layout(boxO, s.aspect, s.padding / 100, s.outputSide);
  const cw = Math.max(1, Math.round(L.dw));
  const ch = Math.max(1, Math.round(L.dh));

  // The item alone, at output size.
  const [cut, cctx] = canvas(cw, ch);
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(bmp, boxO.x, boxO.y, boxO.w, boxO.h, 0, 0, cw, ch);
  cctx.globalCompositeOperation = "destination-in";
  const feather = featherRadius(s.softness, Math.max(L.width, L.height)) * 0.5;
  if (feather > 0 && "filter" in cctx) cctx.filter = `blur(${feather}px)`;
  const fx = E.w / O.w;
  const fy = E.h / O.h;
  cctx.drawImage(mask, boxO.x * fx, boxO.y * fy, boxO.w * fx, boxO.h * fy, 0, 0, cw, ch);
  cctx.filter = "none";
  cctx.globalCompositeOperation = "source-over";
  release(mask);

  if (s.enhance) {
    const e = enhanceFrom(photo.rgba, alpha, E.w * E.h);
    if (!isNeutral(e)) {
      const [lr, lg, lb] = enhanceLut(e);
      const px = cctx.getImageData(0, 0, cw, ch);
      const d = px.data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] === 0) continue;
        d[i] = lr[d[i]];
        d[i + 1] = lg[d[i + 1]];
        d[i + 2] = lb[d[i + 2]];
      }
      cctx.putImageData(px, 0, 0);
    }
  }

  const [out, octx] = canvas(L.width, L.height);
  if (s.background !== "transparent") {
    octx.fillStyle = BACKGROUND_FILL[s.background];
    octx.fillRect(0, 0, L.width, L.height);
  }
  if (s.shadow && s.background !== "transparent" && s.shadowStrength > 0) {
    const sh = shadowFor(L, L.height, s.shadowStrength);
    octx.save();
    octx.translate(sh.cx, sh.cy);
    octx.scale(sh.rx, sh.ry);
    const g = octx.createRadialGradient(0, 0, 0, 0, 0, 1);
    g.addColorStop(0, SHADOW_COLOUR(sh.contactAlpha));
    g.addColorStop(1, SHADOW_COLOUR(0));
    octx.fillStyle = g;
    octx.beginPath();
    octx.arc(0, 0, 1, 0, Math.PI * 2);
    octx.fill();
    octx.restore();
    octx.shadowColor = SHADOW_COLOUR(sh.dropAlpha);
    octx.shadowBlur = sh.blur;
    octx.shadowOffsetY = sh.offsetY;
  }
  octx.drawImage(cut, L.dx, L.dy, L.dw, L.dh);
  octx.shadowColor = "transparent";
  release(cut);

  const blob = await toBlob(out, outputType(s.background).mime);
  const t = fitWithin(L.width, L.height, 240);
  const [th, tctx] = canvas(t.w, t.h);
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(out, 0, 0, t.w, t.h);
  release(out);
  const thumb = await toBlob(th, "image/webp", 0.8);
  release(th);
  const crc = crc32(new Uint8Array(await blob.arrayBuffer()));
  return { blob, crc, thumb, width: L.width, height: L.height, placement: placementFor(boxO, L) };
}

/* The original photo drawn where the result puts the item, for the before and after slider. */
export async function renderBefore(bmp: ImageBitmap, p: Placement, maxSide = 1200): Promise<Blob> {
  const k = Math.min(1, maxSide / Math.max(p.width, p.height));
  const [c, ctx] = canvas(p.width * k, p.height * k);
  ctx.fillStyle = BACKGROUND_FILL.grey;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, p.offsetX * k, p.offsetY * k, bmp.width * p.scale * k, bmp.height * p.scale * k);
  const blob = await toBlob(c, "image/jpeg", 0.85);
  release(c);
  return blob;
}

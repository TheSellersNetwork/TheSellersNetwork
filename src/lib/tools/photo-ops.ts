/*
  Photo maths for the background remover: gentle auto enhance (white balance
  and brightness) and the soft shadow's shape. Pure functions, unit tested.
*/

export type Enhance = { gains: [number, number, number]; brightness: number; reference: "background" | "item" | "none" };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;

/*
  Works out a gentle correction from the photo (RGBA) and its mask (alpha 0..1).
  Most product photos are taken against something meant to be white or grey,
  so the removed background is used as the reference for white: its colour
  cast is taken out and it is lifted towards white. If there is too little
  background, the brightest parts of the item are used for brightness only.
  Corrections are capped so the result stays natural, and never darken.
*/
export function enhanceFrom(rgba: ArrayLike<number>, alpha: ArrayLike<number>, n: number): Enhance {
  // A sample of about 200,000 pixels is plenty.
  const step = Math.max(1, Math.floor(n / 200_000));
  const sampled = Math.ceil(n / step);
  const bg: number[] = [];
  for (let i = 0; i < n; i += step) if (alpha[i] < 0.1) bg.push(i);
  if (bg.length >= sampled * 0.05) {
    // The brighter half of the background, so shadows on the backdrop do not skew it.
    const l = Float32Array.from(bg, (i) => lum(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
    const sorted = l.slice().sort();
    const median = sorted[Math.floor(sorted.length / 2)];
    let r = 0;
    let g = 0;
    let b = 0;
    let c = 0;
    bg.forEach((i, k) => {
      if (l[k] < median) return;
      r += rgba[i * 4];
      g += rgba[i * 4 + 1];
      b += rgba[i * 4 + 2];
      c++;
    });
    r /= c;
    g /= c;
    b /= c;
    const grey = (r + g + b) / 3;
    const gains: [number, number, number] = [clamp(grey / (r || 1), 0.85, 1.18), clamp(grey / (g || 1), 0.85, 1.18), clamp(grey / (b || 1), 0.85, 1.18)];
    const after = lum(r * gains[0], g * gains[1], b * gains[2]);
    return { gains, brightness: clamp(235 / (after || 1), 1, 1.35), reference: "background" };
  }
  const items: number[] = [];
  for (let i = 0; i < n; i += step) if (alpha[i] >= 0.5) items.push(lum(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]));
  if (items.length < 16) return { gains: [1, 1, 1], brightness: 1, reference: "none" };
  const sorted = Float32Array.from(items).sort();
  const high = sorted[Math.floor(sorted.length * 0.98)];
  return { gains: [1, 1, 1], brightness: clamp(245 / (high || 1), 1, 1.25), reference: "item" };
}

/*
  Lookup tables (one per channel, 256 entries) for an enhancement. Values
  are scaled, then eased into the highlights with a soft knee rather than
  clipped hard, so whites do not blow out.
*/
export function enhanceLut(e: Enhance): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const make = (gain: number) => {
    const lut = new Uint8ClampedArray(256);
    const k = gain * e.brightness;
    for (let v = 0; v < 256; v++) {
      let t = (v * k) / 255;
      if (t > 0.8) t = 0.8 + 0.2 * Math.tanh((t - 0.8) / 0.2);
      lut[v] = Math.round(t * 255);
    }
    return lut;
  };
  return [make(e.gains[0]), make(e.gains[1]), make(e.gains[2])];
}

export function isNeutral(e: Enhance): boolean {
  return e.brightness === 1 && e.gains.every((g) => g === 1);
}

export type Shadow = {
  /* Contact shadow: an ellipse under the item. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  contactAlpha: number;
  /* Drop shadow: the item's own outline, blurred and nudged down. */
  blur: number;
  offsetY: number;
  dropAlpha: number;
};

/*
  Where the soft shadow goes for an item drawn at (dx, dy, dw, dh) on a canvas
  of the given height. strength is 0 to 100. The contact shadow sits on the
  item's bottom edge and is kept inside the canvas.
*/
export function shadowFor(place: { dx: number; dy: number; dw: number; dh: number }, canvasHeight: number, strength: number): Shadow {
  const s = clamp(strength, 0, 100) / 100;
  const size = Math.max(place.dw, place.dh);
  const bottom = place.dy + place.dh;
  const ry = Math.max(2, Math.min(place.dw * 0.06, (canvasHeight - bottom) + place.dh * 0.03));
  return {
    cx: place.dx + place.dw / 2,
    cy: Math.min(canvasHeight - ry, bottom - ry * 0.3),
    rx: Math.max(4, place.dw * 0.45),
    ry,
    contactAlpha: 0.45 * s,
    blur: Math.max(2, size * 0.035),
    offsetY: Math.max(1, size * 0.015),
    dropAlpha: 0.3 * s,
  };
}

/*
  Mask maths for the background remover: resizing, clean-up (specks and
  holes), edge refinement with a guided filter, and the touch-up brush.
  Masks are row-major arrays, one value per pixel. Nothing here touches the
  DOM, so it can all be unit tested on small arrays.
*/

/* Bilinear resize of a single-channel image, sampling pixel centres. */
export function resizeBilinear(src: ArrayLike<number>, sw: number, sh: number, dw: number, dh: number, scale = 1): Float32Array {
  const out = new Float32Array(dw * dh);
  const fx = sw / dw;
  const fy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.max(0, (y + 0.5) * fy - 0.5));
    const y0 = Math.floor(sy);
    const y1 = Math.min(sh - 1, y0 + 1);
    const wy = sy - y0;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.max(0, (x + 0.5) * fx - 0.5));
      const x0 = Math.floor(sx);
      const x1 = Math.min(sw - 1, x0 + 1);
      const wx = sx - x0;
      const top = src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx;
      const bottom = src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx;
      out[y * dw + x] = (top * (1 - wy) + bottom * wy) * scale;
    }
  }
  return out;
}

/*
  Labels connected regions of pixels where on[i] is truthy. 8-connected by
  default (diagonal neighbours join), 4-connected when eight is false.
  labels[i] is 0 for off pixels, otherwise 1..n; sizes[k] is the pixel count
  of label k (sizes[0] is unused).
*/
export function labelComponents(on: ArrayLike<number | boolean>, w: number, h: number, eight = true): { labels: Int32Array; sizes: number[]; touchesEdge: boolean[] } {
  const labels = new Int32Array(w * h);
  const sizes = [0];
  const touchesEdge = [false];
  const stack = new Int32Array(w * h);
  let next = 1;
  for (let start = 0; start < w * h; start++) {
    if (!on[start] || labels[start]) continue;
    const label = next++;
    let size = 0;
    let edge = false;
    let top = 0;
    stack[top++] = start;
    labels[start] = label;
    while (top > 0) {
      const i = stack[--top];
      size++;
      const x = i % w;
      const y = (i - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (!eight && dx !== 0 && dy !== 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (on[j] && !labels[j]) {
            labels[j] = label;
            stack[top++] = j;
          }
        }
      }
    }
    sizes.push(size);
    touchesEdge.push(edge);
  }
  return { labels, sizes, touchesEdge };
}

export type CleanOptions = {
  /* Keep a separate piece only if it is at least this share of the biggest piece. */
  minPieceShare: number;
  /* Fill an enclosed gap only if it is at most this share of the item's area. */
  maxHoleShare: number;
};

export const CLEAN_DEFAULTS: CleanOptions = { minPieceShare: 0.02, maxHoleShare: 0.005 };

/*
  Removes small specks and fills small holes in a 0..1 mask, returning a new
  mask. Pixels at or above 0.5 count as the item. Specks become 0 and holes
  become 1; everything else keeps its soft value. Holes that are large (the
  inside of a mug handle, the gap in a pair of scissors) are left alone.
*/
export function cleanMask(mask: ArrayLike<number>, w: number, h: number, opts: CleanOptions = CLEAN_DEFAULTS): Float32Array {
  const n = w * h;
  const out = Float32Array.from(mask as ArrayLike<number>);
  const on = new Uint8Array(n);
  for (let i = 0; i < n; i++) on[i] = mask[i] >= 0.5 ? 1 : 0;

  const fg = labelComponents(on, w, h, true);
  let largest = 0;
  for (let k = 1; k < fg.sizes.length; k++) largest = Math.max(largest, fg.sizes[k]);
  if (largest === 0) return out;
  const keep = fg.sizes.map((s, k) => k > 0 && s >= largest * opts.minPieceShare);
  let area = 0;
  for (let i = 0; i < n; i++) {
    const k = fg.labels[i];
    if (k && !keep[k]) {
      out[i] = 0;
      on[i] = 0;
    } else if (k) area++;
  }

  // Holes: background regions (4-connected, so a diagonal gap in the outline still leaks) that do not reach the edge.
  const off = new Uint8Array(n);
  for (let i = 0; i < n; i++) off[i] = on[i] ? 0 : 1;
  const bg = labelComponents(off, w, h, false);
  const fill = bg.sizes.map((s, k) => k > 0 && !bg.touchesEdge[k] && s <= area * opts.maxHoleShare);
  for (let i = 0; i < n; i++) if (fill[bg.labels[i]]) out[i] = 1;
  return out;
}

/* Mean over a (2r+1) square window, clamped at the edges, in O(n) with running sums. */
export function boxMean(src: ArrayLike<number>, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  // Horizontal pass.
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -r; x <= r; x++) sum += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum;
      sum += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  // Vertical pass.
  const d = (2 * r + 1) * (2 * r + 1);
  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -r; y <= r; y++) sum += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / d;
      sum += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/*
  Guided filter (He, Sun and Tang): smooths p while following the edges in
  the guide image I (brightness, 0..1), so a blocky or blurry mask snaps to
  the item's real outline. Only the band near the mask's edge is changed;
  solid item and clear background keep their values.
*/
export function refineEdges(guide: ArrayLike<number>, p: ArrayLike<number>, w: number, h: number, r: number, eps = 1e-3): Float32Array {
  const n = w * h;
  const Ip = new Float32Array(n);
  const II = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    Ip[i] = guide[i] * p[i];
    II[i] = guide[i] * guide[i];
  }
  const mI = boxMean(guide, w, h, r);
  const mP = boxMean(p, w, h, r);
  const mIp = boxMean(Ip, w, h, r);
  const mII = boxMean(II, w, h, r);
  const a = Ip; // reuse buffers
  const b = II;
  for (let i = 0; i < n; i++) {
    const cov = mIp[i] - mI[i] * mP[i];
    const v = mII[i] - mI[i] * mI[i];
    a[i] = cov / (v + eps);
    b[i] = mP[i] - a[i] * mI[i];
  }
  const mA = boxMean(a, w, h, r);
  const mB = boxMean(b, w, h, r);
  // The band: pixels within r of the 0.5 boundary.
  const hard = new Float32Array(n);
  for (let i = 0; i < n; i++) hard[i] = p[i] >= 0.5 ? 1 : 0;
  const near = boxMean(hard, w, h, r);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    if (near[i] > 0.001 && near[i] < 0.999) {
      const q = mA[i] * guide[i] + mB[i];
      out[i] = q < 0 ? 0 : q > 1 ? 1 : q;
    } else out[i] = p[i];
  }
  return out;
}

/* Brightness (0..1) from RGBA pixels, for the guided filter. */
export function luminance(rgba: ArrayLike<number>, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
  return out;
}

/* Radius for the guided filter at a given mask size. */
export function refineRadius(w: number, h: number): number {
  return Math.max(2, Math.round(Math.max(w, h) / 200));
}

/* ---------- Touch-up brush ---------- */

/*
  The touch-up layer is one byte per mask pixel. 128 means no change, 0 means
  fully erased, 255 means fully restored. Values in between blend, so soft
  brushes leave soft edges.
*/
export const NEUTRAL = 128;

export function newEditLayer(n: number): Uint8Array {
  return new Uint8Array(n).fill(NEUTRAL);
}

/* The final alpha (0..1) from the automatic alpha and the touch-up value. */
export function combineEdit(auto: number, edit: number): number {
  if (edit === NEUTRAL) return auto;
  if (edit < NEUTRAL) return auto * (edit / NEUTRAL);
  return auto + (1 - auto) * ((edit - NEUTRAL) / (255 - NEUTRAL));
}

export type Rect = { x: number; y: number; w: number; h: number };

/* Brush strength at distance d from the centre: full inside the hard core, fading to 0 at the radius. */
export function brushFalloff(d: number, radius: number, hardness: number): number {
  if (d >= radius) return 0;
  const core = radius * Math.min(1, Math.max(0, hardness));
  if (d <= core) return 1;
  const t = (d - core) / (radius - core);
  return 1 - t * t * (3 - 2 * t);
}

/*
  One dab of the brush at (cx, cy) in mask pixels. Erase moves values towards
  0, restore towards 255. Returns the changed rectangle, or null if the dab
  was off the mask.
*/
export function stamp(layer: Uint8Array, w: number, h: number, cx: number, cy: number, radius: number, hardness: number, mode: "erase" | "restore"): Rect | null {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(w - 1, Math.ceil(cx + radius));
  const y1 = Math.min(h - 1, Math.ceil(cy + radius));
  if (x0 > x1 || y0 > y1) return null;
  const target = mode === "erase" ? 0 : 255;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const a = brushFalloff(Math.hypot(x + 0.5 - cx, y + 0.5 - cy), radius, hardness);
      if (a <= 0) continue;
      const i = y * w + x;
      const v = layer[i] + (target - layer[i]) * a;
      layer[i] = mode === "erase" ? Math.floor(v) : Math.ceil(v);
    }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* Points along a stroke segment, spaced so dabs overlap smoothly. Excludes the start point. */
export function strokePoints(x0: number, y0: number, x1: number, y1: number, radius: number): [number, number][] {
  const spacing = Math.max(0.5, radius / 4);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  const pts: [number, number][] = [];
  for (let i = 1; i <= steps; i++) pts.push([x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps]);
  return pts;
}

export function unionRect(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/* Undo and redo over snapshots of the edit layer, capped so memory stays bounded. */
export class History {
  private undoStack: Uint8Array[] = [];
  private redoStack: Uint8Array[] = [];
  constructor(private readonly limit = 30) {}
  /* Call before a change with a copy of the layer as it was. */
  push(before: Uint8Array) {
    this.undoStack.push(before);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }
  undo(current: Uint8Array): Uint8Array | null {
    const prev = this.undoStack.pop();
    if (!prev) return null;
    this.redoStack.push(current);
    return prev;
  }
  redo(current: Uint8Array): Uint8Array | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(current);
    return next;
  }
  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
}

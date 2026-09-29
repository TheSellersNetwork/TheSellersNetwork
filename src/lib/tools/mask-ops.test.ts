import {
  History,
  NEUTRAL,
  boxMean,
  brushFalloff,
  cleanMask,
  combineEdit,
  labelComponents,
  newEditLayer,
  refineEdges,
  resizeBilinear,
  stamp,
  strokePoints,
  unionRect,
} from "./mask-ops";

/* Build a mask from rows of "#" (item) and "." (background). */
const grid = (rows: string[]) => ({
  w: rows[0].length,
  h: rows.length,
  data: Float32Array.from(rows.join("").split(""), (c) => (c === "#" ? 1 : 0)),
});
const show = (m: ArrayLike<number>, w: number) =>
  Array.from({ length: m.length / w }, (_, y) =>
    Array.from({ length: w }, (_, x) => (m[y * w + x] >= 0.5 ? "#" : ".")).join(""),
  );

describe("mask ops", () => {
  it("labels connected pieces, 8 or 4 connected", () => {
    const g = grid(["#..#", "#..#", "..#.", "...."]);
    const eight = labelComponents(g.data, g.w, g.h, true);
    // Left column is one piece; right column joins the diagonal pixel.
    expect(eight.sizes.slice(1).sort()).toEqual([2, 3]);
    const four = labelComponents(g.data, g.w, g.h, false);
    expect(four.sizes.slice(1).sort()).toEqual([1, 2, 2]);
    expect(eight.touchesEdge.slice(1).every(Boolean)).toBe(true);
  });

  it("removes small specks but keeps big second pieces", () => {
    const g = grid([
      "..........",
      ".####.....",
      ".####...#.",
      ".####.....",
      ".####..##.",
      ".......##.",
      "..........",
      "#.........",
    ]);
    // Biggest piece 16 pixels; keep pieces of at least 20% of it (the 4-pixel block stays, single pixels go).
    const out = cleanMask(g.data, g.w, g.h, { minPieceShare: 0.2, maxHoleShare: 0 });
    expect(show(out, g.w)).toEqual([
      "..........",
      ".####.....",
      ".####.....",
      ".####.....",
      ".####..##.",
      ".......##.",
      "..........",
      "..........",
    ]);
  });

  it("fills small holes but leaves big ones and gaps open to the edge", () => {
    const g = grid([
      "..........",
      ".########.",
      ".#.######.",
      ".########.",
      ".###...##.",
      ".###...##.",
      ".###...##.",
      ".########.",
      "..........",
    ]);
    const out = cleanMask(g.data, g.w, g.h, { minPieceShare: 0, maxHoleShare: 0.05 });
    const rows = show(out, g.w);
    expect(rows[2]).toBe(".########."); // 1-pixel hole filled
    expect(rows[5]).toBe(".###...##."); // 9-pixel hole (more than 5% of the item) kept
  });

  it("keeps soft values that are not specks or holes", () => {
    const m = Float32Array.from([0.2, 0.9, 0.9, 0.3]);
    const out = cleanMask(m, 2, 2);
    expect(out[0]).toBeCloseTo(0.2);
    expect(out[3]).toBeCloseTo(0.3);
  });

  it("box mean averages a window and clamps at the edges", () => {
    const m = boxMean([0, 0, 9, 0, 0], 5, 1, 1);
    expect(Array.from(m)).toEqual([0, 3, 3, 3, 0]);
  });

  it("resizes bilinearly", () => {
    const up = resizeBilinear([0, 1], 2, 1, 4, 1);
    expect(Array.from(up)).toEqual([0, 0.25, 0.75, 1]);
    const scaled = resizeBilinear([255], 1, 1, 2, 2, 1 / 255);
    expect(Array.from(scaled)).toEqual([1, 1, 1, 1]);
  });

  it("refinement snaps a blurry edge to the photo's edge and leaves solid areas alone", () => {
    const w = 20;
    const h = 1;
    // The photo has a sharp step between pixel 9 and 10; the mask is a soft ramp around it.
    const guide = Float32Array.from({ length: w }, (_, x) => (x < 10 ? 0.1 : 0.9));
    const p = Float32Array.from({ length: w }, (_, x) => Math.min(1, Math.max(0, (x - 6) / 8)));
    const q = refineEdges(guide, p, w, h, 3, 1e-4);
    expect(q[8]).toBeLessThan(p[8]);
    expect(q[11]).toBeGreaterThan(p[11]);
    expect(q[0]).toBe(p[0]);
    expect(q[19]).toBe(p[19]);
  });

  it("combines touch-ups with the automatic mask", () => {
    expect(combineEdit(0.6, NEUTRAL)).toBe(0.6);
    expect(combineEdit(0.6, 0)).toBe(0);
    expect(combineEdit(0.2, 255)).toBe(1);
    expect(combineEdit(0.5, 64)).toBeCloseTo(0.25);
  });

  it("brush dabs erase and restore with a soft edge", () => {
    expect(brushFalloff(0, 5, 0.5)).toBe(1);
    expect(brushFalloff(5, 5, 0.5)).toBe(0);
    expect(brushFalloff(3.75, 5, 0.5)).toBeCloseTo(0.5);
    const w = 9;
    const layer = newEditLayer(w * w);
    const r = stamp(layer, w, w, 4.5, 4.5, 3, 1, "erase");
    expect(r).toEqual({ x: 1, y: 1, w: 8, h: 8 });
    expect(layer[4 * w + 4]).toBe(0);
    expect(layer[0]).toBe(NEUTRAL);
    stamp(layer, w, w, 4.5, 4.5, 3, 1, "restore");
    expect(layer[4 * w + 4]).toBe(255);
    expect(stamp(layer, w, w, -20, -20, 3, 1, "erase")).toBeNull();
  });

  it("spaces stroke points and joins rectangles", () => {
    const pts = strokePoints(0, 0, 10, 0, 4);
    expect(pts.length).toBe(10);
    expect(pts[pts.length - 1]).toEqual([10, 0]);
    expect(unionRect({ x: 0, y: 0, w: 2, h: 2 }, { x: 5, y: 1, w: 1, h: 4 })).toEqual({ x: 0, y: 0, w: 6, h: 5 });
  });

  it("undo and redo walk snapshots, with a cap", () => {
    const h = new History(2);
    const a = Uint8Array.of(1);
    const b = Uint8Array.of(2);
    const c = Uint8Array.of(3);
    h.push(a);
    h.push(b);
    h.push(c); // a drops off
    const now = Uint8Array.of(4);
    expect(h.undo(now)).toBe(c);
    expect(h.undo(c)).toBe(b);
    expect(h.undo(b)).toBeNull();
    expect(h.redo(b)).toBe(c);
    expect(h.canRedo).toBe(true);
    h.push(Uint8Array.of(9));
    expect(h.canRedo).toBe(false);
  });
});

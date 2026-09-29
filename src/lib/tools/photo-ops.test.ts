import { enhanceFrom, enhanceLut, isNeutral, shadowFor } from "./photo-ops";

/* n pixels of one colour, as RGBA. */
const fill = (n: number, rgb: [number, number, number]) => Array.from({ length: n }, () => [...rgb, 255]).flat();

describe("photo ops", () => {
  it("takes a colour cast out using the removed background", () => {
    // A warm, dull backdrop (half the pixels) and a blue item.
    const rgba = [...fill(50, [200, 180, 160]), ...fill(50, [20, 40, 200])];
    const alpha = [...Array(50).fill(0), ...Array(50).fill(1)];
    const e = enhanceFrom(rgba, alpha, 100);
    expect(e.reference).toBe("background");
    expect(e.gains[0]).toBeLessThan(1);
    expect(e.gains[2]).toBeGreaterThan(1);
    expect(e.brightness).toBeGreaterThan(1);
    const [r, , b] = enhanceLut(e);
    // After correction the backdrop is close to neutral.
    expect(Math.abs(r[200] - b[160])).toBeLessThan(8);
  });

  it("leaves a neutral white backdrop alone", () => {
    const rgba = [...fill(50, [240, 240, 240]), ...fill(50, [100, 20, 20])];
    const alpha = [...Array(50).fill(0), ...Array(50).fill(1)];
    expect(isNeutral(enhanceFrom(rgba, alpha, 100))).toBe(true);
  });

  it("caps corrections and never darkens", () => {
    const rgba = [...fill(50, [30, 30, 90]), ...fill(50, [10, 10, 10])];
    const alpha = [...Array(50).fill(0), ...Array(50).fill(1)];
    const e = enhanceFrom(rgba, alpha, 100);
    expect(e.gains.every((g) => g >= 0.85 && g <= 1.18)).toBe(true);
    expect(e.brightness).toBeLessThanOrEqual(1.35);
    expect(e.brightness).toBeGreaterThanOrEqual(1);
  });

  it("uses the item for brightness when there is little background", () => {
    const rgba = fill(100, [150, 150, 150]);
    const e = enhanceFrom(rgba, Array(100).fill(1), 100);
    expect(e.reference).toBe("item");
    expect(e.gains).toEqual([1, 1, 1]);
    expect(e.brightness).toBeCloseTo(1.25);
  });

  it("builds smooth tables that ease into the highlights", () => {
    const [lut] = enhanceLut({ gains: [1.2, 1, 1], brightness: 1.3, reference: "background" });
    for (let v = 1; v < 256; v++) expect(lut[v]).toBeGreaterThanOrEqual(lut[v - 1]);
    expect(lut[255]).toBeLessThanOrEqual(255);
    expect(lut[0]).toBe(0);
    const [id] = enhanceLut({ gains: [1, 1, 1], brightness: 1, reference: "none" });
    expect(id[100]).toBe(100);
  });

  it("puts the shadow under the item and inside the canvas", () => {
    const place = { dx: 100, dy: 100, dw: 800, dh: 780 };
    const s = shadowFor(place, 1000, 50);
    expect(s.cx).toBe(500);
    expect(s.cy + s.ry).toBeLessThanOrEqual(1000);
    expect(s.cy).toBeGreaterThan(place.dy + place.dh * 0.9);
    expect(s.contactAlpha).toBeCloseTo(0.225);
    expect(shadowFor(place, 1000, 0).dropAlpha).toBe(0);
  });
});

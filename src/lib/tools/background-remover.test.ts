import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  MODEL_BYTES,
  MODEL_SHA256,
  ORT_VERSION,
  applySoftness,
  boundingBox,
  describeError,
  expandBox,
  featherRadius,
  fitWithin,
  layout,
  maskToAlpha,
  normalisePrediction,
  outputName,
  outputType,
  scaleBox,
  toModelInput,
} from "./background-remover";

const root = path.resolve(__dirname, "..", "..", "..");

describe("background remover", () => {
  it("builds planar, normalised model input", () => {
    // 2 by 2: red, green, blue, white.
    const px = [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255];
    const t = toModelInput(px, 2);
    expect(t.length).toBe(12);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229); // R of red
    expect(t[1]).toBeCloseTo((0 - 0.485) / 0.229); // R of green
    expect(t[4 + 1]).toBeCloseTo((1 - 0.456) / 0.224); // G of green
    expect(t[8 + 2]).toBeCloseTo((1 - 0.406) / 0.225); // B of blue
  });

  it("divides by the brightest value like rembg", () => {
    const t = toModelInput([100, 50, 0, 255], 1);
    expect(t[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(t[1]).toBeCloseTo((0.5 - 0.456) / 0.224);
  });

  it("stretches the prediction to 0..1", () => {
    expect(Array.from(normalisePrediction([2, 4, 6]))).toEqual([0, 0.5, 1]);
    expect(Array.from(normalisePrediction([3, 3]))).toEqual([0, 0]);
  });

  it("softness keeps the midpoint and hardens or softens edges", () => {
    expect(applySoftness(0.5, 0)).toBeCloseTo(0.5);
    expect(applySoftness(0.5, 100)).toBeCloseTo(0.5);
    expect(applySoftness(0.4, 0)).toBe(0);
    expect(applySoftness(0.6, 0)).toBe(1);
    expect(applySoftness(0.4, 100)).toBeGreaterThan(0.2);
    expect(applySoftness(0, 50)).toBe(0);
    expect(applySoftness(1, 50)).toBe(1);
    expect(Array.from(maskToAlpha([0, 1], 30))).toEqual([0, 255]);
    expect(featherRadius(0, 1000)).toBeLessThan(featherRadius(100, 1000));
    expect(featherRadius(50, 4000)).toBeGreaterThan(featherRadius(50, 1000));
  });

  it("finds the item's box and scales it to the photo", () => {
    const w = 4;
    const a = [0, 0, 0, 0, 0, 200, 200, 0, 0, 0, 255, 0, 0, 0, 0, 0];
    expect(boundingBox(a, w, 4)).toEqual({ x: 1, y: 1, w: 2, h: 2 });
    expect(boundingBox(new Array(16).fill(10), 4, 4)).toBeNull();
    expect(scaleBox({ x: 1, y: 1, w: 2, h: 2 }, { w: 4, h: 4 }, { w: 400, h: 200 })).toEqual({ x: 100, y: 50, w: 200, h: 100 });
    expect(expandBox({ x: 5, y: 5, w: 10, h: 10 }, 10, { w: 18, h: 100 })).toEqual({ x: 0, y: 0, w: 18, h: 25 });
  });

  it("scales big photos down to the working size", () => {
    expect(fitWithin(6000, 4000, 4000)).toEqual({ w: 4000, h: 2667 });
    expect(fitWithin(800, 600, 4000)).toEqual({ w: 800, h: 600 });
  });

  it("centres the item on a square with padding", () => {
    const L = layout({ w: 100, h: 50 }, "1:1", 0.1);
    expect(L).toMatchObject({ width: 125, height: 125, dw: 100, dh: 50 });
    expect(L.dx).toBeCloseTo(12.5);
    expect(L.dy).toBeCloseTo(37.5);
  });

  it("fits a tall item on 4:5 by its height", () => {
    const L = layout({ w: 100, h: 400 }, "4:5", 0);
    expect(L.height).toBe(400);
    expect(L.width).toBe(320);
    expect(L.dy).toBeCloseTo(0);
    expect(L.dx).toBeCloseTo(110);
  });

  it("caps the output size and scales the item with it", () => {
    const L = layout({ w: 3000, h: 3000 }, "1:1", 0.25, 2000);
    expect(L.width).toBe(2000);
    expect(L.dw).toBeCloseTo(1000);
    expect(L.dx).toBeCloseTo(500);
    const P = layout({ w: 3000, h: 1000 }, "4:5", 0.1, 2000);
    expect(P.height).toBe(2000);
    expect(P.width).toBe(1600);
    expect(P.dw).toBeLessThanOrEqual(1600 * 0.8 + 0.001);
  });

  it("names and types the downloads", () => {
    expect(outputType("white")).toEqual({ mime: "image/jpeg", ext: "jpg" });
    expect(outputType("grey").ext).toBe("jpg");
    expect(outputType("transparent")).toEqual({ mime: "image/png", ext: "png" });
    expect(outputName("Red jumper.jpeg", "transparent")).toBe("Red jumper-no-background.png");
    expect(outputName(".png", "white")).toBe("photo-no-background.jpg");
  });

  it("explains failures in plain words", () => {
    expect(describeError(new RangeError("Array buffer allocation failed"))).toMatch(/memory/);
    expect(describeError(new Error("x"))).toMatch(/Something went wrong/);
  });

  it("ships the model and runtime it says it does", () => {
    const model = readFileSync(path.join(root, "public/models/u2netp/u2netp.onnx"));
    expect(model.length).toBe(MODEL_BYTES);
    expect(createHash("sha256").update(model).digest("hex")).toBe(MODEL_SHA256);
    const pkg = JSON.parse(readFileSync(path.join(root, "node_modules/onnxruntime-web/package.json"), "utf8"));
    expect(pkg.version).toBe(ORT_VERSION);
    for (const f of ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"]) {
      const shipped = statSync(path.join(root, `public/vendor/onnxruntime-web/${ORT_VERSION}/${f}`)).size;
      expect(shipped).toBe(statSync(path.join(root, `node_modules/onnxruntime-web/dist/${f}`)).size);
    }
  });
});

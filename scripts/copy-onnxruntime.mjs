/*
  Copies the ONNX Runtime Web files the background remover needs from
  node_modules into public/vendor/onnxruntime-web/<version>/, so the site
  serves them itself and no photo-related request goes to a third-party CDN.
  Run with `npm run tools:ort` after upgrading onnxruntime-web, then update
  ORT_VERSION in src/lib/tools/background-remover.ts to match.

  onnxruntime-web is MIT licensed (Copyright (c) Microsoft Corporation):
  https://github.com/microsoft/onnxruntime/blob/main/LICENSE
*/

import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkgDir = path.join(root, "node_modules", "onnxruntime-web");
const { version } = JSON.parse(await readFile(path.join(pkgDir, "package.json"), "utf8"));

// The WASM-only build (no WebGL or WebGPU) and the single SIMD runtime it loads.
const files = ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

// LICENSE.txt beside the version folders holds the MIT notice (the npm package ships without one).
const out = path.join(root, "public", "vendor", "onnxruntime-web", version);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of files) await copyFile(path.join(pkgDir, "dist", f), path.join(out, f));
console.log(`Copied onnxruntime-web ${version} to ${path.relative(root, out)}`);

/*
  Copies the PDF.js files the shipping label cropper needs from node_modules
  into public/vendor/pdfjs-dist/<version>/, so the site serves them itself and
  no label-related request goes to a third-party CDN. Run with
  `npm run tools:pdfjs` after upgrading pdfjs-dist. The page builds the worker
  address from the installed version, so nothing else needs changing.

  pdfjs-dist is Apache 2.0 licensed (Copyright Mozilla Foundation):
  https://github.com/mozilla/pdf.js/blob/master/LICENSE
  The standard fonts are under the Liberation (SIL OFL 1.1) and Foxit
  licences, and the WebAssembly decoders under their own licences; each
  licence file is copied beside them.
*/

import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const pkgDir = path.join(root, "node_modules", "pdfjs-dist");
const { version } = JSON.parse(await readFile(path.join(pkgDir, "package.json"), "utf8"));

const out = path.join(root, "public", "vendor", "pdfjs-dist", version);
await rm(path.join(root, "public", "vendor", "pdfjs-dist"), { recursive: true, force: true });
await mkdir(path.join(out, "standard_fonts"), { recursive: true });
await mkdir(path.join(out, "wasm"), { recursive: true });

// The worker that parses and renders PDFs off the main thread.
await copyFile(path.join(pkgDir, "build", "pdf.worker.min.mjs"), path.join(out, "pdf.worker.min.mjs"));
await copyFile(path.join(pkgDir, "LICENSE"), path.join(out, "LICENSE"));

// Fonts for PDFs that name a standard font (Helvetica, Times, Courier) without embedding it, which many label PDFs do.
for (const f of await readdir(path.join(pkgDir, "standard_fonts"))) {
  await copyFile(path.join(pkgDir, "standard_fonts", f), path.join(out, "standard_fonts", f));
}

// Image decoders for JPEG 2000 and JBIG2 images inside PDFs, and colour management. No JavaScript fallbacks or scripting engine.
for (const f of await readdir(path.join(pkgDir, "wasm"))) {
  if (f.endsWith(".wasm") && !f.startsWith("quickjs")) await copyFile(path.join(pkgDir, "wasm", f), path.join(out, "wasm", f));
  if (f.startsWith("LICENSE")) await copyFile(path.join(pkgDir, "wasm", f), path.join(out, "wasm", f));
}

console.log(`Copied pdfjs-dist ${version} to ${path.relative(root, out)}`);

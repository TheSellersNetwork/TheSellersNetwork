"use client";

/*
  The browser side of the shipping label cropper: reading PDFs and pictures,
  rendering small previews, finding the label, and writing the output PDF.
  PDF.js (Apache 2.0) renders and runs in its own worker, served from this
  site under /vendor/pdfjs-dist/<version>/. pdf-lib (MIT) writes the output:
  each label is the original PDF page embedded with a bounding box and drawn
  onto the new page, so text and barcodes stay as sharp vectors. Nothing is
  uploaded; the only requests are for PDF.js's own files from this site.
*/

import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFDocument as PdfLibDocument } from "pdf-lib";
import { MM, detectLabel, luminance, layoutPdfLabel, fitLabel, outputSize, padRect, placement, shownSize, sizeKey, slotFor, type OutputSizeId, type Rect } from "@/lib/tools/label-crop";

export type SourceFile = { id: number; file: File; kind: "pdf" | "image" };

export type LabelPage = {
  id: number;
  sourceId: number;
  kind: "pdf" | "image";
  fileName: string;
  /* 0-based page within its PDF (0 for a picture), and how many pages the file has. */
  pageIndex: number;
  pageCount: number;
  previewUrl: string;
  /* The page as shown: points for a PDF page, pixels for a picture. */
  shownW: number;
  shownH: number;
  view: [number, number, number, number];
  rotate: number;
  sizeKey: string;
  detected: Rect | null;
  crop: Rect;
  skip: boolean;
  blank: boolean;
};

export type BuildSettings = { size: OutputSizeId; marginMm: number; mode: "combined" | "separate" };

/* Previews are this many pixels on the longest side, and detection works on half that. */
const PREVIEW_PX = 900;
/* Locked PDFs are copied as pictures at this resolution. */
const RASTER_DPI = 300;
/* Pictures bigger than this on the longest side are scaled down in the output. */
const MAX_IMAGE_PX = 3000;

type Pdfjs = typeof import("pdfjs-dist");
let pdfjsPromise: Promise<Pdfjs> | null = null;

function base(v: string) {
  return `/vendor/pdfjs-dist/${v}/`;
}

export function loadPdfjs(): Promise<Pdfjs> {
  pdfjsPromise ??= import("pdfjs-dist").then((m) => {
    m.GlobalWorkerOptions.workerSrc = `${base(m.version)}pdf.worker.min.mjs`;
    return m;
  });
  return pdfjsPromise;
}

type OpenPdf = { doc: PDFDocumentProxy; close: () => Promise<void> };

async function openPdf(data: Uint8Array): Promise<OpenPdf> {
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    data,
    standardFontDataUrl: `${base(pdfjs.version)}standard_fonts/`,
    wasmUrl: `${base(pdfjs.version)}wasm/`,
    enableXfa: false,
  });
  try {
    return { doc: await task.promise, close: () => task.destroy() };
  } catch (err) {
    await task.destroy();
    throw err;
  }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function toBlob(c: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Could not make an image from this page."))), type, quality));
}

/* A JPEG preview and the detected label for a rendered canvas. */
async function previewAndDetect(c: HTMLCanvasElement, kind: "pdf" | "image", shownW: number, shownH: number) {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const { lum, w, h } = luminance(data, c.width, c.height, 2);
  const found = detectLabel(lum, w, h);
  const blob = await toBlob(c, "image/jpeg", 0.85);
  c.width = 0;
  c.height = 0;
  // A little space round the label so its border is not shaved off: 1.5 mm on a PDF, 1% on a picture.
  const padX = kind === "pdf" ? (1.5 * MM) / shownW : 0.01;
  const padY = kind === "pdf" ? (1.5 * MM) / shownH : 0.01;
  const detected = found ? padRect(found.rect, padX, padY) : null;
  return { previewUrl: URL.createObjectURL(blob), detected };
}

/*
  Reads every page of a PDF, up to `limit` pages, calling onPage for each as
  it is ready. The PDF.js document is closed at the end; only the small
  previews stay in memory.
*/
export async function readPdf(source: SourceFile, limit: number, nextId: () => number, onPage: (p: LabelPage) => void, cancelled: () => boolean): Promise<{ pages: number; total: number }> {
  const { doc, close } = await openPdf(new Uint8Array(await source.file.arrayBuffer()));
  try {
    const total = doc.numPages;
    const n = Math.min(total, limit);
    for (let i = 0; i < n; i++) {
      if (cancelled()) return { pages: i, total };
      const page = await doc.getPage(i + 1);
      const view = page.view as [number, number, number, number];
      const rotate = page.rotate;
      const shown = shownSize(view, rotate);
      const scale = PREVIEW_PX / Math.max(shown.w, shown.h);
      const viewport = page.getViewport({ scale });
      const c = canvasOf(viewport.width, viewport.height);
      await page.render({ canvas: c, canvasContext: c.getContext("2d", { willReadFrequently: true })!, viewport }).promise;
      page.cleanup();
      const { previewUrl, detected } = await previewAndDetect(c, "pdf", shown.w, shown.h);
      onPage({
        id: nextId(),
        sourceId: source.id,
        kind: "pdf",
        fileName: source.file.name,
        pageIndex: i,
        pageCount: total,
        previewUrl,
        shownW: shown.w,
        shownH: shown.h,
        view,
        rotate,
        sizeKey: sizeKey("pdf", shown.w, shown.h),
        detected,
        crop: detected ?? { x: 0, y: 0, w: 1, h: 1 },
        skip: !detected,
        blank: !detected,
      });
      await tick();
    }
    return { pages: n, total };
  } finally {
    await close();
  }
}

export async function readImage(source: SourceFile, nextId: () => number): Promise<LabelPage> {
  const bmp = await createImageBitmap(source.file);
  try {
    const scale = Math.min(1, PREVIEW_PX / Math.max(bmp.width, bmp.height));
    const c = canvasOf(bmp.width * scale, bmp.height * scale);
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const { previewUrl, detected } = await previewAndDetect(c, "image", bmp.width, bmp.height);
    return {
      id: nextId(),
      sourceId: source.id,
      kind: "image",
      fileName: source.file.name,
      pageIndex: 0,
      pageCount: 1,
      previewUrl,
      shownW: bmp.width,
      shownH: bmp.height,
      view: [0, 0, bmp.width, bmp.height],
      rotate: 0,
      sizeKey: sizeKey("image", bmp.width, bmp.height),
      detected,
      crop: detected ?? { x: 0, y: 0, w: 1, h: 1 },
      skip: !detected,
      blank: !detected,
    };
  } finally {
    bmp.close();
  }
}

/* The cropped part of a picture, as PNG (or JPEG for photos), no bigger than MAX_IMAGE_PX. */
async function cropPicture(file: File | Blob, crop: Rect, jpeg: boolean): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const bmp = await createImageBitmap(file);
  try {
    const sx = crop.x * bmp.width;
    const sy = crop.y * bmp.height;
    const sw = crop.w * bmp.width;
    const sh = crop.h * bmp.height;
    const scale = Math.min(1, MAX_IMAGE_PX / Math.max(sw, sh));
    const c = canvasOf(sw * scale, sh * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const blob = await toBlob(c, jpeg ? "image/jpeg" : "image/png", 0.92);
    const out = { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
    c.width = 0;
    c.height = 0;
    return out;
  } finally {
    bmp.close();
  }
}

/* A locked PDF page's crop, rendered by PDF.js at RASTER_DPI, as PNG. */
async function rasterPdfCrop(doc: PDFDocumentProxy, pageIndex: number, crop: Rect): Promise<{ bytes: Uint8Array; w: number; h: number }> {
  const page = await doc.getPage(pageIndex + 1);
  const viewport = page.getViewport({ scale: RASTER_DPI / 72 });
  const c = canvasOf(crop.w * viewport.width, crop.h * viewport.height);
  const ctx = c.getContext("2d")!;
  await page.render({ canvas: c, canvasContext: ctx, viewport, transform: [1, 0, 0, 1, -crop.x * viewport.width, -crop.y * viewport.height] }).promise;
  page.cleanup();
  const blob = await toBlob(c, "image/png");
  const out = { bytes: new Uint8Array(await blob.arrayBuffer()), w: c.width, h: c.height };
  c.width = 0;
  c.height = 0;
  return out;
}

export type BuildResult = { files: { name: string; bytes: Uint8Array }[]; labels: number; sheets: number; rastered: number };

/*
  Writes the labels, one page at a time, into one PDF or one PDF per sheet.
  Source PDFs are opened with pdf-lib once each and let go at the end. A PDF
  that pdf-lib cannot read (usually one locked against changes) is rendered
  by PDF.js at 300 dpi instead, and counted in `rastered`.
*/
export async function buildLabels(pages: LabelPage[], sources: Map<number, SourceFile>, settings: BuildSettings, onProgress: (done: number, total: number) => void, cancelled: () => boolean): Promise<BuildResult> {
  const { PDFDocument, degrees } = await import("pdf-lib");
  const size = outputSize(settings.size);
  const margin = Math.min(5, Math.max(0, settings.marginMm)) * MM;
  const todo = pages.filter((p) => !p.skip);
  const libDocs = new Map<number, PdfLibDocument | "locked">();
  const jsDocs = new Map<number, OpenPdf>();
  const results: { bytes: Uint8Array }[] = [];
  let rastered = 0;

  const newDoc = async () => {
    const d = await PDFDocument.create();
    d.setTitle("Shipping labels");
    d.setCreator("The Sellers Network label cropper");
    d.setProducer("pdf-lib");
    return d;
  };
  let out = await newDoc();
  let sheet: ReturnType<PdfLibDocument["addPage"]> | null = null;
  let sheetNo = -1;

  try {
    for (let i = 0; i < todo.length; i++) {
      if (cancelled()) throw new DOMException("Cancelled", "AbortError");
      const p = todo[i];
      const src = sources.get(p.sourceId)!;
      const { sheet: s, slot } = slotFor(i, size);
      if (s !== sheetNo) {
        if (settings.mode === "separate" && sheetNo >= 0) {
          results.push({ bytes: await out.save() });
          out = await newDoc();
        }
        sheet = out.addPage([size.pageW, size.pageH]);
        sheetNo = s;
      }
      const target = sheet!;

      let picture: { bytes: Uint8Array; w: number; h: number; jpeg: boolean } | null = null;
      if (p.kind === "pdf") {
        let lib = libDocs.get(p.sourceId);
        if (!lib) {
          try {
            lib = await PDFDocument.load(await src.file.arrayBuffer(), { updateMetadata: false });
          } catch {
            lib = "locked";
          }
          libDocs.set(p.sourceId, lib);
        }
        if (lib !== "locked") {
          try {
            const { box, place } = layoutPdfLabel(p.crop, p.view, p.rotate, slot, margin);
            const embedded = await out.embedPage(lib.getPage(p.pageIndex), box);
            target.drawPage(embedded, { x: place.x, y: place.y, xScale: place.scale, yScale: place.scale, rotate: degrees(place.ccw) });
          } catch {
            lib = "locked";
          }
        }
        if (lib === "locked") {
          let js = jsDocs.get(p.sourceId);
          if (!js) {
            js = await openPdf(new Uint8Array(await src.file.arrayBuffer()));
            jsDocs.set(p.sourceId, js);
          }
          picture = { ...(await rasterPdfCrop(js.doc, p.pageIndex, p.crop)), jpeg: false };
          rastered++;
        }
      } else {
        // Photos stay JPEG; screenshots (PNG, WebP) become PNG so text edges stay clean.
        const jpeg = src.file.type === "image/jpeg" || /\.jpe?g$/i.test(src.file.name);
        picture = { ...(await cropPicture(src.file, p.crop, jpeg)), jpeg };
      }

      if (picture) {
        const img = picture.jpeg ? await out.embedJpg(picture.bytes) : await out.embedPng(picture.bytes);
        const fit = fitLabel(picture.w, picture.h, slot, margin);
        const place = placement(picture.w, picture.h, fit.turn, fit.scale, fit.box);
        target.drawImage(img, { x: place.x, y: place.y, width: picture.w * place.scale, height: picture.h * place.scale, rotate: degrees(place.ccw) });
      }

      onProgress(i + 1, todo.length);
      await tick();
    }
    if (todo.length) results.push({ bytes: await out.save({ objectsPerTick: 50 }) });
  } finally {
    for (const d of jsDocs.values()) await d.close();
    libDocs.clear();
  }

  const pad = String(results.length).length;
  return {
    files: results.map((r, k) => ({ name: `label-${String(k + 1).padStart(Math.max(2, pad), "0")}.pdf`, bytes: r.bytes })),
    labels: todo.length,
    sheets: settings.mode === "separate" ? results.length : Math.ceil(todo.length / size.slots.length),
    rastered,
  };
}

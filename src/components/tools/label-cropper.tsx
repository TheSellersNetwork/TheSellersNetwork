"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Download, EyeOff, FileUp, GripVertical, Loader2, Lock, RotateCcw, Square, Trash2 } from "lucide-react";
import {
  DEFAULT_MARGIN_MM,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_MARGIN_MM,
  MAX_PAGES,
  OUTPUT_SIZES,
  QUICK_CROPS,
  clampRect,
  describeCrop,
  fileKind,
  moveRect,
  outputName,
  outputSize,
  resizeRect,
  sheetCount,
  type Handle,
  type OutputSizeId,
  type Rect,
} from "@/lib/tools/label-crop";
import { buildZip, crc32 } from "@/lib/tools/zip";
import { buildLabels, readImage, readPdf, type BuildSettings, type LabelPage, type SourceFile } from "@/components/tools/label-cropper-engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tsn-label-cropper-settings";
const DEFAULT_SETTINGS: BuildSettings = { size: "4x6", marginMm: DEFAULT_MARGIN_MM, mode: "combined" };
/* 44px touch targets on phones, the usual small buttons on bigger screens. */
const tap = "max-sm:h-11 max-sm:min-w-11";

function parseSettings(raw: string | null): BuildSettings {
  try {
    const s = JSON.parse(raw ?? "{}") as Partial<BuildSettings>;
    return {
      size: OUTPUT_SIZES.some((o) => o.id === s.size) ? (s.size as OutputSizeId) : DEFAULT_SETTINGS.size,
      marginMm: typeof s.marginMm === "number" && s.marginMm >= 0 && s.marginMm <= MAX_MARGIN_MM ? s.marginMm : DEFAULT_SETTINGS.marginMm,
      mode: s.mode === "separate" ? "separate" : "combined",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function readError(name: string, err: unknown): string {
  const n = (err as { name?: string })?.name ?? "";
  if (n === "PasswordException") return `${name} needs a password to open, so it cannot be read here.`;
  if (n === "InvalidPDFException") return `${name} could not be read. It may be damaged, or not really a PDF.`;
  if (n === "InvalidStateError" || n === "EncodingError") return `${name} could not be opened as a picture.`;
  return `${name} could not be read.`;
}

const pageName = (p: LabelPage) => (p.pageCount > 1 ? `${p.fileName}, page ${p.pageIndex + 1} of ${p.pageCount}` : p.fileName);
const sameRect = (a: Rect | null, b: Rect) => !!a && Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6 && Math.abs(a.w - b.w) < 1e-6 && Math.abs(a.h - b.h) < 1e-6;

type Reading = { filesDone: number; filesTotal: number };

export function LabelCropper() {
  const [pages, setPages] = useState<LabelPage[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [settings, setSettings] = useState<BuildSettings>(DEFAULT_SETTINGS);
  const [reading, setReading] = useState<Reading | null>(null);
  const [building, setBuilding] = useState<{ done: number; total: number } | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [result, setResult] = useState("");
  const [dragging, setDragging] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  const sources = useRef(new Map<number, SourceFile>());
  const queue = useRef<SourceFile[]>([]);
  const pump = useRef(false);
  const pageCount = useRef(0);
  const ids = useRef(1);
  const stopRead = useRef(false);
  const stopBuild = useRef(false);
  const readingRef = useRef<Reading>({ filesDone: 0, filesTotal: 0 });
  const pagesRef = useRef<LabelPage[]>([]);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  const nextId = useCallback(() => ids.current++, []);

  useEffect(() => {
    // Checked after mount so the server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (typeof Worker === "undefined" || typeof createImageBitmap === "undefined") setUnsupported(true);
    try {
      setSettings(parseSettings(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Storage blocked: keep the defaults.
    }
    return () => {
      for (const p of pagesRef.current) URL.revokeObjectURL(p.previewUrl);
    };
  }, []);

  function update(s: Partial<BuildSettings>) {
    setSettings((prev) => {
      const next = { ...prev, ...s };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Not remembered; still used for this visit.
      }
      return next;
    });
    setResult("");
  }

  const run = useCallback(async () => {
    if (pump.current) return;
    pump.current = true;
    stopRead.current = false;
    try {
      while (queue.current.length) {
        const src = queue.current.shift()!;
        const room = MAX_PAGES - pageCount.current;
        if (room <= 0 || stopRead.current) {
          setNotices((n) => [...n, stopRead.current ? `${src.file.name} was not read because you stopped reading.` : `${src.file.name} was not read: you already have ${MAX_PAGES} pages.`]);
        } else {
          try {
            if (src.kind === "pdf") {
              const { pages: got, total } = await readPdf(
                src,
                room,
                nextId,
                (p) => {
                  pageCount.current++;
                  setPages((list) => [...list, p]);
                  setSelectedId((cur) => cur ?? p.id);
                },
                () => stopRead.current,
              );
              if (got < total && !stopRead.current) setNotices((n) => [...n, `Only the first ${got} of ${total} pages of ${src.file.name} were added, to stay within ${MAX_PAGES} pages.`]);
            } else {
              const p = await readImage(src, nextId);
              pageCount.current++;
              setPages((list) => [...list, p]);
              setSelectedId((cur) => cur ?? p.id);
            }
          } catch (err) {
            setNotices((n) => [...n, readError(src.file.name, err)]);
          }
        }
        readingRef.current = { ...readingRef.current, filesDone: readingRef.current.filesDone + 1 };
        setReading({ ...readingRef.current });
      }
    } finally {
      pump.current = false;
      readingRef.current = { filesDone: 0, filesTotal: 0 };
      setReading(null);
    }
  }, [nextId]);

  const addFiles = useCallback(
    (files: File[]) => {
      const bad: string[] = [];
      const good: SourceFile[] = [];
      for (const file of files) {
        const kind = fileKind(file);
        if (!kind) bad.push(`${file.name || "That file"} is not a PDF, PNG, JPEG or WebP. For iPhone photos (HEIC), take a screenshot of the label instead.`);
        else if (file.size > MAX_FILE_BYTES) bad.push(`${file.name} is over ${MAX_FILE_MB} MB, so it was not added.`);
        else {
          const src: SourceFile = { id: nextId(), file, kind };
          sources.current.set(src.id, src);
          good.push(src);
        }
      }
      setNotices(bad);
      setResult("");
      if (!good.length) return;
      queue.current.push(...good);
      readingRef.current = { ...readingRef.current, filesTotal: readingRef.current.filesTotal + good.length };
      setReading({ ...readingRef.current });
      void run();
    },
    [nextId, run],
  );

  // Paste a label from the clipboard anywhere on the page.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const files = Array.from(e.clipboardData?.files ?? []);
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [addFiles]);

  function patchPage(id: number, p: Partial<LabelPage>) {
    setPages((list) => list.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setResult("");
  }

  function move(id: number, to: number) {
    setPages((list) => {
      const from = list.findIndex((p) => p.id === id);
      if (from < 0 || to < 0 || to >= list.length || from === to) return list;
      const next = list.slice();
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
    setResult("");
  }

  function removePage(id: number) {
    const i = pages.findIndex((p) => p.id === id);
    if (i < 0) return;
    URL.revokeObjectURL(pages[i].previewUrl);
    const next = pages.filter((p) => p.id !== id);
    setPages(next);
    if (selectedId === id) setSelectedId(next[Math.min(i, next.length - 1)]?.id ?? null);
    pageCount.current--;
    setResult("");
  }

  function clearAll() {
    stopRead.current = true;
    queue.current = [];
    for (const p of pages) URL.revokeObjectURL(p.previewUrl);
    setPages([]);
    sources.current.clear();
    pageCount.current = 0;
    setSelectedId(null);
    setNotices([]);
    setResult("");
  }

  function applyToSameSize(page: LabelPage) {
    setPages((list) => list.map((p) => (p.sizeKey === page.sizeKey ? { ...p, crop: page.crop } : p)));
    setResult("");
  }

  async function download() {
    const size = outputSize(settings.size);
    const count = pages.filter((p) => !p.skip).length;
    if (!count) return;
    stopBuild.current = false;
    setBuilding({ done: 0, total: count });
    setResult("");
    try {
      const out = await buildLabels(
        pages,
        sources.current,
        settings,
        (done, total) => setBuilding({ done, total }),
        () => stopBuild.current,
      );
      const when = new Date();
      if (settings.mode === "combined") {
        saveBlob(new Blob([out.files[0].bytes as BlobPart], { type: "application/pdf" }), outputName(size, when, "pdf"));
      } else {
        const entries = out.files.map((f) => ({ name: f.name, data: new Blob([f.bytes as BlobPart]), crc: crc32(f.bytes), size: f.bytes.length }));
        saveBlob(buildZip(entries, when), outputName(size, when, "zip"));
      }
      const labels = `${out.labels} label${out.labels === 1 ? "" : "s"}`;
      const sheets = size.slots.length > 1 ? ` on ${out.sheets} A4 sheet${out.sheets === 1 ? "" : "s"}` : "";
      const locked = out.rastered ? ` ${out.rastered} came from a locked PDF, so ${out.rastered === 1 ? "it was" : "they were"} copied as a picture at 300 dpi. Check the barcode is sharp before you print.` : "";
      setResult(`Downloaded ${labels}${sheets}.${locked}`);
    } catch (err) {
      setResult((err as Error)?.name === "AbortError" ? "Stopped. Nothing was downloaded." : "Something went wrong making the PDF. Try again, or remove the page that last showed in the progress.");
    } finally {
      setBuilding(null);
    }
  }

  if (unsupported) {
    return (
      <p className="rounded-xl border p-4 text-sm" role="alert">
        This browser cannot run the label cropper. It needs a recent version of Chrome, Edge, Firefox or Safari.
      </p>
    );
  }

  const size = outputSize(settings.size);
  const included = pages.filter((p) => !p.skip);
  const selectedIndex = pages.findIndex((p) => p.id === selectedId);
  const selected = selectedIndex >= 0 ? pages[selectedIndex] : null;
  const sameSize = selected ? pages.filter((p) => p.sizeKey === selected.sizeKey && p.id !== selected.id).length : 0;
  const busy = !!reading || !!building;

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Shipping labels carry names and addresses, so they never leave your device. Your PDFs and pictures are read and cropped in your browser, and nothing is uploaded.
        </span>
      </p>

      <div
        className={cn("rounded-xl border bg-card p-4", dragging && "ring-2 ring-brand")}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragging(false);
          addFiles(Array.from(e.dataTransfer.files));
        }}
        data-testid="lc-dropzone"
      >
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
          <FileUp className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Drop label PDFs or pictures here, or paste one</p>
          <p className="text-muted-foreground">
            PDF, PNG, JPEG or WebP. Up to {MAX_PAGES} pages in total and {MAX_FILE_MB} MB a file.
          </p>
          <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 hover:bg-primary/80 sm:min-h-0">
            <FileUp className="size-4" aria-hidden /> Choose files
            <input
              type="file"
              accept="application/pdf,.pdf,image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              aria-label="Choose label files"
              onChange={(e) => {
                addFiles(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
        </div>
        {notices.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-destructive" role="alert">
            {notices.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      <div aria-live="polite" className="text-sm">
        {reading && (
          <div className="rounded-xl border bg-card p-4" data-testid="lc-reading">
            <p className="flex items-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              Reading file {Math.min(reading.filesDone + 1, reading.filesTotal)} of {reading.filesTotal}, {pages.length} page{pages.length === 1 ? "" : "s"} so far
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Files read" aria-valuemin={0} aria-valuemax={reading.filesTotal} aria-valuenow={reading.filesDone}>
              <div className="h-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${(reading.filesDone / Math.max(1, reading.filesTotal)) * 100}%` }} />
            </div>
            <Button type="button" size="sm" variant="outline" className={cn("mt-3", tap)} onClick={() => (stopRead.current = true)}>
              <Square aria-hidden /> Stop reading
            </Button>
          </div>
        )}
      </div>

      {selected && (
        <section aria-labelledby="lc-editor" className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="lc-editor" className="text-base font-semibold">
              Label {selectedIndex + 1} of {pages.length}
              <span className="block text-sm font-normal break-all text-muted-foreground">{pageName(selected)}</span>
            </h2>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="outline" className={tap} disabled={selectedIndex <= 0} onClick={() => setSelectedId(pages[selectedIndex - 1].id)}>
                <ChevronLeft aria-hidden /> Previous
              </Button>
              <Button type="button" size="sm" variant="outline" className={tap} disabled={selectedIndex >= pages.length - 1} onClick={() => setSelectedId(pages[selectedIndex + 1].id)}>
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {selected.blank
              ? "Nothing was found on this page, so it is skipped. Draw a crop and include it if it does hold a label."
              : "Drag the box or its corners to fit the label. With the keyboard, focus the box or a corner and use the arrow keys, with Shift for bigger steps."}
          </p>
          <CropEditor page={selected} onChange={(crop) => patchPage(selected.id, { crop })} />
          <p className="text-sm" data-testid="lc-crop-size">
            Crop: {describeCrop(selected.crop, selected.shownW, selected.shownH, selected.kind === "pdf" ? "pt" : "px")}
            {selected.detected && sameRect(selected.detected, selected.crop) ? ", as found" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" className={tap} disabled={!selected.detected || sameRect(selected.detected, selected.crop)} onClick={() => patchPage(selected.id, { crop: selected.detected! })}>
              <RotateCcw aria-hidden /> Reset to detected
            </Button>
            <Button type="button" size="sm" variant="outline" className={cn("h-auto min-h-7 max-w-full shrink py-1 text-left whitespace-normal", tap)} disabled={sameSize === 0} onClick={() => applyToSameSize(selected)}>
              Apply this crop to all pages with the same page size{sameSize ? ` (${sameSize} more)` : ""}
            </Button>
            <Button type="button" size="sm" variant={selected.skip ? "default" : "outline"} className={tap} aria-pressed={selected.skip} onClick={() => patchPage(selected.id, { skip: !selected.skip })}>
              <EyeOff aria-hidden /> {selected.skip ? "Skipped: include this page" : "Skip this page"}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-labelledby="lc-quick">
            <span id="lc-quick" className="text-muted-foreground">
              Quick crops:
            </span>
            {QUICK_CROPS.map((q) => (
              <Button key={q.id} type="button" size="xs" variant="ghost" className={cn("underline-offset-2 hover:underline", tap)} onClick={() => patchPage(selected.id, { crop: q.rect })}>
                {q.label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {pages.length > 0 && (
        <section aria-labelledby="lc-pages" className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="lc-pages" className="text-base font-semibold">
              Print order
            </h2>
            <p className="text-sm text-muted-foreground">
              {included.length} of {pages.length} page{pages.length === 1 ? "" : "s"} will print. Drag to reorder, or use the arrows.
            </p>
          </div>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Labels in print order">
            {pages.map((p, i) => (
              <li
                key={p.id}
                data-testid="lc-page"
                data-crop={JSON.stringify(p.crop)}
                data-skip={p.skip ? "true" : "false"}
                draggable
                onDragStart={(e) => {
                  setDragId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", String(p.id));
                }}
                onDragOver={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (dragId === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  move(dragId, i);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={cn("rounded-xl border bg-card p-2", p.id === selectedId && "border-brand ring-1 ring-brand", dragId === p.id && "opacity-60")}
              >
                <button
                  type="button"
                  className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border bg-muted/40 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
                  onClick={() => setSelectedId(p.id)}
                  aria-label={`Adjust label ${i + 1}: ${pageName(p)}${p.skip ? ", skipped" : ""}`}
                  aria-current={p.id === selectedId ? "true" : undefined}
                >
                  <span className={cn("relative block", p.shownW / p.shownH > 3 / 4 ? "w-full" : "h-full")} style={{ aspectRatio: `${p.shownW} / ${p.shownH}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.previewUrl} alt="" className={cn("block size-full", p.skip && "opacity-40")} />
                    {!p.skip && (
                      <span
                        className="pointer-events-none absolute border-2 border-brand"
                        style={{ left: `${p.crop.x * 100}%`, top: `${p.crop.y * 100}%`, width: `${p.crop.w * 100}%`, height: `${p.crop.h * 100}%` }}
                        aria-hidden
                      />
                    )}
                  </span>
                </button>
                <div className="mt-1.5 flex items-start gap-1">
                  <GripVertical className="mt-0.5 hidden size-4 shrink-0 cursor-grab text-muted-foreground sm:block" aria-hidden />
                  <p className="min-w-0 flex-1 text-xs">
                    <span className="font-medium">{i + 1}.</span> <span className="break-all">{pageName(p)}</span>
                    <span className="block text-muted-foreground">{p.blank && p.skip ? "Nothing found, skipped" : p.skip ? "Skipped" : p.detected && sameRect(p.detected, p.crop) ? "Label found" : "Crop set by you"}</span>
                  </p>
                </div>
                <div className="mt-1 flex justify-end gap-1">
                  <Button type="button" size="icon-sm" variant="ghost" className={tap} disabled={i === 0} onClick={() => move(p.id, i - 1)} aria-label={`Move label ${i + 1} up`}>
                    <ArrowUp aria-hidden />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" className={tap} disabled={i === pages.length - 1} onClick={() => move(p.id, i + 1)} aria-label={`Move label ${i + 1} down`}>
                    <ArrowDown aria-hidden />
                  </Button>
                  <Button type="button" size="icon-sm" variant="ghost" className={tap} onClick={() => removePage(p.id)} aria-label={`Remove label ${i + 1}`} disabled={busy}>
                    <Trash2 aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section aria-labelledby="lc-output" className="space-y-4 rounded-xl border bg-card p-4 text-sm">
        <h2 id="lc-output" className="text-base font-semibold">
          Output
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <fieldset className="space-y-1">
            <legend className="font-medium">Label size</legend>
            {OUTPUT_SIZES.map((o) => (
              <label key={o.id} className="flex min-h-11 items-center gap-2 sm:min-h-0">
                <input type="radio" name="lc-size" value={o.id} checked={settings.size === o.id} onChange={() => update({ size: o.id })} className="accent-brand" />
                {o.label}
              </label>
            ))}
          </fieldset>
          <div className="space-y-1">
            <label htmlFor="lc-margin" className="font-medium">
              Margin round each label: {settings.marginMm} mm
            </label>
            <input id="lc-margin" type="range" min={0} max={MAX_MARGIN_MM} step={0.5} value={settings.marginMm} onChange={(e) => update({ marginMm: Number(e.target.value) })} className="w-full accent-brand" />
            <p className="text-xs text-muted-foreground">Each label is turned to fit best, scaled to fill the space inside the margin, and centred.</p>
          </div>
          <fieldset className="space-y-1">
            <legend className="font-medium">Download as</legend>
            <label className="flex min-h-11 items-center gap-2 sm:min-h-0">
              <input type="radio" name="lc-mode" value="combined" checked={settings.mode === "combined"} onChange={() => update({ mode: "combined" })} className="accent-brand" />
              One PDF with every label
            </label>
            <label className="flex min-h-11 items-center gap-2 sm:min-h-0">
              <input type="radio" name="lc-mode" value="separate" checked={settings.mode === "separate"} onChange={() => update({ mode: "separate" })} className="accent-brand" />
              {size.slots.length > 1 ? "A PDF for each sheet, in a zip" : "A PDF for each label, in a zip"}
            </label>
          </fieldset>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" className={tap} onClick={() => void download()} disabled={busy || included.length === 0}>
            {building ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Download aria-hidden />}
            {included.length === 0
              ? "Download labels"
              : `Download ${included.length} label${included.length === 1 ? "" : "s"}${size.slots.length > 1 ? ` on ${sheetCount(included.length, size)} sheet${sheetCount(included.length, size) === 1 ? "" : "s"}` : ""}`}
          </Button>
          {building && (
            <Button type="button" variant="outline" className={tap} onClick={() => (stopBuild.current = true)}>
              <Square aria-hidden /> Stop
            </Button>
          )}
          {pages.length > 0 && (
            <Button type="button" variant="outline" className={tap} onClick={clearAll} disabled={!!building}>
              <Trash2 aria-hidden /> Clear everything
            </Button>
          )}
        </div>
        <div aria-live="polite">
          {building && (
            <div>
              <p>
                Making label {Math.min(building.done + 1, building.total)} of {building.total}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Labels made" aria-valuemin={0} aria-valuemax={building.total} aria-valuenow={building.done}>
                <div className="h-full bg-brand transition-[width] motion-reduce:transition-none" style={{ width: `${(building.done / Math.max(1, building.total)) * 100}%` }} />
              </div>
            </div>
          )}
          {result && (
            <p data-testid="lc-result" className="font-medium">
              {result}
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Print at &ldquo;Actual size&rdquo; or 100%, not &ldquo;Fit to page&rdquo;, so the label comes out the size it should be.</p>
      </section>
    </div>
  );
}

/* The big preview with a crop box that can be dragged, resized from its corners and edges, and nudged with the arrow keys. */
function CropEditor({ page, onChange }: { page: LabelPage; onChange: (r: Rect) => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: "move" | Handle; x: number; y: number; start: Rect; w: number; h: number } | null>(null);
  const r = page.crop;
  const aspect = page.shownW / page.shownH;

  function begin(e: React.PointerEvent<HTMLElement>) {
    const mode = e.currentTarget.dataset.mode as "move" | Handle;
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { mode, x: e.clientX, y: e.clientY, start: r, w: box.width, h: box.height };
  }

  function moveTo(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.x) / d.w;
    const dy = (e.clientY - d.y) / d.h;
    onChange(d.mode === "move" ? moveRect(d.start, dx, dy) : resizeRect(d.start, d.mode, dx, dy));
  }

  function end() {
    drag.current = null;
  }

  function key(e: React.KeyboardEvent, mode: "move" | Handle) {
    const step = e.shiftKey ? 0.05 : 0.005;
    const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
    const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    onChange(clampRect(mode === "move" ? moveRect(r, dx, dy) : resizeRect(r, mode, dx, dy)));
  }

  const corners: { h: Handle; name: string; left: number; top: number; cursor: string }[] = [
    { h: "nw", name: "top left", left: 0, top: 0, cursor: "cursor-nwse-resize" },
    { h: "ne", name: "top right", left: 1, top: 0, cursor: "cursor-nesw-resize" },
    { h: "sw", name: "bottom left", left: 0, top: 1, cursor: "cursor-nesw-resize" },
    { h: "se", name: "bottom right", left: 1, top: 1, cursor: "cursor-nwse-resize" },
  ];
  const edges: { h: Handle; cls: string; cursor: string }[] = [
    { h: "n", cls: "inset-x-4 -top-2 h-4", cursor: "cursor-ns-resize" },
    { h: "s", cls: "inset-x-4 -bottom-2 h-4", cursor: "cursor-ns-resize" },
    { h: "w", cls: "inset-y-4 -left-2 w-4", cursor: "cursor-ew-resize" },
    { h: "e", cls: "inset-y-4 -right-2 w-4", cursor: "cursor-ew-resize" },
  ];
  const pct = (v: number) => `${Math.round(v * 1000) / 10}%`;

  return (
    <div className="mx-auto select-none" style={{ width: `min(100%, calc(60vh * ${aspect}))` }}>
      <div ref={frame} className="relative rounded-md border bg-background" data-testid="lc-editor-frame">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={page.previewUrl} alt={`Page preview: ${pageName(page)}`} className="block w-full rounded-md" draggable={false} />
        {/* Shade outside the crop. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-background/70" style={{ height: pct(r.y) }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/70" style={{ height: pct(1 - r.y - r.h) }} />
        <div className="pointer-events-none absolute left-0 bg-background/70" style={{ top: pct(r.y), height: pct(r.h), width: pct(r.x) }} />
        <div className="pointer-events-none absolute right-0 bg-background/70" style={{ top: pct(r.y), height: pct(r.h), width: pct(1 - r.x - r.w) }} />
        <div
          role="group"
          aria-roledescription="crop box"
          aria-label={`Crop box, ${pct(r.x)} from the left and ${pct(r.y)} from the top, ${pct(r.w)} wide and ${pct(r.h)} tall. Arrow keys move it.`}
          tabIndex={0}
          data-testid="lc-crop-box"
          className="absolute cursor-move touch-none border-2 border-brand outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
          style={{ left: pct(r.x), top: pct(r.y), width: pct(r.w), height: pct(r.h) }}
          onKeyDown={(e) => key(e, "move")}
          data-mode="move"
          onPointerDown={begin}
          onPointerMove={moveTo}
          onPointerUp={end}
          onPointerCancel={end}
        >
          {edges.map((ed) => (
            <span
              key={ed.h}
              className={cn("absolute touch-none", ed.cls, ed.cursor)}
              aria-hidden
              data-mode={ed.h}
              onPointerDown={begin}
              onPointerMove={moveTo}
              onPointerUp={end}
              onPointerCancel={end}
            />
          ))}
          {corners.map((c) => (
            <span
              key={c.h}
              role="button"
              tabIndex={0}
              aria-label={`Crop box ${c.name} corner. Arrow keys resize.`}
              className={cn(
                "absolute flex size-6 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand pointer-coarse:size-11",
                c.cursor,
              )}
              style={{ left: `${c.left * 100}%`, top: `${c.top * 100}%` }}
              onKeyDown={(e) => {
                e.stopPropagation();
                key(e, c.h);
              }}
              data-mode={c.h}
              onPointerDown={begin}
              onPointerMove={moveTo}
              onPointerUp={end}
              onPointerCancel={end}
            >
              <span className="size-3 rounded-sm border-2 border-brand bg-background" aria-hidden />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

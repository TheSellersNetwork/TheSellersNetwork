"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Download, FolderDown, FolderOpen, ImageUp, Loader2, Lock, Pause, Play, RotateCcw, Square, Trash2, Wand2 } from "lucide-react";
import {
  AUTO_APPLY_LIMIT,
  DEFAULT_SETTINGS,
  DOWNLOAD_MB,
  MAX_FILE_BYTES,
  MAX_FILES,
  MODEL_BYTES,
  OUTPUT_SIDES,
  PRESETS,
  ZIP_PART_BYTES,
  applyPreset,
  describeError,
  formatDuration,
  formatMB,
  isImageFile,
  normalisePrediction,
  outputName,
  parseSettings,
  settingsKey,
  timeLeft,
  toBytes,
  type Placement,
  type PresetId,
  type Settings,
} from "@/lib/tools/background-remover";
import { buildZip, splitIntoParts, uniqueName } from "@/lib/tools/zip";
import { autoAlpha, compose, decode, editData, finalAlpha, modelInput, renderBefore, type EditData } from "@/components/tools/background-remover-pipeline";
import { TouchUpEditor } from "@/components/tools/background-remover-editor";
import { startEngine, type Engine } from "@/components/tools/background-remover-engine";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "tsn-background-remover-settings";

type Status = "waiting" | "working" | "done" | "error" | "cancelled";

type Result = {
  blob: Blob;
  crc: number;
  name: string;
  width: number;
  height: number;
  thumbUrl: string;
  placement: Placement;
  key: string;
};

type Item = {
  id: number;
  file: File;
  status: Status;
  error?: string;
  /* The model's 320px mask as bytes (100 KB), kept so settings and touch-ups do not rerun the model. */
  prob?: Uint8Array;
  /* Touch-up layer at the mask's working size, only for photos that were touched up. */
  edits?: Uint8Array;
  result?: Result;
  /* Name used in the chosen folder, so a re-export overwrites the same file. */
  savedAs?: string;
};

type View = {
  list: Item[];
  eta: number | null;
  clock: Clock;
  avgInfer: number;
  avgPhoto: number;
};
/* Batch timing: when it started, time spent paused, and when it finished (0 while running). */
type Clock = { started: number; pausedAt: number; pausedTotal: number; ended: number };
const NEW_CLOCK: Clock = { started: 0, pausedAt: 0, pausedTotal: 0, ended: 0 };
const EMPTY_VIEW: View = { list: [], eta: null, clock: NEW_CLOCK, avgInfer: 0, avgPhoto: 0 };

type EngineState = { state: "idle" | "loading" | "ready" | "error"; loaded: number; backend?: "webgpu" | "wasm"; threads?: number; message?: string };

/* The File System Access API, where the browser has it (Chrome and Edge on computers). */
type DirHandle = { name: string; getFileHandle(name: string, o: { create: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
type PickerWindow = Window & { showDirectoryPicker?: (o?: { mode?: "readwrite"; id?: string }) => Promise<DirHandle> };

const checkerboard = {
  backgroundImage: "conic-gradient(var(--muted) 25%, transparent 0 50%, var(--muted) 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
};

function supported() {
  return typeof window !== "undefined" && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof createImageBitmap !== "undefined";
}

/* Every file in a dropped folder, including subfolders. */
async function filesFromEntry(entry: FileSystemEntry, out: File[], limit: number): Promise<void> {
  if (out.length >= limit) return;
  if (entry.isFile) {
    const file = await new Promise<File | null>((res) => (entry as FileSystemFileEntry).file(res, () => res(null)));
    if (file) out.push(file);
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res) => reader.readEntries(res, () => res([])));
      if (batch.length === 0) break;
      for (const e of batch) await filesFromEntry(e, out, limit);
      if (out.length >= limit) break;
    }
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

export function BackgroundRemover() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [engine, setEngine] = useState<EngineState>({ state: "idle", loaded: 0 });
  const [notice, setNotice] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [paused, setPaused] = useState(false);
  const [running, setRunning] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [canPickFolder, setCanPickFolder] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [view, setView] = useState<View>(EMPTY_VIEW);
  const [now, setNow] = useState(0);

  const items = useRef<Item[]>([]);
  const settingsRef = useRef(settings);
  const engineRef = useRef<Engine | null>(null);
  const readyRef = useRef<Promise<Engine> | null>(null);
  const busy = useRef(false);
  const pausedRef = useRef(false);
  const nextId = useRef(1);
  const durations = useRef<number[]>([]);
  const inferMs = useRef<number[]>([]);
  const clock = useRef<Clock>({ ...NEW_CLOCK });
  const dir = useRef<DirHandle | null>(null);
  const folderNames = useRef(new Set<string>());
  const frame = useRef(0);

  /*
    The list lives in a ref (so the batch loop can update it without waiting
    for React) and is copied into state at most ten times a second for display, so
    a batch of hundreds does not flood React.
  */
  const bump = useCallback(() => {
    if (frame.current) return;
    // A timer rather than requestAnimationFrame, so the list is current when someone comes back to a background tab.
    frame.current = window.setTimeout(() => {
      frame.current = 0;
      const avg = (a: number[]) => (a.length ? a.slice(-20).reduce((x, y) => x + y, 0) / Math.min(20, a.length) : 0);
      setView({
        list: items.current.map((i) => ({ ...i })),
        eta: timeLeft(durations.current, items.current.filter((i) => i.status === "waiting" || i.status === "working").length),
        clock: { ...clock.current },
        avgInfer: avg(inferMs.current),
        avgPhoto: avg(durations.current),
      });
    }, 100);
  }, []);

  const patch = useCallback(
    (id: number, p: Partial<Item>) => {
      const it = items.current.find((i) => i.id === id);
      if (it) Object.assign(it, p);
      bump();
    },
    [bump],
  );

  useEffect(() => {
    // Checked after mount so the server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!supported()) setUnsupported(true);
    setCanPickFolder(typeof (window as PickerWindow).showDirectoryPicker === "function");
    try {
      setSettings(parseSettings(localStorage.getItem(STORAGE_KEY)));
    } catch {
      // Storage blocked: keep the defaults.
    }
    setHydrated(true);
    // The same array for the life of the component (clearAll empties it in place).
    const list = items.current;
    return () => {
      engineRef.current?.dispose();
      for (const it of list) if (it.result) URL.revokeObjectURL(it.result.thumbUrl);
    };
  }, []);

  useEffect(() => {
    // Only after the saved settings have been read, or the defaults would overwrite them.
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing or storage full: settings just are not remembered.
    }
  }, [settings, hydrated]);

  /* Download the model and start the engine, the first time a photo is picked. */
  const ensureEngine = useCallback((): Promise<Engine> => {
    if (readyRef.current) return readyRef.current;
    setEngine({ state: "loading", loaded: 0 });
    readyRef.current = startEngine((loaded) => setEngine((s) => ({ ...s, loaded })))
      .then((e) => {
        engineRef.current = e;
        setEngine({ state: "ready", loaded: MODEL_BYTES, backend: e.info.backend, threads: e.info.threads });
        return e;
      })
      .catch((err) => {
        readyRef.current = null;
        setEngine({ state: "error", loaded: 0, message: describeError(err) });
        throw err;
      });
    return readyRef.current;
  }, []);

  const infer = useCallback(
    async (input: Float32Array) => {
      const e = await ensureEngine();
      const { output, ms } = await e.run(input);
      inferMs.current.push(ms);
      // The worker may have switched from WebGPU to WASM after a graphics error.
      if (e.info.backend !== "webgpu") setEngine((s) => (s.backend === e.info.backend ? s : { ...s, backend: e.info.backend }));
      return output;
    },
    [ensureEngine],
  );

  /* Writes one result into the chosen folder, if there is one. */
  const writeToFolder = useCallback(async (it: Item) => {
    const d = dir.current;
    if (!d || !it.result) return;
    const name = it.savedAs ?? uniqueName(it.result.name, folderNames.current);
    const handle = await d.getFileHandle(name, { create: true });
    const w = await handle.createWritable();
    await w.write(it.result.blob);
    await w.close();
    it.savedAs = name;
  }, []);

  /* Runs the model if needed, then draws and encodes the result. One full-size photo in memory at a time. */
  const render = useCallback(
    async (it: Item, s: Settings) => {
      const bmp = await decode(it.file);
      try {
        if (!it.prob) {
          await ensureEngine();
          it.prob = toBytes(normalisePrediction(await infer(modelInput(bmp))));
        }
        const photo = editData(bmp);
        const alpha = finalAlpha(autoAlpha(photo, it.prob, s), it.edits);
        const r = await compose(bmp, photo, alpha, s);
        const old = it.result;
        const name = outputName(it.file.name, s.background);
        if (it.savedAs && old && old.name !== name) it.savedAs = undefined;
        it.result = { blob: r.blob, crc: r.crc, name, width: r.width, height: r.height, thumbUrl: URL.createObjectURL(r.thumb), placement: r.placement, key: settingsKey(s) };
        if (old) URL.revokeObjectURL(old.thumbUrl);
      } finally {
        bmp.close();
      }
      await writeToFolder(it);
    },
    [ensureEngine, infer, writeToFolder],
  );

  const needsWork = (it: Item, key: string, all: boolean) =>
    it.status === "waiting" || (all && it.status === "done" && !!it.result && it.result.key !== key);

  /* Work through the list one photo at a time. */
  const pump = useCallback(
    async (applyToFinished = false) => {
      if (busy.current) return;
      busy.current = true;
      setRunning(true);
      // A new batch starts the clock again; more work on the same batch carries on from where it was.
      if (!clock.current.started || clock.current.ended) clock.current = { ...NEW_CLOCK, started: performance.now() };
      try {
        for (;;) {
          if (pausedRef.current) break;
          const s = settingsRef.current;
          const key = settingsKey(s);
          const all = applyToFinished || items.current.length <= AUTO_APPLY_LIMIT;
          const it = items.current.find((i) => needsWork(i, key, all));
          if (!it) break;
          const firstRun = !it.prob;
          patch(it.id, { status: "working", error: undefined });
          const t0 = performance.now();
          try {
            await render(it, s);
            if (!items.current.includes(it)) continue; // removed while working
            if (firstRun) durations.current.push(performance.now() - t0);
            patch(it.id, { status: "done" });
          } catch (err) {
            if (firstRun && readyRef.current === null) {
              // The engine failed to load: leave the rest waiting so they can be retried.
              patch(it.id, { status: "waiting" });
              break;
            }
            patch(it.id, { status: "error", error: describeError(err) });
          }
        }
      } finally {
        busy.current = false;
        setRunning(false);
        if (!items.current.some((i) => i.status === "waiting")) clock.current.ended = performance.now();
        bump();
      }
    },
    [patch, render, bump],
  );

  // Settings changes: small batches are redone straight away, bigger ones wait for "Apply".
  useEffect(() => {
    settingsRef.current = settings;
    const t = setTimeout(() => void pump(), 300);
    return () => clearTimeout(t);
  }, [settings, pump]);

  // A clock for elapsed time and time left while working.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  function addFiles(list: File[]) {
    setNotice("");
    const notes: string[] = [];
    const room = MAX_FILES - items.current.length;
    let added = 0;
    let skipped = 0;
    for (const f of list) {
      if (!isImageFile(f)) {
        skipped++;
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        notes.push(`${f.name} is over ${formatMB(MAX_FILE_BYTES)}.`);
        continue;
      }
      if (added >= room) {
        notes.push(`Only ${MAX_FILES} photos at a time. Download these, then clear the list to do more.`);
        break;
      }
      items.current.push({ id: nextId.current++, file: f, status: "waiting" });
      added++;
    }
    if (skipped) notes.push(`${skipped} file${skipped === 1 ? " was" : "s were"} not a photo and ${skipped === 1 ? "was" : "were"} skipped.`);
    setNotice(notes.slice(0, 4).join(" "));
    if (added) {
      bump();
      void pump();
    }
  }

  // Paste a photo from the clipboard anywhere on the page.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      e.preventDefault();
      const stamp = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
      addFiles(files.map((f, i) => new File([f], `pasted-photo-${stamp}${files.length > 1 ? `-${i + 1}` : ""}.${f.type.split("/")[1] || "png"}`, { type: f.type })));
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const out: File[] = [];
    const entries = Array.from(e.dataTransfer.items ?? [])
      .map((i) => (typeof i.webkitGetAsEntry === "function" ? i.webkitGetAsEntry() : null))
      .filter((x): x is FileSystemEntry => !!x);
    if (entries.length) for (const en of entries) await filesFromEntry(en, out, MAX_FILES * 2);
    else out.push(...Array.from(e.dataTransfer.files));
    addFiles(out);
  }

  function pause() {
    pausedRef.current = true;
    clock.current.pausedAt = performance.now();
    setPaused(true);
    bump();
  }

  function resume() {
    pausedRef.current = false;
    if (clock.current.pausedAt) clock.current.pausedTotal += performance.now() - clock.current.pausedAt;
    clock.current.pausedAt = 0;
    setPaused(false);
    void pump();
  }

  function cancel() {
    for (const it of items.current) if (it.status === "waiting") Object.assign(it, { status: "cancelled" });
    pausedRef.current = false;
    setPaused(false);
    bump();
  }

  function retry() {
    for (const it of items.current) if (it.status === "error" || it.status === "cancelled") Object.assign(it, { status: "waiting", error: undefined });
    bump();
    void pump();
  }

  function remove(id: number) {
    const i = items.current.findIndex((x) => x.id === id);
    if (i < 0) return;
    const [it] = items.current.splice(i, 1);
    if (it.result) URL.revokeObjectURL(it.result.thumbUrl);
    bump();
  }

  function clearAll() {
    for (const it of items.current) if (it.result) URL.revokeObjectURL(it.result.thumbUrl);
    items.current.length = 0;
    durations.current = [];
    folderNames.current = new Set();
    clock.current = { ...NEW_CLOCK };
    setNotice("");
    bump();
  }

  async function chooseFolder() {
    try {
      const d = await (window as PickerWindow).showDirectoryPicker!({ mode: "readwrite", id: "background-remover" });
      dir.current = d;
      folderNames.current = new Set();
      for (const it of items.current) Object.assign(it, { savedAs: undefined });
      setFolder(d.name);
      // Save what is already finished.
      for (const it of items.current) if (it.status === "done") await writeToFolder(it);
      bump();
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") setNotice(describeError(err));
    }
  }

  function stopFolder() {
    dir.current = null;
    setFolder(null);
  }

  const done = view.list.filter((i) => i.status === "done" && i.result);
  const zipFiles = (() => {
    const used = new Set<string>();
    return done.map((i) => ({ item: i, name: uniqueName(i.result!.name, used), size: i.result!.blob.size }));
  })();
  const parts = splitIntoParts(zipFiles, ZIP_PART_BYTES);

  function downloadPart(k: number) {
    const entries = parts[k].map((i) => ({ name: zipFiles[i].name, data: zipFiles[i].item.result!.blob, crc: zipFiles[i].item.result!.crc, size: zipFiles[i].size }));
    const name = parts.length > 1 ? `photos-no-background-part-${k + 1}-of-${parts.length}.zip` : "photos-no-background.zip";
    saveBlob(buildZip(entries), name);
  }

  function update(s: Partial<Settings>) {
    setSettings((prev) => {
      const next = { ...prev, ...s };
      return { ...next, preset: s.preset !== undefined ? s.preset : prev.preset && ["aspect", "outputSide", "background"].some((k) => k in s) ? null : prev.preset };
    });
  }

  const list = view.list;
  const total = list.length;
  const counts = { done: 0, working: 0, waiting: 0, error: 0, cancelled: 0 };
  for (const it of list) counts[it.status]++;
  const key = settingsKey(settings);
  const outOfDate = done.filter((i) => i.result!.key !== key).length;
  const remaining = counts.waiting + counts.working;
  const eta = view.eta;
  const c = view.clock;
  const elapsed = c.started ? Math.max(0, (c.ended || (paused && c.pausedAt) || now) - c.started - c.pausedTotal) : 0;
  const pct = Math.min(100, Math.round((engine.loaded / MODEL_BYTES) * 100));
  const { avgInfer, avgPhoto } = view;
  const open = list.find((i) => i.id === openId) ?? null;
  const matched = settings.preset ? PRESETS.find((p) => p.id === settings.preset) : null;

  if (unsupported) {
    return (
      <p className="rounded-xl border p-4 text-sm" role="alert">
        This browser cannot run the background remover. It needs a recent version of Chrome, Edge, Firefox or Safari.
      </p>
    );
  }

  const radio = <T extends string | number>(name: string, value: T, current: T, label: string, onPick: () => void) => (
    <label key={String(value)} className="flex items-center gap-2">
      <input type="radio" name={name} value={String(value)} checked={current === value} onChange={onPick} className="accent-brand" />
      {label}
    </label>
  );

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your photos never leave your device. The background is removed in your browser, and nothing is uploaded.
      </p>

      <div
        className={cn("rounded-xl border bg-card p-4", dragging && "ring-2 ring-brand")}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => void onDrop(e)}
        data-testid="bg-dropzone"
      >
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm">
          <ImageUp className="size-6 text-muted-foreground" aria-hidden />
          <p className="font-medium">Drop photos or a folder here, or paste a photo</p>
          <p className="text-muted-foreground">JPEG, PNG or WebP. Up to {MAX_FILES} photos at a time.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2 hover:bg-primary/80">
              <ImageUp className="size-4" aria-hidden /> Choose photos
              <input
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                aria-label="Choose photos"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium focus-within:ring-2 focus-within:ring-brand hover:bg-muted">
              <FolderOpen className="size-4" aria-hidden /> Choose a folder
              <input
                type="file"
                multiple
                className="sr-only"
                aria-label="Choose a folder of photos"
                {...{ webkitdirectory: "" }}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
            <label className="hidden cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-medium focus-within:ring-2 focus-within:ring-brand hover:bg-muted pointer-coarse:inline-flex">
              <Camera className="size-4" aria-hidden /> Take a photo
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                aria-label="Take a photo"
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
        {notice && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {notice}
          </p>
        )}
      </div>

      <section aria-labelledby="bg-settings" className="space-y-4 rounded-xl border bg-card p-4">
        <h2 id="bg-settings" className="text-sm font-medium">
          Settings for every photo
        </h2>
        <div>
          <p className="text-sm font-medium" id="bg-presets">
            Platform presets
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="bg-presets">
            {PRESETS.map((p) => (
              <Button
                key={p.id}
                type="button"
                size="sm"
                variant={settings.preset === p.id ? "default" : "outline"}
                aria-pressed={settings.preset === p.id}
                onClick={() => setSettings((s) => applyPreset(s, p.id as PresetId))}
              >
                {p.label}
              </Button>
            ))}
          </div>
          {matched && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="bg-preset-note">
              {matched.source ? (
                <>
                  {matched.source.says}{" "}
                  <a href={matched.source.url} target="_blank" rel="noopener noreferrer" className="underline">
                    {matched.label} help page
                  </a>
                  .
                </>
              ) : (
                <>{matched.label} does not publish a recommended photo size that we could find, so this preset is our own sensible default: {matched.aspect === "4:5" ? "portrait 4:5" : "square"}, {matched.outputSide} pixels on the longest side, white background.</>
              )}
            </p>
          )}
        </div>

        <div className="grid gap-4 text-sm sm:grid-cols-3">
          <fieldset className="space-y-1">
            <legend className="font-medium">Background</legend>
            {radio("bg-background", "white", settings.background, "White (JPEG)", () => update({ background: "white" }))}
            {radio("bg-background", "grey", settings.background, "Light grey (JPEG)", () => update({ background: "grey" }))}
            {radio("bg-background", "transparent", settings.background, "Transparent (PNG)", () => update({ background: "transparent" }))}
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="font-medium">Shape</legend>
            {radio("bg-aspect", "1:1", settings.aspect, "Square (1:1)", () => update({ aspect: "1:1" }))}
            {radio("bg-aspect", "4:5", settings.aspect, "Portrait (4:5)", () => update({ aspect: "4:5" }))}
          </fieldset>
          <div className="space-y-1">
            <label htmlFor="bg-size" className="font-medium">
              Size (longest side)
            </label>
            <select
              id="bg-size"
              value={settings.outputSide}
              onChange={(e) => update({ outputSide: Number(e.target.value) as Settings["outputSide"] })}
              className="h-9 w-full rounded-md border bg-background px-2"
            >
              {OUTPUT_SIDES.map((v) => (
                <option key={v} value={v}>
                  {v === 0 ? "Automatic (up to 2000 pixels)" : `${v} pixels`}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Small photos made bigger will look soft.</p>
          </div>
          <div className="space-y-1">
            <label htmlFor="bg-padding" className="font-medium">
              Space around the item: {settings.padding}%
            </label>
            <input id="bg-padding" type="range" min={0} max={25} value={settings.padding} onChange={(e) => update({ padding: Number(e.target.value) })} className="w-full accent-brand" />
          </div>
          <div className="space-y-1">
            <label htmlFor="bg-softness" className="font-medium">
              Edge softness: {settings.softness}
            </label>
            <input
              id="bg-softness"
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.softness}
              onChange={(e) => update({ softness: Number(e.target.value) })}
              className="w-full accent-brand"
              aria-describedby="bg-softness-help"
            />
            <p id="bg-softness-help" className="text-xs text-muted-foreground">
              Lower for crisp edges, higher if you see a hard outline or a halo.
            </p>
          </div>
          <div className="space-y-1">
            <label className="flex items-center gap-2 font-medium">
              <input type="checkbox" checked={settings.shadow} onChange={(e) => update({ shadow: e.target.checked })} className="accent-brand" disabled={settings.background === "transparent"} />
              Soft shadow
            </label>
            <label htmlFor="bg-shadow" className="sr-only">
              Shadow strength
            </label>
            <input
              id="bg-shadow"
              type="range"
              min={10}
              max={100}
              step={5}
              value={settings.shadowStrength}
              onChange={(e) => update({ shadowStrength: Number(e.target.value) })}
              className="w-full accent-brand"
              disabled={!settings.shadow || settings.background === "transparent"}
            />
            <p className="text-xs text-muted-foreground">{settings.background === "transparent" ? "For white and grey backgrounds only." : `Strength ${settings.shadowStrength}`}</p>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={settings.cleanup} onChange={(e) => update({ cleanup: e.target.checked })} className="mt-1 accent-brand" />
            <span>
              <span className="font-medium">Tidy the cut-out.</span> <span className="text-muted-foreground">Removes small stray specks and fills small gaps inside the item.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={settings.refine} onChange={(e) => update({ refine: e.target.checked })} className="mt-1 accent-brand" />
            <span>
              <span className="font-medium">Sharpen edges to the photo.</span> <span className="text-muted-foreground">Makes the edge follow the item&rsquo;s real outline instead of looking blurry or blocky.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="checkbox" checked={settings.enhance} onChange={(e) => update({ enhance: e.target.checked })} className="mt-1 accent-brand" />
            <span>
              <span className="font-medium">Auto enhance.</span>{" "}
              <span className="text-muted-foreground">
                Brightens the item a little and takes out a colour cast, using the removed background as the reference for white. Best on photos taken against something white or light grey. Check colours are still true to the item.
              </span>
            </span>
          </label>
        </div>
        {outOfDate > 0 && !running && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
            <span>
              {outOfDate} finished photo{outOfDate === 1 ? " was" : "s were"} made with different settings.
            </span>
            <Button type="button" size="sm" onClick={() => void pump(true)}>
              Apply to {outOfDate === 1 ? "it" : `all ${outOfDate}`}
            </Button>
          </div>
        )}
      </section>

      <div aria-live="polite" className="space-y-3 text-sm">
        {engine.state === "loading" && (
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Downloading the background remover, up to about {DOWNLOAD_MB} MB. This happens once, and your browser usually keeps a copy for next time.
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Model download" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
        {engine.state === "error" && (
          <div className="rounded-xl border border-destructive/60 p-4" role="alert">
            <p>{engine.message}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void pump()}>
              Try again
            </Button>
          </div>
        )}
        {total > 0 && (
          <div className="rounded-xl border bg-card p-4" data-testid="bg-progress">
            <p className="font-medium">
              {counts.done} of {total} done
              {counts.error ? `, ${counts.error} failed` : ""}
              {counts.cancelled ? `, ${counts.cancelled} cancelled` : ""}
              {paused ? ", paused" : running ? ", working" : ""}
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Photos done" aria-valuemin={0} aria-valuemax={total} aria-valuenow={counts.done}>
              <div className="h-full bg-brand transition-all" style={{ width: `${total ? (counts.done / total) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-muted-foreground">
              {elapsed > 0 && <>{c.ended ? "Finished in" : "Time taken:"} {formatDuration(elapsed)}. </>}
              {remaining > 0 && eta !== null && <>About {formatDuration(eta)} left. </>}
              {engine.state === "ready" && (
                <>
                  Running on {engine.backend === "webgpu" ? "your graphics chip" : `your processor${engine.threads && engine.threads > 1 ? `, ${engine.threads} threads` : ""}`}
                  {avgPhoto > 0 && <>, about {(avgPhoto / 1000).toFixed(1)} seconds a photo</>}.
                </>
              )}
            </p>
            <span className="sr-only" data-testid="bg-timings" data-infer-ms={Math.round(avgInfer)} data-photo-ms={Math.round(avgPhoto)} data-backend={engine.backend ?? ""} data-threads={engine.threads ?? 0} />
            <div className="mt-3 flex flex-wrap gap-2">
              {remaining > 0 &&
                (paused ? (
                  <Button type="button" size="sm" onClick={resume}>
                    <Play aria-hidden /> Resume
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="outline" onClick={pause}>
                    <Pause aria-hidden /> Pause
                  </Button>
                ))}
              {counts.waiting > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={cancel}>
                  <Square aria-hidden /> Cancel the rest
                </Button>
              )}
              {(counts.error > 0 || counts.cancelled > 0) && !running && (
                <Button type="button" size="sm" variant="outline" onClick={retry}>
                  <RotateCcw aria-hidden /> {counts.cancelled && !counts.error ? "Carry on with the rest" : "Retry failed"}
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={clearAll} disabled={running}>
                <Trash2 aria-hidden /> Clear the list
              </Button>
            </div>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="space-y-3 rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Download</p>
          <div className="flex flex-wrap gap-2">
            {parts.length <= 1 ? (
              <Button type="button" onClick={() => downloadPart(0)} disabled={done.length === 0}>
                <Download aria-hidden /> Download all as a zip ({done.length})
              </Button>
            ) : (
              parts.map((p, k) => (
                <Button key={k} type="button" onClick={() => downloadPart(k)}>
                  <Download aria-hidden /> Part {k + 1} of {parts.length} ({p.length} photos)
                </Button>
              ))
            )}
            {canPickFolder &&
              (folder ? (
                <Button type="button" variant="outline" onClick={stopFolder}>
                  <FolderDown aria-hidden /> Stop saving to {folder}
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => void chooseFolder()}>
                  <FolderDown aria-hidden /> Save straight into a folder
                </Button>
              ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {folder
              ? `Each photo is saved into ${folder} as soon as it is finished, with -no-background added to its name.`
              : parts.length > 1
                ? `Big batches are split into zip files of about ${formatMB(ZIP_PART_BYTES)} each so your browser does not run out of memory.`
                : "Photos keep their names, with -no-background added."}
          </p>
        </div>
      )}

      {total > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Photos">
          {list.map((it) => (
            <li key={it.id} className="rounded-xl border bg-card p-2">
              <button
                type="button"
                className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:cursor-default"
                style={it.result && settings.background === "transparent" ? checkerboard : undefined}
                onClick={() => setOpenId(it.id)}
                disabled={!it.result}
                aria-label={it.result ? `Open ${it.file.name} to compare and touch up` : `${it.file.name}: ${it.status}`}
              >
                {it.result ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.result.thumbUrl} alt="" className="max-h-full max-w-full object-contain" />
                ) : it.status === "error" ? (
                  <span className="p-2 text-center text-xs text-destructive">{it.error}</span>
                ) : (
                  <span className="flex items-center gap-1.5 p-2 text-xs text-muted-foreground">
                    {it.status === "working" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                    {it.status === "working" ? "Working" : it.status === "cancelled" ? "Cancelled" : "Waiting"}
                  </span>
                )}
              </button>
              <p className="mt-1.5 truncate text-xs font-medium" title={it.file.name}>
                {it.file.name}
              </p>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground">
                  {it.status === "working" && it.result ? "Updating" : it.result ? `${it.result.width} by ${it.result.height}${it.edits ? ", touched up" : ""}` : ""}
                </span>
                <span className="flex gap-1">
                  {it.result && (
                    <Button type="button" size="icon-xs" variant="ghost" onClick={() => saveBlob(it.result!.blob, it.result!.name)} aria-label={`Download ${it.file.name}`}>
                      <Download aria-hidden />
                    </Button>
                  )}
                  <Button type="button" size="icon-xs" variant="ghost" onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`} disabled={it.status === "working"}>
                    <Trash2 aria-hidden />
                  </Button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PhotoDialog
        item={open}
        settings={settings}
        onClose={() => setOpenId(null)}
        onSaveEdits={async (id, edits) => {
          const it = items.current.find((i) => i.id === id);
          if (!it) return;
          it.edits = edits;
          patch(it.id, { status: "working" });
          try {
            await render(it, settingsRef.current);
            patch(it.id, { status: "done" });
          } catch (err) {
            patch(it.id, { status: "error", error: describeError(err) });
          }
        }}
      />
    </div>
  );
}

/* One photo: before and after slider, download, and the touch-up editor. */
function PhotoDialog({
  item,
  settings,
  onClose,
  onSaveEdits,
}: {
  item: Item | null;
  settings: Settings;
  onClose: () => void;
  onSaveEdits: (id: number, edits: Uint8Array | undefined) => Promise<void>;
}) {
  const [urls, setUrls] = useState<{ after: string; before: string | null } | null>(null);
  const [split, setSplit] = useState(50);
  const [editing, setEditing] = useState<{ photo: EditData; auto: Float32Array } | null>(null);
  const [error, setError] = useState("");
  const result = item?.result;

  useEffect(() => {
    if (!item || !result) return;
    let cancelled = false;
    const after = URL.createObjectURL(result.blob);
    let before: string | null = null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrls({ after, before: null });
    void (async () => {
      try {
        const bmp = await decode(item.file);
        const blob = await renderBefore(bmp, result.placement);
        bmp.close();
        if (cancelled) return;
        before = URL.createObjectURL(blob);
        setUrls({ after, before });
      } catch {
        // No "before" picture; the result still shows.
      }
    })();
    return () => {
      cancelled = true;
      URL.revokeObjectURL(after);
      if (before) URL.revokeObjectURL(before);
    };
  }, [item, result]);

  async function startEditing() {
    if (!item?.prob) return;
    setError("");
    try {
      const bmp = await decode(item.file);
      const photo = editData(bmp);
      bmp.close();
      setEditing({ photo, auto: autoAlpha(photo, item.prob, settings) });
    } catch (err) {
      setError(describeError(err));
    }
  }

  function close() {
    setEditing(null);
    setError("");
    onClose();
  }

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
        <DialogTitle className="pr-8 break-all">{item?.file.name}</DialogTitle>
        <DialogDescription>{editing ? "Touch up the cut-out, then save." : "Drag the slider to compare the original with the result."}</DialogDescription>
        {item && editing ? (
          <TouchUpEditor
            photo={editing.photo}
            auto={editing.auto}
            initial={item.edits}
            onCancel={() => setEditing(null)}
            onSave={async (edits) => {
              setEditing(null);
              await onSaveEdits(item.id, edits);
            }}
          />
        ) : item && result && urls ? (
          <div className="space-y-3">
            <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-lg border" style={settings.background === "transparent" ? checkerboard : undefined}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls.after} alt="After: background removed" className="block w-full" />
              {urls.before && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={urls.before} alt="Before: the original photo" className="absolute inset-0 block size-full" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }} />
              )}
              {urls.before && <div className="pointer-events-none absolute inset-y-0 w-0.5 bg-brand" style={{ left: `${split}%` }} aria-hidden />}
            </div>
            {urls.before && (
              <label className="mx-auto block max-w-lg text-sm">
                <span className="sr-only">Before and after</span>
                <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} className="w-full accent-brand" aria-label="Before and after" />
                <span className="flex justify-between text-xs text-muted-foreground" aria-hidden>
                  <span>Before</span>
                  <span>After</span>
                </span>
              </label>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => void startEditing()} disabled={item.status === "working"}>
                <Wand2 aria-hidden /> Touch up
              </Button>
              <Button type="button" onClick={() => saveBlob(result.blob, result.name)}>
                <Download aria-hidden /> Download
              </Button>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Working
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

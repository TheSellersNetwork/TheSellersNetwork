"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ImageUp, Loader2, Lock, Trash2 } from "lucide-react";
import {
  BACKGROUND_FILL,
  DOWNLOAD_MB,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_WORKING_SIDE,
  MODEL_BYTES,
  MODEL_SHA256,
  MODEL_SIZE,
  MODEL_URL,
  ORT_BASE,
  WORKER_URL,
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
  type Aspect,
  type Background,
} from "@/lib/tools/background-remover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Settings = { background: Background; aspect: Aspect; padding: number; softness: number };

type Item = {
  id: number;
  file: File;
  status: "waiting" | "working" | "done" | "error";
  error?: string;
  /* The model's 320 by 320 mask, 0..1, kept so settings changes do not rerun the model. */
  mask?: Float32Array;
  /* Settings the current result was made with. */
  madeWith?: Settings;
  url?: string;
  outName?: string;
  size?: { w: number; h: number };
};

type Engine = { state: "idle" | "loading" | "ready" | "error"; loaded: number; message?: string };

const DEFAULTS: Settings = { background: "white", aspect: "1:1", padding: 8, softness: 30 };

const checkerboard = {
  backgroundImage:
    "conic-gradient(var(--muted) 25%, transparent 0 50%, var(--muted) 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
};

function supported() {
  return (
    typeof window !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof WebAssembly !== "undefined" &&
    typeof createImageBitmap !== "undefined"
  );
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(file);
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas not available (out of memory)");
  return [c, ctx] as const;
}

/* Free a canvas's pixel memory straight away rather than waiting for garbage collection. */
function release(c: HTMLCanvasElement) {
  c.width = 0;
  c.height = 0;
}

function toBlob(c: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not make the image (out of memory)"))), mime, 0.92),
  );
}

/* Photo to the model's input: stretched to 320 by 320, as the model was trained. */
async function modelInput(file: File): Promise<Float32Array> {
  const bmp = await decode(file);
  const [c, ctx] = canvas(MODEL_SIZE, MODEL_SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, MODEL_SIZE, MODEL_SIZE);
  bmp.close();
  const data = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;
  release(c);
  return toModelInput(data);
}

/* Cut the item out with the mask and place it on the chosen background and crop. */
async function compose(file: File, mask: Float32Array, s: Settings) {
  const bmp = await decode(file);
  const size = fitWithin(bmp.width, bmp.height, MAX_WORKING_SIDE);

  const alpha = maskToAlpha(mask, s.softness);
  const [small, sctx] = canvas(MODEL_SIZE, MODEL_SIZE);
  const img = sctx.createImageData(MODEL_SIZE, MODEL_SIZE);
  for (let i = 0; i < alpha.length; i++) img.data[i * 4 + 3] = alpha[i];
  sctx.putImageData(img, 0, 0);

  const feather = featherRadius(s.softness, Math.max(size.w, size.h));
  const found = boundingBox(alpha, MODEL_SIZE, MODEL_SIZE, 128);
  const box = found
    ? expandBox(scaleBox(found, { w: MODEL_SIZE, h: MODEL_SIZE }, size), feather * 2 + Math.max(size.w, size.h) * 0.01, size)
    : { x: 0, y: 0, w: size.w, h: size.h };

  // The photo, then keep only where the scaled-up (smoothed and feathered) mask is.
  const [cut, cctx] = canvas(size.w, size.h);
  cctx.imageSmoothingQuality = "high";
  cctx.drawImage(bmp, 0, 0, size.w, size.h);
  bmp.close();
  cctx.globalCompositeOperation = "destination-in";
  if ("filter" in cctx) cctx.filter = `blur(${feather}px)`;
  cctx.drawImage(small, 0, 0, size.w, size.h);
  release(small);

  const L = layout(box, s.aspect, s.padding / 100);
  const [out, octx] = canvas(L.width, L.height);
  if (s.background !== "transparent") {
    octx.fillStyle = BACKGROUND_FILL[s.background];
    octx.fillRect(0, 0, L.width, L.height);
  }
  octx.imageSmoothingQuality = "high";
  octx.drawImage(cut, box.x, box.y, box.w, box.h, L.dx, L.dy, L.dw, L.dh);
  release(cut);
  const blob = await toBlob(out, outputType(s.background).mime);
  release(out);
  return { blob, size: { w: L.width, h: L.height } };
}

export function BackgroundRemover() {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [engine, setEngine] = useState<Engine>({ state: "idle", loaded: 0 });
  const [notice, setNotice] = useState("");
  const [unsupported, setUnsupported] = useState(false);

  const itemsRef = useRef<Item[]>([]);
  const settingsRef = useRef(settings);
  const workerRef = useRef<Worker | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const pending = useRef(new Map<number, { resolve: (v: Float32Array) => void; reject: (e: Error) => void }>());
  const busy = useRef(false);
  const nextId = useRef(1);
  const runId = useRef(1);

  const commit = useCallback((next: Item[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);
  const patch = useCallback(
    (id: number, p: Partial<Item>) => commit(itemsRef.current.map((it) => (it.id === id ? { ...it, ...p } : it))),
    [commit],
  );

  useEffect(() => {
    // Checked after mount so the server and first client render match.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!supported()) setUnsupported(true);
    const waiting = pending.current;
    return () => {
      workerRef.current?.terminate();
      waiting.clear();
      for (const it of itemsRef.current) if (it.url) URL.revokeObjectURL(it.url);
    };
  }, []);

  /* Start the worker and download the model, the first time a photo is picked. */
  const ensureEngine = useCallback((): Promise<void> => {
    if (readyRef.current) return readyRef.current;
    setEngine({ state: "loading", loaded: 0 });
    readyRef.current = new Promise<void>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(WORKER_URL, { type: "module", name: "background-remover" });
      } catch (err) {
        reject(err);
        return;
      }
      workerRef.current = worker;
      const failAll = (err: Error) => {
        for (const p of pending.current.values()) p.reject(err);
        pending.current.clear();
      };
      worker.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.type === "progress") setEngine({ state: "loading", loaded: m.loaded });
        else if (m.type === "ready") {
          setEngine({ state: "ready", loaded: MODEL_BYTES });
          resolve();
        } else if (m.type === "result") {
          pending.current.get(m.id)?.resolve(m.output);
          pending.current.delete(m.id);
        } else if (m.type === "error") {
          const err = Object.assign(new Error(m.message), { name: m.name });
          if (m.id != null) {
            pending.current.get(m.id)?.reject(err);
            pending.current.delete(m.id);
          } else reject(err);
        }
      };
      worker.onerror = (e) => {
        e.preventDefault();
        const err = new Error(e.message || "Failed to load the background remover");
        failAll(err);
        reject(err);
      };
      worker.postMessage({ type: "init", ortBase: ORT_BASE, modelUrl: MODEL_URL, modelSha256: MODEL_SHA256, modelBytes: MODEL_BYTES });
    }).catch((err) => {
      workerRef.current?.terminate();
      workerRef.current = null;
      readyRef.current = null;
      setEngine({ state: "error", loaded: 0, message: describeError(err) });
      throw err;
    });
    return readyRef.current;
  }, []);

  const infer = useCallback((input: Float32Array) => {
    const id = runId.current++;
    return new Promise<Float32Array>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      workerRef.current?.postMessage({ type: "run", id, input, size: MODEL_SIZE }, [input.buffer]);
    });
  }, []);

  /* Work through the list one photo at a time. */
  const pump = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (;;) {
        const s = settingsRef.current;
        const it = itemsRef.current.find(
          (i) => i.status === "waiting" || (i.status === "done" && i.mask && i.madeWith !== s),
        );
        if (!it) break;
        const firstRun = !it.mask;
        patch(it.id, { status: "working", error: undefined });
        try {
          let mask = it.mask;
          if (!mask) {
            await ensureEngine();
            mask = normalisePrediction(await infer(await modelInput(it.file)));
          }
          const { blob, size } = await compose(it.file, mask, s);
          const current = itemsRef.current.find((i) => i.id === it.id);
          if (!current) continue; // removed while working
          if (current.url) URL.revokeObjectURL(current.url);
          patch(it.id, {
            status: "done",
            mask,
            madeWith: s,
            url: URL.createObjectURL(blob),
            outName: outputName(it.file.name, s.background),
            size,
          });
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
    }
  }, [ensureEngine, infer, patch]);

  // Settings changes redo the finished photos (without rerunning the model), after a short pause.
  useEffect(() => {
    settingsRef.current = settings;
    const t = setTimeout(() => void pump(), 250);
    return () => clearTimeout(t);
  }, [settings, pump]);

  function onFiles(list: FileList | null) {
    setNotice("");
    if (!list || list.length === 0) return;
    const room = MAX_FILES - itemsRef.current.length;
    const notes: string[] = [];
    const added: Item[] = [];
    for (const f of Array.from(list)) {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) {
        notes.push(`${f.name} is not a JPEG, PNG or WebP photo.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        notes.push(`${f.name} is over ${MAX_FILE_BYTES / 1024 / 1024} MB.`);
        continue;
      }
      if (added.length >= room) {
        notes.push(`Only ${MAX_FILES} photos at a time. Download these, then clear the list to do more.`);
        break;
      }
      added.push({ id: nextId.current++, file: f, status: "waiting" });
    }
    setNotice(notes.join(" "));
    if (added.length) {
      commit([...itemsRef.current, ...added]);
      void pump();
    }
  }

  function retry() {
    commit(itemsRef.current.map((i) => (i.status === "error" && !i.mask ? { ...i, status: "waiting", error: undefined } : i)));
    void pump();
  }

  function remove(id: number) {
    const it = itemsRef.current.find((i) => i.id === id);
    if (it?.url) URL.revokeObjectURL(it.url);
    commit(itemsRef.current.filter((i) => i.id !== id));
  }

  function clearAll() {
    for (const it of itemsRef.current) if (it.url) URL.revokeObjectURL(it.url);
    commit([]);
    setNotice("");
  }

  function downloadAll() {
    for (const it of itemsRef.current) {
      if (it.status !== "done" || !it.url || !it.outName) continue;
      const a = document.createElement("a");
      a.href = it.url;
      a.download = it.outName;
      a.click();
    }
  }

  const done = items.filter((i) => i.status === "done").length;
  const working = items.some((i) => i.status === "working" || i.status === "waiting");
  const hasFailed = items.some((i) => i.status === "error" && !i.mask);
  const pct = Math.min(100, Math.round((engine.loaded / MODEL_BYTES) * 100));

  if (unsupported) {
    return (
      <p className="rounded-xl border p-4 text-sm" role="alert">
        This browser cannot run the background remover. It needs a recent version of Chrome, Edge, Firefox or Safari.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="flex items-start gap-2 rounded-xl border bg-card p-3 text-sm text-muted-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
        Your photos never leave your device. The background is removed in your browser, and nothing is uploaded.
      </p>

      <div className="rounded-xl border bg-card p-4">
        <label
          htmlFor="bg-files"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm focus-within:ring-2 focus-within:ring-brand hover:bg-muted/50"
        >
          <ImageUp className="size-6 text-muted-foreground" aria-hidden />
          <span className="font-medium">Choose product photos</span>
          <span className="text-muted-foreground">JPEG, PNG or WebP, up to {MAX_FILES} at a time</span>
          <input
            id="bg-files"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        {notice && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {notice}
          </p>
        )}
      </div>

      <fieldset className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-medium">Output</legend>
        <div role="radiogroup" aria-label="Background" className="space-y-1 text-sm">
          <p className="font-medium">Background</p>
          {(
            [
              ["white", "White (JPEG)"],
              ["grey", "Light grey (JPEG)"],
              ["transparent", "Transparent (PNG)"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name="bg-background"
                value={v}
                checked={settings.background === v}
                onChange={() => setSettings((s) => ({ ...s, background: v }))}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
        <div role="radiogroup" aria-label="Shape" className="space-y-1 text-sm">
          <p className="font-medium">Shape</p>
          {(
            [
              ["1:1", "Square (1:1)"],
              ["4:5", "Portrait (4:5)"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="flex items-center gap-2">
              <input
                type="radio"
                name="bg-aspect"
                value={v}
                checked={settings.aspect === v}
                onChange={() => setSettings((s) => ({ ...s, aspect: v }))}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="space-y-1 text-sm">
          <label htmlFor="bg-padding" className="font-medium">
            Space around the item: {settings.padding}%
          </label>
          <input
            id="bg-padding"
            type="range"
            min={0}
            max={25}
            step={1}
            value={settings.padding}
            onChange={(e) => setSettings((s) => ({ ...s, padding: Number(e.target.value) }))}
            className="w-full accent-brand"
          />
        </div>
        <div className="space-y-1 text-sm">
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
            onChange={(e) => setSettings((s) => ({ ...s, softness: Number(e.target.value) }))}
            className="w-full accent-brand"
            aria-describedby="bg-softness-help"
          />
          <p id="bg-softness-help" className="text-xs text-muted-foreground">
            Lower for crisp edges, higher if you can see a hard outline or a halo.
          </p>
        </div>
      </fieldset>

      <div aria-live="polite" className="space-y-2 text-sm">
        {engine.state === "loading" && (
          <div className="rounded-xl border bg-card p-4">
            <p className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Downloading the background remover, up to about {DOWNLOAD_MB} MB. This happens once, and your browser
              usually keeps a copy for next time.
            </p>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label="Model download"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
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
        {items.length > 0 && (
          <p>
            {done} of {items.length} done{working && engine.state !== "error" ? ", working..." : "."}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={downloadAll} disabled={done === 0}>
            <Download aria-hidden /> Download all ({done})
          </Button>
          {hasFailed && (
            <Button type="button" variant="outline" onClick={retry}>
              Retry failed
            </Button>
          )}
          <Button type="button" variant="outline" onClick={clearAll}>
            Clear the list
          </Button>
        </div>
      )}

      {items.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="rounded-xl border bg-card p-3">
              <div
                className={cn(
                  "flex aspect-square items-center justify-center overflow-hidden rounded-lg border",
                  settings.aspect === "4:5" && "aspect-[4/5]",
                )}
                style={it.url && it.madeWith?.background === "transparent" ? checkerboard : undefined}
              >
                {it.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt={`${it.file.name} with the background removed`} className="max-h-full max-w-full object-contain" />
                ) : it.status === "error" ? (
                  <p className="p-4 text-center text-sm text-destructive">{it.error}</p>
                ) : (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    {it.status === "working" && <Loader2 className="size-4 animate-spin" aria-hidden />}
                    {it.status === "working" ? "Removing the background" : "Waiting"}
                  </p>
                )}
              </div>
              <p className="mt-2 truncate text-sm font-medium" title={it.file.name}>
                {it.file.name}
              </p>
              {it.error && it.url && <p className="text-sm text-destructive">{it.error}</p>}
              {it.size && (
                <p className="text-xs text-muted-foreground">
                  {it.size.w} by {it.size.h} pixels{it.status === "working" ? ", updating" : ""}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {it.url && it.outName && (
                  <Button asChild size="sm">
                    <a href={it.url} download={it.outName}>
                      <Download aria-hidden /> Download
                    </a>
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={() => remove(it.id)} aria-label={`Remove ${it.file.name}`}>
                  <Trash2 aria-hidden /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

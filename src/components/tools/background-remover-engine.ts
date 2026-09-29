/*
  Runs the u2netp model for the background remover in a Web Worker, picking
  the fastest way this browser allows. All files come from this site.

    1. WebGPU (the graphics chip). Fastest by far.
    2. WASM on several processor threads. Needs the page to be cross-origin
       isolated (the route sends COOP and COEP headers for this).
    3. WASM on one thread.

  Starting threads can hang if something strips the isolation headers from
  the runtime files (an old cached copy, a proxy), so each start has a time
  limit, after which the next option is tried.
*/

import { MODEL_BYTES, MODEL_SHA256, MODEL_SIZE, MODEL_URL, ORT_BASE, WORKER_URL } from "@/lib/tools/background-remover";

export type EngineInfo = { backend: "webgpu" | "wasm"; threads: number };

export type Engine = {
  info: EngineInfo;
  run(input: Float32Array): Promise<{ output: Float32Array; ms: number }>;
  dispose(): void;
};

const START_TIMEOUT_MS = 20_000;

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/* Downloads the model with progress, and checks it is exactly the file we ship. */
export async function downloadModel(onProgress: (loaded: number) => void): Promise<Uint8Array> {
  const res = await fetch(MODEL_URL);
  if (!res.ok || !res.body) throw new Error(`Failed to load the model (${res.status})`);
  const reader = res.body.getReader();
  const bytes = new Uint8Array(MODEL_BYTES);
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (loaded + value.length > bytes.length) throw new Error("Model checksum mismatch");
    bytes.set(value, loaded);
    loaded += value.length;
    onProgress(loaded);
  }
  if (loaded !== MODEL_BYTES) throw new Error("Model checksum mismatch");
  if (crypto?.subtle && (await sha256(bytes)) !== MODEL_SHA256) throw new Error("Model checksum mismatch");
  return bytes;
}

async function gpuAvailable(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
    return !!gpu && !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

function workerEngine(model: Uint8Array, gpu: boolean, threads: number): Promise<Engine> {
  return new Promise<Engine>((resolve, reject) => {
    const worker = new Worker(WORKER_URL, { type: "module", name: "background-remover" });
    const pending = new Map<number, { resolve: (v: { output: Float32Array; ms: number }) => void; reject: (e: Error) => void }>();
    let nextId = 1;
    const info: EngineInfo = { backend: "wasm", threads: 1 };
    let ready = false;
    const giveUp = setTimeout(() => {
      worker.terminate();
      reject(new Error("Start-up timed out"));
    }, START_TIMEOUT_MS);
    const failAll = (err: Error) => {
      for (const p of pending.values()) p.reject(err);
      pending.clear();
    };
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === "ready") {
        info.backend = m.backend;
        info.threads = m.threads;
        if (ready) return;
        ready = true;
        clearTimeout(giveUp);
        resolve({
          info,
          run(input) {
            const id = nextId++;
            return new Promise((res, rej) => {
              pending.set(id, { resolve: res, reject: rej });
              worker.postMessage({ type: "run", id, input, size: MODEL_SIZE }, [input.buffer]);
            });
          },
          dispose: () => {
            failAll(new Error("Stopped"));
            worker.terminate();
          },
        });
      } else if (m.type === "result") {
        pending.get(m.id)?.resolve({ output: m.output, ms: m.ms });
        pending.delete(m.id);
      } else if (m.type === "error") {
        const err = Object.assign(new Error(m.message), { name: m.name });
        if (m.id != null) {
          pending.get(m.id)?.reject(err);
          pending.delete(m.id);
        } else {
          clearTimeout(giveUp);
          worker.terminate();
          reject(err);
        }
      }
    };
    worker.onerror = (e) => {
      e.preventDefault();
      clearTimeout(giveUp);
      failAll(new Error(e.message || "Failed to load the background remover"));
      worker.terminate();
      reject(new Error(e.message || "Failed to load the background remover"));
    };
    const copy = model.slice().buffer;
    worker.postMessage({ type: "init", ortBase: ORT_BASE, model: copy, gpu, threads }, [copy]);
  });
}

/* Downloads the model and starts the fastest engine that works here. */
export async function startEngine(onProgress: (loaded: number) => void): Promise<Engine> {
  const model = await downloadModel(onProgress);
  if (await gpuAvailable()) {
    try {
      return await workerEngine(model, true, 1);
    } catch {
      // Carry on with the processor.
    }
  }
  const cores = navigator.hardwareConcurrency || 1;
  if (self.crossOriginIsolated && cores >= 2) {
    try {
      return await workerEngine(model, false, Math.min(4, Math.ceil(cores / 2)));
    } catch {
      // Carry on with one thread.
    }
  }
  return workerEngine(model, false, 1);
}

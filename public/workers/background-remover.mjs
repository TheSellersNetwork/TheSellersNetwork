/*
  Web Worker for /tools/background-remover. It runs the u2netp model with
  ONNX Runtime Web (WASM) so the page stays responsive. Everything it loads
  comes from this site; photos never leave the device.

  Messages in:
    { type: "init", ortBase, modelUrl, modelSha256 }
    { type: "run", id, input: Float32Array (1 x 3 x size x size), size }
  Messages out:
    { type: "progress", loaded, total }       while the model downloads
    { type: "ready" }
    { type: "result", id, output: Float32Array (size x size) }
    { type: "error", id?, name, message }

  Model: U-2-Net u2netp, Apache License 2.0 (https://github.com/xuebinqin/U-2-Net),
  ONNX file from https://github.com/danielgatis/rembg/releases/tag/v0.0.0.
  Runtime: onnxruntime-web, MIT (https://github.com/microsoft/onnxruntime).
*/

let session = null;
let loading = null;

function fail(err, id) {
  self.postMessage({ type: "error", id, name: err?.name ?? "Error", message: err?.message ?? String(err) });
}

async function download(url, expectedTotal) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load the model (${res.status})`);
  // The known size, since content-length is the compressed size when the host compresses.
  const total = expectedTotal || Number(res.headers.get("content-length")) || 0;
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    self.postMessage({ type: "progress", loaded, total });
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.length;
  }
  return bytes;
}

async function sha256(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function init({ ortBase, modelUrl, modelSha256, modelBytes }) {
  const ort = await import(`${ortBase}ort.wasm.min.mjs`);
  // Load the runtime's own .mjs and .wasm from this site, not a CDN.
  ort.env.wasm.wasmPaths = ortBase;
  // Threads need cross-origin isolation, which the site does not turn on. One thread is enough here.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
  const bytes = await download(modelUrl, modelBytes);
  if (crypto?.subtle && modelSha256 && (await sha256(bytes)) !== modelSha256) {
    throw new Error("Model checksum mismatch");
  }
  session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  self.ort = ort;
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "init") {
    loading ??= init(msg);
    try {
      await loading;
      self.postMessage({ type: "ready" });
    } catch (err) {
      loading = null;
      fail(err);
    }
    return;
  }
  if (msg.type === "run") {
    try {
      if (!session) throw new Error("Model not loaded");
      const ort = self.ort;
      const tensor = new ort.Tensor("float32", msg.input, [1, 3, msg.size, msg.size]);
      const results = await session.run({ [session.inputNames[0]]: tensor });
      // The first output (d1) is the fused, most detailed saliency map.
      const out = results[session.outputNames[0]];
      const output = new Float32Array(out.data);
      for (const name of session.outputNames) results[name].dispose?.();
      tensor.dispose?.();
      self.postMessage({ type: "result", id: msg.id, output }, [output.buffer]);
    } catch (err) {
      fail(err, msg.id);
    }
  }
};

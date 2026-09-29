/*
  Web Worker for /tools/background-remover. It runs the u2netp model with
  ONNX Runtime Web off the main thread so the page stays responsive.
  Everything it loads comes from this site; photos never leave the device.

  It uses WebGPU (the graphics chip) when asked, with the WebGPU build of
  the runtime, falling back to that build's WASM backend. Otherwise the WASM
  build, on as many threads as the page asks for (threads need the page to
  be cross-origin isolated). See src/components/tools/background-remover-engine.ts.

  Messages in:
    { type: "init", ortBase, model: ArrayBuffer, gpu: boolean, threads: number }
    { type: "run", id, input: Float32Array (1 x 3 x size x size), size }
  Messages out:
    { type: "ready", backend: "webgpu" | "wasm", threads }
    { type: "result", id, output: Float32Array (size x size), ms }
    { type: "error", id?, name, message }

  Model: U-2-Net u2netp, Apache License 2.0 (https://github.com/xuebinqin/U-2-Net),
  ONNX file from https://github.com/danielgatis/rembg/releases/tag/v0.0.0.
  Runtime: onnxruntime-web, MIT (https://github.com/microsoft/onnxruntime).
*/

let ort = null;
let session = null;
let backend = "wasm";
let modelBytes = null;
let loading = null;

function fail(err, id) {
  self.postMessage({ type: "error", id, name: err?.name ?? "Error", message: err?.message ?? String(err) });
}

async function createSession(kind) {
  // A copy, because some backends take ownership of the buffer.
  return ort.InferenceSession.create(modelBytes.slice(), { executionProviders: [kind], graphOptimizationLevel: "all" });
}

async function init({ ortBase, model, gpu, threads }) {
  ort = await import(`${ortBase}${gpu ? "ort.webgpu.min.mjs" : "ort.wasm.min.mjs"}`);
  // Load the runtime's own .mjs and .wasm from this site, not a CDN.
  ort.env.wasm.wasmPaths = ortBase;
  ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, threads || 1) : 1;
  ort.env.wasm.proxy = false;
  modelBytes = new Uint8Array(model);
  if (gpu) {
    try {
      session = await createSession("webgpu");
      backend = "webgpu";
      return;
    } catch {
      // Fall through to WASM in the same runtime.
    }
  }
  session = await createSession("wasm");
  backend = "wasm";
}

async function infer(input, size) {
  const tensor = new ort.Tensor("float32", input, [1, 3, size, size]);
  try {
    const results = await session.run({ [session.inputNames[0]]: tensor });
    // The first output (d1) is the fused, most detailed saliency map.
    const out = results[session.outputNames[0]];
    const data = typeof out.getData === "function" ? await out.getData() : out.data;
    const output = new Float32Array(data);
    for (const name of session.outputNames) results[name].dispose?.();
    return output;
  } finally {
    tensor.dispose?.();
  }
}

self.onmessage = async (event) => {
  const msg = event.data;
  if (msg.type === "init") {
    loading ??= init(msg);
    try {
      await loading;
      self.postMessage({ type: "ready", backend, threads: ort.env.wasm.numThreads });
    } catch (err) {
      loading = null;
      fail(err);
    }
    return;
  }
  if (msg.type === "run") {
    const started = performance.now();
    try {
      if (!session) throw new Error("Model not loaded");
      let output;
      try {
        output = await infer(msg.input, msg.size);
      } catch (err) {
        if (backend !== "webgpu") throw err;
        // WebGPU failed mid-batch (for example the graphics driver reset): carry on with WASM.
        session = await createSession("wasm");
        backend = "wasm";
        self.postMessage({ type: "ready", backend, threads: ort.env.wasm.numThreads });
        output = await infer(msg.input, msg.size);
      }
      self.postMessage({ type: "result", id: msg.id, output, ms: performance.now() - started }, [output.buffer]);
    } catch (err) {
      fail(err, msg.id);
    }
  }
};

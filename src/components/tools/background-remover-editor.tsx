"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Eraser, Hand, Paintbrush, Redo2, RotateCcw, Undo2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { History, NEUTRAL, combineEdit, newEditLayer, stamp, strokePoints, unionRect, type Rect } from "@/lib/tools/mask-ops";
import type { EditData } from "@/components/tools/background-remover-pipeline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tool = "erase" | "restore" | "move";

const checkerboard = {
  backgroundImage: "conic-gradient(var(--muted) 25%, transparent 0 50%, var(--muted) 0 75%, transparent 0)",
  backgroundSize: "16px 16px",
};

/*
  Touch-up editor for one photo. Erase takes away leftover background,
  Restore brings back parts of the item that were cut off. Edits are kept in
  a separate layer over the automatic mask, so changing settings later keeps
  them. Removed areas show faintly so there is something to restore.
*/
export function TouchUpEditor({
  photo,
  auto,
  initial,
  onSave,
  onCancel,
}: {
  photo: EditData;
  auto: Float32Array;
  initial?: Uint8Array;
  onSave: (edits: Uint8Array | undefined) => void;
  onCancel: () => void;
}) {
  const { w, h } = photo;
  const long = Math.max(w, h);
  const [tool, setTool] = useState<Tool>("erase");
  const [size, setSize] = useState(Math.round(long * 0.03));
  const [softness, setSoftness] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [fit, setFit] = useState({ w: 0, h: 0, bw: 0, bh: 0 });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const box = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLCanvasElement>(null);
  const top = useRef<HTMLCanvasElement>(null);
  const layer = useRef<Uint8Array>(initial ? initial.slice() : newEditLayer(w * h));
  const history = useRef(new History(30));
  const view = useRef<ImageData | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const stroke = useRef<{ before: Uint8Array; last: [number, number] } | null>(null);
  const gesture = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null);
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  const syncHistory = () => {
    setCanUndo(history.current.canUndo);
    setCanRedo(history.current.canRedo);
  };

  const redraw = useCallback(
    (r: Rect | null) => {
      const ctx = top.current?.getContext("2d");
      const v = view.current;
      if (!ctx || !v) return;
      const rect = r ?? { x: 0, y: 0, w, h };
      const L = layer.current;
      for (let y = rect.y; y < rect.y + rect.h; y++) {
        for (let x = rect.x; x < rect.x + rect.w; x++) {
          const i = y * w + x;
          v.data[i * 4 + 3] = combineEdit(auto[i], L[i]) * 255;
        }
      }
      ctx.putImageData(v, 0, 0, rect.x, rect.y, rect.w, rect.h);
    },
    [auto, w, h],
  );

  // Draw the faint photo underneath and the cut-out on top.
  useEffect(() => {
    const b = base.current?.getContext("2d");
    const t = top.current?.getContext("2d");
    if (!b || !t) return;
    const img = new ImageData(new Uint8ClampedArray(photo.rgba), w, h);
    b.putImageData(img, 0, 0);
    view.current = new ImageData(new Uint8ClampedArray(photo.rgba), w, h);
    redraw(null);
    return () => {
      view.current = null;
    };
  }, [photo, w, h, redraw]);

  // Fit the photo into the editing area.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const bw = el.clientWidth;
      const bh = el.clientHeight;
      const k = Math.min(bw / w, bh / h);
      setFit({ w: w * k, h: h * k, bw, bh });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const centreOffset = { x: (fit.bw - fit.w) / 2, y: (fit.bh - fit.h) / 2 };

  const toImage = (clientX: number, clientY: number): [number, number] => {
    const r = top.current!.getBoundingClientRect();
    return [((clientX - r.left) / r.width) * w, ((clientY - r.top) / r.height) * h];
  };

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = (clientX ?? r.left + r.width / 2) - r.left;
    const cy = (clientY ?? r.top + r.height / 2) - r.top;
    const z0 = zoomRef.current;
    const z1 = Math.min(12, Math.max(1, z0 * factor));
    const p = panRef.current;
    // Keep the point under the cursor still.
    const next = { x: cx - ((cx - p.x) * z1) / z0, y: cy - ((cy - p.y) * z1) / z0 };
    zoomRef.current = z1;
    panRef.current = next;
    setPan(next);
    setZoom(z1);
  }, []);

  function resetView() {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const hardness = 1 - softness / 100;
  const radius = size / 2;

  function dab(pts: [number, number][]) {
    let rect: Rect | null = null;
    for (const [x, y] of pts) rect = unionRect(rect, stamp(layer.current, w, h, x, y, radius, hardness, tool === "restore" ? "restore" : "erase"));
    if (rect) redraw(rect);
  }

  function cancelStroke() {
    if (!stroke.current) return;
    layer.current.set(stroke.current.before);
    stroke.current = null;
    redraw(null);
  }

  function onPointerDown(e: React.PointerEvent) {
    box.current?.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      // Two fingers: pinch to zoom and drag to pan, and forget any stroke just started.
      cancelStroke();
      const [a, b] = [...pointers.current.values()];
      gesture.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      return;
    }
    if (tool === "move" || e.button === 1 || e.button === 2) return;
    const p = toImage(e.clientX, e.clientY);
    stroke.current = { before: layer.current.slice(), last: p };
    dab([p]);
  }

  function onPointerMove(e: React.PointerEvent) {
    const r = box.current!.getBoundingClientRect();
    setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const g = gesture.current;
      const moved = { x: panRef.current.x + mid.x - g.mid.x, y: panRef.current.y + mid.y - g.mid.y };
      panRef.current = moved;
      setPan(moved);
      if (g.dist > 0) zoomAt(dist / g.dist, mid.x, mid.y);
      gesture.current = { dist, mid };
      return;
    }
    if (stroke.current) {
      const p = toImage(e.clientX, e.clientY);
      const [lx, ly] = stroke.current.last;
      dab(strokePoints(lx, ly, p[0], p[1], radius));
      stroke.current.last = p;
    } else {
      const moved = { x: panRef.current.x + e.clientX - prev.x, y: panRef.current.y + e.clientY - prev.y };
      panRef.current = moved;
      setPan(moved);
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
    if (stroke.current) {
      history.current.push(stroke.current.before);
      stroke.current = null;
      syncHistory();
    }
  }

  function undo() {
    const prev = history.current.undo(layer.current);
    if (prev) {
      layer.current = prev;
      redraw(null);
      syncHistory();
    }
  }

  function redo() {
    const next = history.current.redo(layer.current);
    if (next) {
      layer.current = next;
      redraw(null);
      syncHistory();
    }
  }

  function resetEdits() {
    history.current.push(layer.current.slice());
    layer.current = newEditLayer(w * h);
    redraw(null);
    syncHistory();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && k === "y") {
      e.preventDefault();
      redo();
    } else if (k === "e") setTool("erase");
    else if (k === "r") setTool("restore");
    else if (k === "m") setTool("move");
    else if (k === "[") setSize((s) => Math.max(2, Math.round(s / 1.2)));
    else if (k === "]") setSize((s) => Math.min(Math.round(long / 3), Math.round(s * 1.2) + 1));
    else if (k === "+" || k === "=") zoomAt(1.25);
    else if (k === "-") zoomAt(1 / 1.25);
    else if (k === "0") resetView();
  }

  function save() {
    const L = layer.current;
    onSave(L.every((v) => v === NEUTRAL) ? undefined : L);
  }

  // Screen pixels per mask pixel, for drawing the brush outline.
  const shown = (fit.w * zoom) / w;
  const toolButton = (t: Tool, label: string, Icon: typeof Eraser) => (
    <Button type="button" size="sm" variant={tool === t ? "default" : "outline"} aria-pressed={tool === t} onClick={() => setTool(t)}>
      <Icon aria-hidden /> {label}
    </Button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Touch-up tools">
        {toolButton("erase", "Erase", Eraser)}
        {toolButton("restore", "Restore", Paintbrush)}
        {toolButton("move", "Move", Hand)}
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <Button type="button" size="sm" variant="outline" onClick={undo} disabled={!canUndo}>
          <Undo2 aria-hidden /> Undo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={redo} disabled={!canRedo}>
          <Redo2 aria-hidden /> Redo
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={resetEdits}>
          <RotateCcw aria-hidden /> Clear touch-ups
        </Button>
        <span className="mx-1 h-6 w-px bg-border" aria-hidden />
        <Button type="button" size="icon-sm" variant="outline" onClick={() => zoomAt(1.25)} aria-label="Zoom in">
          <ZoomIn aria-hidden />
        </Button>
        <Button type="button" size="icon-sm" variant="outline" onClick={() => zoomAt(1 / 1.25)} aria-label="Zoom out">
          <ZoomOut aria-hidden />
        </Button>
        <Button type="button" size="icon-sm" variant="outline" onClick={resetView} aria-label="Fit to view">
          <Maximize aria-hidden />
        </Button>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <label className="space-y-1">
          <span className="font-medium">Brush size: {size}</span>
          <input type="range" min={2} max={Math.round(long / 3)} value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full accent-brand" />
        </label>
        <label className="space-y-1">
          <span className="font-medium">Brush softness: {softness}</span>
          <input type="range" min={0} max={100} step={5} value={softness} onChange={(e) => setSoftness(Number(e.target.value))} className="w-full accent-brand" />
        </label>
      </div>
      <div
        ref={box}
        tabIndex={0}
        role="application"
        aria-label="Photo being touched up. Drag to paint with the chosen brush. Keys: E erase, R restore, M move, [ and ] brush size, plus and minus zoom, 0 fit, Ctrl+Z undo."
        className={cn(
          "relative h-[60vh] max-h-[640px] min-h-72 touch-none overflow-hidden rounded-lg border outline-none select-none focus-visible:ring-2 focus-visible:ring-brand",
          tool === "move" ? "cursor-grab" : "cursor-none",
        )}
        style={checkerboard}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setCursor(null)}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={onKeyDown}
      >
        <div
          className="absolute top-0 left-0 origin-top-left"
          style={{ transform: `translate(${pan.x + centreOffset.x * zoom}px, ${pan.y + centreOffset.y * zoom}px) scale(${zoom})` }}
        >
          <div className="relative" style={{ width: fit.w, height: fit.h }}>
            <canvas ref={base} width={w} height={h} className="absolute inset-0 size-full opacity-30" aria-hidden />
            <canvas ref={top} width={w} height={h} className="absolute inset-0 size-full" aria-hidden />
          </div>
        </div>
        {cursor && tool !== "move" && (
          <div
            className="pointer-events-none absolute rounded-full border-2 border-brand"
            style={{ left: cursor.x - radius * shown, top: cursor.y - radius * shown, width: size * shown, height: size * shown }}
            aria-hidden
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Faint areas have been removed. Paint with Erase to remove more, or Restore to bring parts back. On a phone, use two fingers to zoom and move.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" onClick={save}>
          Save touch-ups
        </Button>
      </div>
    </div>
  );
}

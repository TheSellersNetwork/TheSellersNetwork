"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Camera, ExternalLink, Lightbulb, X } from "lucide-react";
import { createPickup, type PickupState } from "@/app/community/pickups/actions";
import { resizeImage } from "@/lib/images/resize";
import { averageLuminance, photoHints } from "@/lib/pickups-photo";
import { pickupCategories, pickupSources } from "@/lib/pickups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const select = "h-9 w-full rounded-md border bg-background px-2 text-sm";

/* Size and rough brightness of the chosen photo, read from a small copy. Null if the browser cannot decode it. */
async function checkPhoto(file: File): Promise<string[]> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const canvas = document.createElement("canvas");
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let luminance: number | null = null;
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, 48, 48);
      luminance = averageLuminance(ctx.getImageData(0, 0, 48, 48).data);
    }
    bitmap.close();
    return photoHints({ width, height, luminance });
  } catch {
    return [];
  }
}

/* Short, practical tips beside the photo picker. Collapsed by default so the form stays short. */
function PhotoTips() {
  return (
    <details className="group rounded-lg border bg-card p-3 text-sm sm:max-w-xs">
      <summary className="flex min-h-6 cursor-pointer list-none items-center gap-2 font-medium pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden">
        <Lightbulb className="size-4 text-brand" aria-hidden="true" />
        Tips for a good photo
        <span className="ml-auto text-xs text-muted-foreground group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs text-muted-foreground group-open:inline">Hide</span>
      </summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
        <li>Use soft daylight, near a window if you can.</li>
        <li>A plain background, like a wall or a sheet.</li>
        <li>Fill the frame with the item.</li>
        <li>Show the labels, and any flaws, honestly.</li>
      </ul>
      <a
        href="/tools/background-remover"
        target="_blank"
        rel="noopener"
        className="mt-2 inline-flex min-h-6 items-center gap-1 text-brand underline underline-offset-2 hover:text-brand-deep pointer-coarse:min-h-11"
      >
        Clean up the background first
        <ExternalLink className="size-3.5" aria-hidden="true" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    </details>
  );
}

export function PickupForm() {
  const [state, action, pending] = useActionState<PickupState, FormData>(createPickup, {
    ok: false,
    message: "",
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [hints, setHints] = useState<string[]>([]);

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError("");
    setHints([]);
    setUploading(true);
    // A gentle check on the original file. It never blocks the upload.
    void checkPhoto(file).then(setHints);
    try {
      const blob = await resizeImage(file);
      const body = new FormData();
      body.append("file", new File([blob], "pickup.webp", { type: blob.type || "image/webp" }));
      const res = await fetch("/api/upload", { method: "POST", body });
      const json = (await res.json()) as { url?: string; message?: string };
      if (!res.ok || !json.url) throw new Error(json.message ?? "Upload failed.");
      setPhoto(json.url);
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Photo</Label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {photo ? (
            <div className="relative w-48">
              <Image
                src={photo}
                alt="Your pickup"
                width={192}
                height={192}
                className="aspect-square rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setHints([]);
                }}
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1"
                aria-label="Remove photo"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <label className="flex h-32 w-48 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground hover:border-brand/60">
              <Camera className="size-5" aria-hidden="true" />
              {uploading ? "Uploading" : "Add a photo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
          )}
          <PhotoTips />
        </div>
        <div role="status" className="max-w-prose empty:hidden">
          {hints.length > 0 ? (
            <div className="rounded-lg bg-secondary p-3 text-sm">
              {hints.map((h) => (
                <p key={h}>{h}</p>
              ))}
              <p className="mt-1 text-xs text-muted-foreground">
                Just a suggestion. You can post it as it is.
              </p>
            </div>
          ) : null}
        </div>
        {photoError ? <p className="text-sm text-destructive">{photoError}</p> : null}
        <p className="text-xs text-muted-foreground">
          Location data is removed from photos automatically. Keep receipts, faces and addresses out
          of shot.
        </p>
        <input type="hidden" name="photo_url" value={photo ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="title">What is it?</Label>
          <Input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            placeholder="Wax jacket, size L, olive"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="brand">Brand (optional)</Label>
          <Input id="brand" name="brand" maxLength={60} placeholder="Leave blank if unbranded" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" required className={select} defaultValue="clothing">
            {Object.entries(pickupCategories).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="source_type">Where from</Label>
          <select
            id="source_type"
            name="source_type"
            required
            className={select}
            defaultValue="car_boot"
          >
            {Object.entries(pickupSources).map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="area">Area (optional)</Label>
          <Input id="area" name="area" maxLength={60} placeholder="Town or county, e.g. Kent" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paid">You paid (£)</Label>
          <Input id="paid" name="paid" required inputMode="decimal" placeholder="3.00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expected">You expect it to sell for (£, optional)</Label>
          <Input id="expected" name="expected" inputMode="decimal" placeholder="45" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="note">Anything else (optional)</Label>
          <Textarea
            id="note"
            name="note"
            maxLength={1000}
            rows={3}
            placeholder="Condition, what caught your eye, how you checked it"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Say the town or county, not the exact shop or stall, and never name private sellers. No
        links: pickups are for sharing finds, not selling them.
      </p>
      {state.message ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || uploading}>
        {pending ? "Posting" : "Post pickup"}
      </Button>
    </form>
  );
}

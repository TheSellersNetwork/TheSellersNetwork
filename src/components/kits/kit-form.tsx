"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteKit, saveKit, type KitState } from "@/app/kits/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { kitKinds } from "@/lib/kits";
import type { Kit, KitItem } from "@/lib/db/types";

type Draft = { kind: string; name: string; price_paid: string; bought_from: string; url: string; note: string };

const blank: Draft = { kind: "printer", name: "", price_paid: "", bought_from: "", url: "", note: "" };

export function KitForm({ kit, items }: { kit: Kit | null; items: KitItem[] }) {
  const [state, action, pending] = useActionState<KitState, FormData>(saveKit, { ok: false, message: "" });
  const [rows, setRows] = useState<Draft[]>(
    items.length > 0
      ? items.map((i) => ({ kind: i.kind, name: i.name, price_paid: i.price_paid != null ? String(i.price_paid) : "", bought_from: i.bought_from ?? "", url: i.url ?? "", note: i.note ?? "" }))
      : [{ ...blank }, { ...blank, kind: "scales" }, { ...blank, kind: "packaging" }],
  );
  const [deleting, startDelete] = useTransition();

  function update(i: number, patch: Partial<Draft>) {
    setRows((r) => r.map((row, k) => (k === i ? { ...row, ...patch } : row)));
  }

  return (
    <form action={action} className="space-y-6">
      {kit ? <input type="hidden" name="id" value={kit.id} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={kit?.title ?? ""} required minLength={3} maxLength={80} placeholder="For example: Spare room eBay setup, 2026" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">About this setup (optional)</Label>
        <Textarea id="description" name="description" defaultValue={kit?.description ?? ""} maxLength={1000} rows={3} placeholder="What you sell, how many parcels a week, what you would change." />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => setRows((r) => [...r, { ...blank, kind: "other" }])}>
            <Plus /> Add item
          </Button>
        </div>
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="forum-card grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[140px_1fr_110px_auto]">
              <select name={`items[${i}][kind]`} value={row.kind} onChange={(e) => update(i, { kind: e.target.value })} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Type">
                {kitKinds.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <Input name={`items[${i}][name]`} value={row.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="What it is, make and model" maxLength={120} aria-label="Name" />
              <Input name={`items[${i}][price_paid]`} value={row.price_paid} onChange={(e) => update(i, { price_paid: e.target.value })} placeholder="£ paid" inputMode="decimal" aria-label="Price paid" />
              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRows((r) => r.filter((_, k) => k !== i))} aria-label="Remove item" disabled={rows.length === 1}>
                <Trash2 />
              </Button>
              <Input name={`items[${i}][bought_from]`} value={row.bought_from} onChange={(e) => update(i, { bought_from: e.target.value })} placeholder="Where from (optional)" maxLength={80} className="sm:col-span-1" aria-label="Bought from" />
              <Input name={`items[${i}][url]`} value={row.url} onChange={(e) => update(i, { url: e.target.value })} placeholder="Product link (optional, https://)" type="url" className="sm:col-span-2" aria-label="Link" />
              <Input name={`items[${i}][note]`} value={row.note} onChange={(e) => update(i, { note: e.target.value })} placeholder="Note (optional)" maxLength={300} className="sm:col-span-1" aria-label="Note" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Product links to shops are fine. Links to your own listings are not.</p>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_public" value="on" defaultChecked={kit ? kit.is_public : true} /> Show this setup to everyone
      </label>

      {state.message && !state.ok ? (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : kit ? "Save changes" : "Publish setup"}
        </Button>
        {kit ? (
          <Button
            type="button"
            variant="ghost"
            disabled={deleting}
            onClick={() => {
              if (window.confirm("Delete this setup?")) startDelete(() => deleteKit(kit.id).then(() => undefined));
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}

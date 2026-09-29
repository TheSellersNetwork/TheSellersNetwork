"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculate, platforms as feePlatforms, type PlatformId } from "@/lib/tools/fees";
import {
  STOCK_STORAGE_KEY,
  ageing,
  daysHeld,
  emptyItem,
  filterItems,
  fromStockCsv,
  fromStockJson,
  isoDate,
  loadStock,
  profit,
  statusLabels,
  stockPlatforms,
  stockSources,
  stockStatuses,
  suggestSku,
  taxYearLabel,
  toStockCsv,
  toStockJson,
  totals,
  type StockFilter,
  type StockItem,
  type StockStatus,
} from "@/lib/tools/stock";
import { cn } from "@/lib/utils";

/*
  Stock tracker. The list lives in this browser's localStorage and nothing is
  sent to our server. Every read and write is wrapped, because storage can be
  blocked (private windows, strict settings) or full; the tracker still works
  for the visit, and export keeps a copy.
*/

const gbp = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }));
const selectCls = "h-11 w-full rounded-md border bg-background px-2 text-sm sm:h-9";
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const ukDate = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

type Draft = Omit<StockItem, "cost" | "price" | "soldPrice" | "fees" | "postage"> & { cost: string; price: string; soldPrice: string; fees: string; postage: string };

const toDraft = (it: StockItem): Draft => ({
  ...it,
  cost: it.cost === null ? "" : String(it.cost),
  price: it.price === null ? "" : String(it.price),
  soldPrice: it.soldPrice === null ? "" : String(it.soldPrice),
  fees: it.fees === null ? "" : String(it.fees),
  postage: it.postage === null ? "" : String(it.postage),
});

const money = (s: string) => {
  const t = s.replace(/[£,\s]/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

const fromDraft = (d: Draft): StockItem => ({ ...d, sku: d.sku.trim(), item: d.item.trim(), cost: money(d.cost), price: money(d.price), soldPrice: money(d.soldPrice), fees: money(d.fees), postage: money(d.postage) });

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

export function StockTracker() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [today, setToday] = useState("");
  const [storage, setStorage] = useState<"ok" | "blocked" | "failed">("ok");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [filter, setFilter] = useState<StockFilter>({ query: "", status: "all", platform: "", source: "" });
  const [sort, setSort] = useState<"added" | "oldest" | "sku">("added");
  const [feePlatform, setFeePlatform] = useState<PlatformId>("ebay_business");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Read once on mount. Storage may be unavailable; the tracker then works for this visit only.
  useEffect(() => {
    let loaded: StockItem[] = [];
    let state: "ok" | "blocked" = "ok";
    try {
      loaded = loadStock(window.localStorage.getItem(STOCK_STORAGE_KEY), newId);
    } catch {
      state = "blocked";
    }
    // Reading browser-only state after the first render is the point of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(loaded);
    setStorage(state);
    setToday(isoDate(new Date()));
  }, []);

  const save = (next: StockItem[]) => {
    setItems(next);
    try {
      window.localStorage.setItem(STOCK_STORAGE_KEY, toStockJson(next));
      if (storage !== "ok") setStorage("ok");
    } catch {
      setStorage("failed");
    }
  };

  const t = useMemo(() => (today ? totals(items, today) : null), [items, today]);
  const age = useMemo(() => (today ? ageing(items, today) : null), [items, today]);
  const shown = useMemo(() => {
    const list = filterItems(items, filter);
    if (sort === "sku") return [...list].sort((a, b) => a.sku.localeCompare(b.sku, "en-GB", { numeric: true }));
    if (sort === "oldest") return [...list].sort((a, b) => (a.bought || "9999").localeCompare(b.bought || "9999"));
    return [...list].reverse();
  }, [items, filter, sort]);
  const oldest = useMemo(
    () =>
      items
        .filter((it) => it.status === "in_stock" || it.status === "listed" || it.status === "returned")
        .map((it) => ({ it, d: daysHeld(it, today) }))
        .filter((x): x is { it: StockItem; d: number } => x.d !== null)
        .sort((a, b) => b.d - a.d)
        .slice(0, 8),
    [items, today],
  );
  const usedSources = useMemo(() => [...new Set(items.map((i) => i.source).filter(Boolean))].sort(), [items]);
  const usedPlatforms = useMemo(() => [...new Set(items.flatMap((i) => i.platforms))].sort(), [items]);

  const startNew = () => {
    setDraft(toDraft({ ...emptyItem(newId()), sku: suggestSku(items.map((i) => i.sku)), bought: today }));
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLInputElement>("#st-item")?.focus());
  };
  const startEdit = (it: StockItem) => {
    setDraft(toDraft(it));
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "start" });
      formRef.current?.querySelector<HTMLInputElement>("#st-item")?.focus();
    });
  };
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const it = fromDraft(draft);
    if (!it.item && !it.sku) {
      toast("Add an item name or a SKU.");
      return;
    }
    if (it.status === "sold" && !it.soldOn) it.soldOn = today;
    const exists = items.some((x) => x.id === it.id);
    save(exists ? items.map((x) => (x.id === it.id ? it : x)) : [...items, it]);
    setDraft(null);
    toast(exists ? "Saved." : "Added.");
  };

  const remove = (it: StockItem) => {
    const before = items;
    save(items.filter((x) => x.id !== it.id));
    toast(`Deleted ${it.sku || it.item}.`, { action: { label: "Undo", onClick: () => save(before) } });
  };

  const workOutFees = () => {
    if (!draft) return;
    const sold = money(draft.soldPrice);
    if (!sold) {
      toast("Add the sold price first.");
      return;
    }
    const r = calculate(feePlatform, { price: sold, postageCharged: 0, postageCost: money(draft.postage) ?? 0, itemCost: money(draft.cost) ?? 0 });
    set("fees", r.fees.toFixed(2));
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const added = /\.json$/i.test(file.name) || text.trim().startsWith("{") || text.trim().startsWith("[") ? fromStockJson(text, newId) : fromStockCsv(text, newId);
      if (!added.length) {
        toast("No items found in that file.");
        return;
      }
      save([...items, ...added]);
      toast(`Added ${added.length} ${added.length === 1 ? "item" : "items"} from ${file.name}.`);
    } catch {
      toast("That file could not be read. Use a CSV or JSON file exported from this tracker, or the free stock tracker spreadsheet saved as CSV.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const clearAll = () => {
    if (!window.confirm(`Delete all ${items.length} items from this device? Export a copy first if you might need them.`)) return;
    save([]);
    toast("Stock list cleared.");
  };

  const stamp = today || "stock";

  return (
    <div className="space-y-10">
      <div className="rounded-xl border bg-card p-4 text-sm" role="note">
        <p className="font-medium">Stored only on this device</p>
        <p className="mt-1 text-muted-foreground">
          Your stock list is saved in this browser and is never sent to us. It will not appear on your other devices, and clearing your browser data deletes it. Export a copy now and then so nothing is lost.
        </p>
        {storage !== "ok" ? (
          <p className="mt-2 text-destructive" role="alert">
            {storage === "blocked" ? "This browser is blocking storage, so the list will be lost when you close the page. Export it before you leave." : "The last change could not be saved in this browser (storage may be full or blocked). Export a copy now."}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!items.length} onClick={() => download(`stock-${stamp}.csv`, toStockCsv(items, today), "text/csv;charset=utf-8")}>
            <Download className="size-4" aria-hidden="true" />
            Export CSV
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!items.length} onClick={() => download(`stock-backup-${stamp}.json`, toStockJson(items), "application/json")}>
            <Download className="size-4" aria-hidden="true" />
            Export backup (JSON)
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" aria-hidden="true" />
            Import CSV or JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            className="sr-only"
            aria-label="Import a stock file"
            tabIndex={-1}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImport(f);
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          The CSV has the same columns as the{" "}
          <Link href="/tools/downloads" className="underline">
            free stock tracker spreadsheet
          </Link>
          , then source, fees, postage, days held and notes. Importing adds to your list; it does not replace it.
        </p>
      </div>

      {t ? (
        <section aria-labelledby="st-totals" className="space-y-3">
          <h2 id="st-totals" className="text-lg font-semibold">
            Totals
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Stock value at cost" value={gbp(t.stockValue)} sub={`${t.held} ${t.held === 1 ? "item" : "items"} not sold`} />
            <Stat label="Sold this month" value={String(t.soldThisMonth)} sub={`${gbp(t.salesThisMonth)} in sales`} />
            <Stat label="Profit this month" value={gbp(t.profitThisMonth)} tone={t.profitThisMonth < 0 ? "bad" : undefined} />
            <Stat label={`Profit, tax year ${taxYearLabel(today)}`} value={gbp(t.profitThisTaxYear)} sub={`${t.soldThisTaxYear} sold since 6 April`} tone={t.profitThisTaxYear < 0 ? "bad" : undefined} />
          </div>
          <p className="text-xs text-muted-foreground">
            Profit is the sold price less cost, fees and postage, as far as you have filled them in. {t.writtenOff ? `Written off: ${t.writtenOff} ${t.writtenOff === 1 ? "item" : "items"}, ${gbp(t.writtenOffCost)} at cost, not included above. ` : ""}For your tax return, use your full records: see{" "}
            <Link href="/tools/tax" className="underline">
              tax and HMRC
            </Link>
            .
          </p>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">Loading your stock list.</p>
      )}

      <section aria-labelledby="st-list" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="st-list" className="text-lg font-semibold">
            Your stock
          </h2>
          <Button type="button" onClick={startNew} disabled={!today}>
            <Plus className="size-4" aria-hidden="true" />
            Add an item
          </Button>
        </div>

        {draft ? (
          <form ref={formRef} onSubmit={submit} aria-labelledby="st-form-title" className="scroll-mt-20 space-y-4 rounded-xl border bg-card p-4">
            <h3 id="st-form-title" className="font-semibold">
              {items.some((x) => x.id === draft.id) ? `Edit ${draft.sku || draft.item}` : "New item"}
            </h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="st-sku">SKU</Label>
                <Input id="st-sku" value={draft.sku} onChange={(e) => set("sku", e.target.value)} autoComplete="off" aria-describedby="st-sku-help" />
              </div>
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor="st-item">Item</Label>
                <Input id="st-item" value={draft.item} onChange={(e) => set("item", e.target.value)} autoComplete="off" />
              </div>
              <p id="st-sku-help" className="-mt-1 text-xs text-muted-foreground sm:col-span-4">
                Suggested: the next number after your last SKU, as in the{" "}
                <Link href="/guides/storage-and-stock-numbers" className="underline">
                  stock numbers guide
                </Link>
                . Change it if you use your own system.
              </p>
              <div className="space-y-1">
                <Label htmlFor="st-location">Location</Label>
                <Input id="st-location" value={draft.location} onChange={(e) => set("location", e.target.value)} placeholder="Box 4" autoComplete="off" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-source">Source</Label>
                <select id="st-source" value={draft.source} onChange={(e) => set("source", e.target.value)} className={selectCls}>
                  <option value="">Not set</option>
                  {[...new Set([...stockSources, ...(draft.source ? [draft.source] : [])])].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-bought">Date bought</Label>
                <Input id="st-bought" type="date" value={draft.bought} onChange={(e) => set("bought", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-cost">Cost (£)</Label>
                <Input id="st-cost" inputMode="decimal" value={draft.cost} onChange={(e) => set("cost", e.target.value)} placeholder="4.00" />
              </div>
            </div>

            <fieldset>
              <legend className="text-sm font-medium">Listed on</legend>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                {[...new Set([...stockPlatforms, ...draft.platforms])].map((p) => (
                  <label key={p} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-0">
                    <Checkbox checked={draft.platforms.includes(p)} onCheckedChange={(c) => set("platforms", c ? [...draft.platforms, p] : draft.platforms.filter((x) => x !== p))} />
                    {p}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="space-y-1">
                <Label htmlFor="st-listed">Date listed</Label>
                <Input id="st-listed" type="date" value={draft.listed} onChange={(e) => set("listed", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-price">Listed price (£)</Label>
                <Input id="st-price" inputMode="decimal" value={draft.price} onChange={(e) => set("price", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="st-status">Status</Label>
                <select id="st-status" value={draft.status} onChange={(e) => set("status", e.target.value as StockStatus)} className={selectCls}>
                  {stockStatuses.map((s) => (
                    <option key={s} value={s}>
                      {statusLabels[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {draft.status === "sold" ? (
              <div className="space-y-3 rounded-lg bg-secondary p-3">
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="st-sold-price">Sold price (£)</Label>
                    <Input id="st-sold-price" inputMode="decimal" value={draft.soldPrice} onChange={(e) => set("soldPrice", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="st-sold-on">Date sold</Label>
                    <Input id="st-sold-on" type="date" value={draft.soldOn} onChange={(e) => set("soldOn", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="st-postage">Postage you paid (£)</Label>
                    <Input id="st-postage" inputMode="decimal" value={draft.postage} onChange={(e) => set("postage", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="st-fees">Fees (£)</Label>
                    <Input id="st-fees" inputMode="decimal" value={draft.fees} onChange={(e) => set("fees", e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-48 flex-1 space-y-1 sm:max-w-xs">
                    <Label htmlFor="st-fee-platform">Work out fees for</Label>
                    <select id="st-fee-platform" value={feePlatform} onChange={(e) => setFeePlatform(e.target.value as PlatformId)} className={selectCls}>
                      {feePlatforms.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="button" variant="outline" onClick={workOutFees}>
                    Work out fees
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uses the same fees as the{" "}
                  <Link href="/tools/calculator" className="underline">
                    fee calculator
                  </Link>
                  , at the platform&rsquo;s standard rates with VAT on fees and no postage charged to the buyer. For eBay and Amazon it uses the default category; check the fee calculator for yours, or copy the figure from your sales report.
                </p>
              </div>
            ) : null}

            <div className="space-y-1">
              <Label htmlFor="st-notes">Notes</Label>
              <Textarea id="st-notes" rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Save item</Button>
              <Button type="button" variant="outline" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 space-y-1 sm:col-span-4 lg:col-span-1">
            <Label htmlFor="st-search">Search</Label>
            <Input id="st-search" type="search" value={filter.query} onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))} placeholder="SKU, item, location or note" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-f-status">Status</Label>
            <select id="st-f-status" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as StockFilter["status"] }))} className={selectCls}>
              <option value="all">All</option>
              <option value="unsold">Not sold yet</option>
              {stockStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-f-platform">Listed on</Label>
            <select id="st-f-platform" value={filter.platform} onChange={(e) => setFilter((f) => ({ ...f, platform: e.target.value }))} className={selectCls}>
              <option value="">Any</option>
              {usedPlatforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-f-source">Source</Label>
            <select id="st-f-source" value={filter.source} onChange={(e) => setFilter((f) => ({ ...f, source: e.target.value }))} className={selectCls}>
              <option value="">Any</option>
              {usedSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="st-sort">Order</Label>
            <select id="st-sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className={selectCls}>
              <option value="added">Newest added first</option>
              <option value="oldest">Longest held first</option>
              <option value="sku">By SKU</option>
            </select>
          </div>
        </div>

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {items.length === 0 ? "No items yet. Add your first item, or import a file you exported before." : `Showing ${shown.length} of ${items.length} ${items.length === 1 ? "item" : "items"}.`}
        </p>

        {shown.length ? (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[720px] text-sm">
              <caption className="sr-only">Your stock</caption>
              <thead className="bg-secondary text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">SKU</th>
                  <th scope="col" className="px-3 py-2 font-medium">Item</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Cost</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Price</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Days held</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Profit</th>
                  <th scope="col" className="px-3 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((it) => {
                  const p = profit(it);
                  const d = daysHeld(it, today);
                  return (
                    <tr key={it.id}>
                      <td className="px-3 py-2 font-mono text-xs">{it.sku}</td>
                      <td className="max-w-64 px-3 py-2">
                        <span className="line-clamp-2">{it.item}</span>
                        <span className="block text-xs text-muted-foreground">{[it.location, it.source, it.platforms.join(", ")].filter(Boolean).join(" · ")}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {statusLabels[it.status]}
                        {it.status === "sold" && it.soldOn ? <span className="block text-xs text-muted-foreground">{ukDate(it.soldOn)}</span> : null}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{gbp(it.cost)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{it.status === "sold" ? gbp(it.soldPrice) : gbp(it.price)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{d ?? ""}</td>
                      <td className={cn("px-3 py-2 text-right tabular-nums", p !== null && p < 0 && "text-destructive")}>{gbp(p)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-8" onClick={() => startEdit(it)} aria-label={`Edit ${it.sku || it.item}`}>
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="size-11 sm:size-8" onClick={() => remove(it)} aria-label={`Delete ${it.sku || it.item}`}>
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {age && items.length ? (
        <section aria-labelledby="st-ageing" className="space-y-3">
          <h2 id="st-ageing" className="text-lg font-semibold">
            Ageing
          </h2>
          <p className="text-sm text-muted-foreground">How long unsold stock has been with you, counted from the date bought, and the money tied up in it.</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {age.bands.map((b) => (
              <Stat key={b.id} label={b.label} value={`${b.count} ${b.count === 1 ? "item" : "items"}`} sub={`${gbp(b.cost)} at cost`} tone={b.id === "90+" && b.count ? "bad" : undefined} />
            ))}
          </div>
          {age.undated ? <p className="text-xs text-muted-foreground">{age.undated} unsold {age.undated === 1 ? "item has" : "items have"} no date bought, so {age.undated === 1 ? "it is" : "they are"} not counted.</p> : null}
          {oldest.length ? (
            <>
              <h3 className="pt-2 text-sm font-semibold">Held longest</h3>
              <ul className="divide-y rounded-xl border text-sm">
                {oldest.map(({ it, d }) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs">{it.sku}</span> {it.item}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">{d} days</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Deciding what to do with slow stock:{" "}
                <Link href="/tools/pricing?tab=markdowns" className="underline">
                  when to drop the price
                </Link>{" "}
                and the{" "}
                <Link href="/guides/stale-stock" className="underline">
                  stale stock guide
                </Link>
                .
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      {items.length ? (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete everything on this device
          </Button>
        </div>
      ) : null}
    </div>
  );
}

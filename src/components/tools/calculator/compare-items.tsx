"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feeData, platforms, type PlatformId } from "@/lib/tools/fees";
import { cn } from "@/lib/utils";
import { ShareResultLink } from "@/components/tools/share-result-link";
import { better, compareItemOutcome, compareQuery, gbp, kindLabel, type CompareItem, type CompareState } from "./model";

/*
  Two items side by side: each with its own platform, price and costs, and
  one table of results with the better figure on each row marked.
*/

const num = (s: string) => {
  const n = Number(s.replace(/[£,\s%]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : 0;
};
const selectCls = "h-11 w-full rounded-md border bg-background px-2 text-sm sm:h-9";
const pct = (n: number | null) => (n === null ? "" : `${n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`);

type Draft = { platform: PlatformId; price: string; postage: string; postageCost: string; cost: string; category: string | null };

const toDraft = (it: CompareItem): Draft => ({ platform: it.platform, price: String(it.price), postage: String(it.postage), postageCost: String(it.postageCost), cost: String(it.cost), category: it.category });
const fromDraft = (d: Draft): CompareItem => ({ platform: d.platform, price: num(d.price), postage: d.platform === "vinted" ? 0 : num(d.postage), postageCost: num(d.postageCost), cost: num(d.cost), category: d.category });

function ItemInputs({ id, title, value, onChange }: { id: "a" | "b"; title: string; value: Draft; onChange: (d: Draft) => void }) {
  const set = (patch: Partial<Draft>) => onChange({ ...value, ...patch });
  const field = (key: "price" | "postage" | "postageCost" | "cost", label: string, hint?: string) => (
    <div className="space-y-1">
      <Label htmlFor={`cmp-${id}-${key}`}>{label}</Label>
      <Input id={`cmp-${id}-${key}`} inputMode="decimal" value={value[key]} onChange={(e) => set({ [key]: e.target.value })} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
  const categories = value.platform === "ebay_business" ? feeData.ebayBusiness.categories : value.platform === "amazon_fbm" ? feeData.amazon.referral : null;
  return (
    <fieldset className="space-y-3 rounded-xl border bg-card p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      <div className="space-y-1">
        <Label htmlFor={`cmp-${id}-platform`}>Platform</Label>
        <select id={`cmp-${id}-platform`} value={value.platform} onChange={(e) => set({ platform: e.target.value as PlatformId, category: null })} className={selectCls}>
          {platforms.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {categories ? (
        <div className="space-y-1">
          <Label htmlFor={`cmp-${id}-cat`}>Category</Label>
          <select id={`cmp-${id}-cat`} value={value.category ?? ""} onChange={(e) => set({ category: e.target.value || null })} className={selectCls}>
            <option value="">{value.platform === "ebay_business" ? "Most categories" : "Everything else"}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {field("price", "Selling price (£)")}
      {value.platform === "vinted" ? null : field("postage", "Buyer pays for postage (£)", "0 for free postage")}
      {field("postageCost", "Postage and packaging cost (£)")}
      {field("cost", "You paid for it (£)")}
    </fieldset>
  );
}

type Row = { label: string; a: number | null; b: number | null; fmt: (n: number | null) => string; lowerIsBetter?: boolean };

export function CompareItems({ initial }: { initial: CompareState }) {
  const [a, setA] = useState<Draft>(toDraft(initial.a));
  const [b, setB] = useState<Draft>(toDraft(initial.b));
  const [vatOnFees, setVatOnFees] = useState(!initial.noVat);
  const state: CompareState = { a: fromDraft(a), b: fromDraft(b), noVat: !vatOnFees };
  const ra = compareItemOutcome(state.a, state.noVat);
  const rb = compareItemOutcome(state.b, state.noVat);
  const money = (n: number | null) => (n === null ? "" : gbp(n));
  const rows: Row[] = [
    { label: "Selling price", a: state.a.price, b: state.b.price, fmt: money },
    { label: "Fees", a: ra.fees, b: rb.fees, fmt: money, lowerIsBetter: true },
    { label: "Fees as a share of the price", a: ra.feeShare, b: rb.feeShare, fmt: pct, lowerIsBetter: true },
    { label: "You receive", a: ra.youReceive, b: rb.youReceive, fmt: money },
    { label: "Profit", a: ra.profit, b: rb.profit, fmt: money },
    { label: "Margin", a: ra.margin, b: rb.margin, fmt: pct },
  ];
  const ready = state.a.price > 0 && state.b.price > 0;

  function difference(r: Row) {
    if (r.a === null || r.b === null) return "";
    const d = Math.round((r.b - r.a) * 1000) / 1000;
    if (Math.abs(d) < 0.005) return "Same";
    const size = r.fmt === pct ? `${Math.abs(d).toLocaleString("en-GB", { maximumFractionDigits: 1 })} points` : gbp(Math.abs(d));
    return `${size} ${d > 0 ? "more" : "less"} on B`;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ItemInputs id="a" title="Item A" value={a} onChange={setA} />
        <ItemInputs id="b" title="Item B" value={b} onChange={setB} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" />
        Add VAT to fees (untick if you are VAT-registered and reclaim it)
      </label>

      {ready ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Item A and Item B compared. The better figure on each row is marked.</caption>
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th scope="col" className="py-2 pr-2 font-normal">
                    <span className="sr-only">Figure</span>
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium text-foreground">
                    Item A<span className="block text-xs font-normal text-muted-foreground">{kindLabel(state.a.platform)}</span>
                  </th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium text-foreground">
                    Item B<span className="block text-xs font-normal text-muted-foreground">{kindLabel(state.b.platform)}</span>
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    Difference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => {
                  const win = r.label === "Selling price" ? null : better(r.a, r.b, r.lowerIsBetter);
                  const cell = (side: "a" | "b") => (
                    <td className={cn("py-2 pr-2 text-right tabular-nums", win === side && "font-semibold text-success")}>
                      {r.fmt(r[side])}
                      {win === side ? <span className="sr-only"> (better)</span> : null}
                    </td>
                  );
                  return (
                    <tr key={r.label} className={r.label === "Profit" ? "font-medium" : undefined}>
                      <th scope="row" className="py-2 pr-2 text-left font-normal">
                        {r.label}
                      </th>
                      {cell("a")}
                      {cell("b")}
                      <td className="py-2 text-right text-muted-foreground tabular-nums">{difference(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-sm" aria-live="polite">
            {better(ra.profit, rb.profit) === null
              ? "Both items make the same profit."
              : better(ra.profit, rb.profit) === "a"
                ? `Item A makes ${gbp(Math.abs(ra.profit - rb.profit))} more profit.`
                : `Item B makes ${gbp(Math.abs(ra.profit - rb.profit))} more profit.`}
          </p>
          <p className="text-xs text-muted-foreground">Margin is profit as a share of the selling price. The better figure on each row is in bold.</p>
          <ShareResultLink query={compareQuery(state)} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Enter a selling price for both items to compare them.</p>
      )}
    </div>
  );
}

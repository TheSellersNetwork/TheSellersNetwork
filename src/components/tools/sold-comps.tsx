"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculate, feeData, platforms, type PlatformId } from "@/lib/tools/fees";
import { outliers, parsePrices, summarise } from "@/lib/tools/sold-comps";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/*
  Sold comps summariser: the seller pastes prices they found, we summarise
  them and show what they would keep at the typical price. Nothing is fetched.
*/

const gbp = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }));
const num = (s: string) => Number(s.replace(/[£,\s]/g, "")) || 0;
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const example = `£24.99
+£3.20 postage
£19.50
£22 to £26
Sold 12 Sep: £21.00
£65.00`;

export function SoldComps() {
  const [text, setText] = useState("");
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const parsed = useMemo(() => parsePrices(text), [text]);
  const all = parsed.values;
  const included = all.filter((_, i) => !excluded.has(i)).map((v) => v.value);
  const s = summarise(included);
  const flagged = useMemo(() => outliers(all.map((v) => v.value)), [all]);

  const onText = (t: string) => {
    setText(t);
    setExcluded(new Set());
  };
  const toggle = (i: number) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const excludeFlagged = () => setExcluded(new Set(all.map((v, i) => (flagged.has(v.value) ? i : -1)).filter((i) => i >= 0)));

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="sc-text">Paste the sold prices you found</Label>
        <Textarea id="sc-text" rows={8} value={text} onChange={(e) => onText(e.target.value)} placeholder={example} className="font-mono text-sm" aria-describedby="sc-help" />
        <p id="sc-help" className="text-xs text-muted-foreground">
          One price per line, or paste a block of copied text. We pick out pound amounts and leave out postage. Nothing is looked up or sent anywhere: this only reads what you paste.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onText(example)}>
            Try an example
          </Button>
          {text ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => onText("")}>
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <section aria-live="polite" aria-labelledby="sc-summary" className="space-y-4">
        <h2 id="sc-summary" className="text-lg font-semibold">
          Summary
        </h2>
        {!all.length ? (
          <p className="text-sm text-muted-foreground">{text.trim() ? "No prices found. Check each price has a £ sign or pence, like £12 or 12.50." : "Paste some prices to see the summary."}</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Prices used" value={`${included.length} of ${all.length}`} />
              <Stat label="Median (middle price)" value={s ? gbp(s.median) : "?"} strong />
              <Stat label="Lower and upper quartile" value={s ? `${gbp(s.q1)} to ${gbp(s.q3)}` : "?"} />
              <Stat label="Lowest" value={s ? gbp(s.min) : "?"} />
              <Stat label="Highest" value={s ? gbp(s.max) : "?"} />
              <Stat label="Average" value={s ? gbp(s.mean) : "?"} />
            </div>
            <p className="text-xs text-muted-foreground">Half of the prices sit between the lower and upper quartile. The median is less thrown by one odd sale than the average.</p>
            <DotPlot values={all.map((v) => v.value)} excluded={excluded} q1={s?.q1} median={s?.median} q3={s?.q3} onToggle={toggle} />
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium">Tap a price to leave it out, or tap again to put it back</h3>
                <div className="flex gap-2">
                  {flagged.size ? (
                    <Button type="button" variant="outline" size="sm" onClick={excludeFlagged}>
                      Leave out {flagged.size === 1 ? "the outlier" : `${flagged.size} outliers`}
                    </Button>
                  ) : null}
                  {excluded.size ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setExcluded(new Set())}>
                      Use all
                    </Button>
                  ) : null}
                </div>
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {all.map((v, i) => (
                  <li key={`${i}-${v.value}`}>
                    <button
                      type="button"
                      aria-pressed={!excluded.has(i)}
                      aria-label={`${gbp(v.value)} from line ${v.line}${excluded.has(i) ? ", left out" : ""}${flagged.has(v.value) ? ", possible outlier" : ""}`}
                      onClick={() => toggle(i)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        excluded.has(i) ? "text-muted-foreground line-through" : "bg-brand-soft",
                        flagged.has(v.value) && !excluded.has(i) && "border-destructive",
                      )}
                    >
                      {gbp(v.value)}
                    </button>
                  </li>
                ))}
              </ul>
              {flagged.size ? <p className="mt-2 text-xs text-muted-foreground">Prices with a red edge are far from the rest (more than one and a half times the middle spread beyond the quartiles). They may be a bundle, a different model, or a mistake. Leave them out only if you know why they are different.</p> : null}
            </div>
            {parsed.ignored.length ? (
              <details className="rounded-lg border p-3 text-sm">
                <summary className="cursor-pointer">Left out as postage ({parsed.ignored.length})</summary>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {parsed.ignored.map((x, i) => (
                    <li key={i}>
                      Line {x.line}: {x.text}. {x.reason}.
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </section>

      {s ? <KeepHelper q1={s.q1} median={s.median} q3={s.q3} /> : null}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-semibold tabular-nums", strong ? "text-2xl text-brand-deep" : "text-lg")}>{value}</p>
    </div>
  );
}

/* A strip of dots on one line, with the middle half shaded and the median marked. Colours come from tokens. */
function DotPlot({ values, excluded, q1, median, q3, onToggle }: { values: number[]; excluded: Set<number>; q1?: number; median?: number; q3?: number; onToggle: (i: number) => void }) {
  const W = 600;
  const pad = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (v: number) => (max === min ? W / 2 : pad + ((v - min) / span) * (W - pad * 2));
  // Stack dots that would overlap.
  const stacks = new Map<number, number>();
  const pts = values.map((v, i) => {
    const key = Math.round(x(v) / 8);
    const n = stacks.get(key) ?? 0;
    stacks.set(key, n + 1);
    return { v, i, cx: x(v), level: n };
  });
  const tallest = Math.max(...Array.from(stacks.values()));
  const H = Math.max(100, 74 + tallest * 12);
  const base = H - 36;
  const label = `Dot plot of ${values.length} prices from ${gbp(min)} to ${gbp(max)}${median !== undefined ? `, median ${gbp(median)}` : ""}.`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}>
      {q1 !== undefined && q3 !== undefined ? <rect x={x(q1)} y={22} width={Math.max(2, x(q3) - x(q1))} height={base - 16} className="fill-brand-soft" rx={4} /> : null}
      <line x1={pad} x2={W - pad} y1={base + 6} y2={base + 6} className="stroke-border" strokeWidth={1} />
      {median !== undefined ? <line x1={x(median)} x2={x(median)} y1={20} y2={base + 10} className="stroke-brand-deep" strokeWidth={2} /> : null}
      {pts.map((p) => (
        <circle
          key={p.i}
          cx={p.cx}
          cy={base - p.level * 12}
          r={5}
          onClick={() => onToggle(p.i)}
          className={cn("cursor-pointer", excluded.has(p.i) ? "fill-background stroke-muted-foreground" : "fill-brand stroke-brand-deep")}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      ))}
      <text x={pad} y={H - 8} className="fill-muted-foreground text-[12px]">
        {gbp(min)}
      </text>
      <text x={W - pad} y={H - 8} textAnchor="end" className="fill-muted-foreground text-[12px]">
        {gbp(max)}
      </text>
      {median !== undefined ? (
        <text x={x(median)} y={14} textAnchor={x(median) < 90 ? "start" : x(median) > W - 90 ? "end" : "middle"} className="fill-foreground text-[12px] font-medium">
          median {gbp(median)}
        </text>
      ) : null}
    </svg>
  );
}

function KeepHelper({ q1, median, q3 }: { q1: number; median: number; q3: number }) {
  const [platform, setPlatform] = useState<PlatformId>("ebay_business");
  const [ebayCategory, setEbayCategory] = useState(feeData.ebayBusiness.categories[0].id);
  const [amazonCategory, setAmazonCategory] = useState("other");
  const [itemCost, setItemCost] = useState("");
  const [postageCharged, setPostageCharged] = useState("");
  const [postageCost, setPostageCost] = useState("");
  const [vatOnFees, setVatOnFees] = useState(true);
  const meta = platforms.find((p) => p.id === platform)!;
  const rows = [
    ["Lower quartile", q1],
    ["Median", median],
    ["Upper quartile", q3],
  ] as const;

  return (
    <section aria-labelledby="sc-keep" className="space-y-4 rounded-xl border bg-card p-4">
      <div>
        <h2 id="sc-keep" className="text-lg font-semibold">
          Price to list at
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">What you would keep if it sells at these prices, after fees, on the platform you pick.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1 sm:col-span-3">
          <Label htmlFor="sc-platform">Platform</Label>
          <select id="sc-platform" value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)} className={selectCls}>
            {platforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {meta.note ? <p className="text-xs text-muted-foreground">{meta.note}</p> : null}
        </div>
        {platform === "ebay_business" ? (
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="sc-ebay-cat">eBay category</Label>
            <select id="sc-ebay-cat" value={ebayCategory} onChange={(e) => setEbayCategory(e.target.value)} className={selectCls}>
              {feeData.ebayBusiness.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {platform === "amazon_fbm" ? (
          <div className="space-y-1 sm:col-span-3">
            <Label htmlFor="sc-amazon-cat">Amazon category</Label>
            <select id="sc-amazon-cat" value={amazonCategory} onChange={(e) => setAmazonCategory(e.target.value)} className={selectCls}>
              {feeData.amazon.referral.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Money id="sc-cost" label="What you paid for it (£)" value={itemCost} onChange={setItemCost} />
        <Money id="sc-pcharged" label="Postage the buyer pays you (£)" value={postageCharged} onChange={setPostageCharged} />
        <Money id="sc-pcost" label="Postage and packaging cost (£)" value={postageCost} onChange={setPostageCost} />
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" /> Add VAT to fees (untick if you are VAT registered and reclaim it)
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">What you keep at the lower quartile, median and upper quartile</caption>
          <thead className="text-left text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-medium">
                If it sells at
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Price
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Fees
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                You keep
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                Profit
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map(([label, price]) => {
              const r = calculate(platform, { price, postageCharged: num(postageCharged), postageCost: num(postageCost), itemCost: num(itemCost), ebayCategory, amazonCategory, vatOnFees });
              return (
                <tr key={label} className={label === "Median" ? "font-semibold" : ""}>
                  <th scope="row" className="py-1.5 text-left font-[inherit]">
                    {label}
                  </th>
                  <td className="py-1.5 text-right tabular-nums">{gbp(price)}</td>
                  <td className="py-1.5 text-right tabular-nums">{gbp(r.fees)}</td>
                  <td className="py-1.5 text-right tabular-nums">{gbp(r.youReceive)}</td>
                  <td className={cn("py-1.5 text-right tabular-nums", r.profit < 0 ? "text-destructive" : "text-success")}>{gbp(r.profit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Profit takes off what you paid and your postage cost. To compare every platform at one price, use{" "}
        <Link href="/tools/where-to-sell" className="underline">
          where should I sell this
        </Link>
        . Fees checked on {new Date(`${feeData.checked}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}. Not financial advice.
      </p>
    </section>
  );
}

function Money({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" placeholder="0.00" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

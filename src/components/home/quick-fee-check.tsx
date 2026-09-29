"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight } from "lucide-react";
import { calculate, type PlatformId } from "@/lib/tools/fees";
import { cn } from "@/lib/utils";

/*
  The home page calculator: type a price and see what you keep on each
  platform, best first. Uses the same fee engine and official figures as the
  full tools. Postage is left out to keep it to one box; the full "Where
  should I sell this?" tool has every option.
*/
const shown: { id: PlatformId; name: string }[] = [
  { id: "ebay_business", name: "eBay" },
  { id: "vinted", name: "Vinted" },
  { id: "depop", name: "Depop" },
  { id: "etsy", name: "Etsy" },
  { id: "whatnot", name: "Whatnot" },
  { id: "amazon_fbm", name: "Amazon (you post)" },
];

const money = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
const toNumber = (v: string) => {
  const n = Number(v.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 100000) : 0;
};

export function QuickFeeCheck() {
  const id = useId();
  const [price, setPrice] = useState("20");
  const [paid, setPaid] = useState("");
  const [ownThings, setOwnThings] = useState(false);

  const p = toNumber(price);
  const cost = toNumber(paid);
  const rows = shown
    .map((s) => {
      const platform: PlatformId = s.id === "ebay_business" && ownThings ? "ebay_private" : s.id;
      const r = calculate(platform, { price: p, postageCharged: 0, postageCost: 0, itemCost: cost });
      return { ...s, keep: r.youReceive, fees: r.fees, profit: r.profit };
    })
    .sort((a, b) => b.keep - a.keep);
  const best = rows[0];

  return (
    <div className="rounded-2xl border bg-card p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">What will I keep?</h2>
        <Link href="/tools/calculator" className="inline-flex items-center gap-1 text-sm text-brand underline-offset-2 hover:underline">
          Full breakdown <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="text-sm" htmlFor={`${id}-price`}>
          <span className="text-muted-foreground">It sells for</span>
          <span className="mt-1 flex h-11 items-center rounded-md border bg-background px-3 focus-within:border-brand">
            <span className="text-muted-foreground">£</span>
            <input id={`${id}-price`} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" autoComplete="off" className="w-full bg-transparent pl-1 text-lg font-semibold tabular-nums outline-none" />
          </span>
        </label>
        <label className="text-sm" htmlFor={`${id}-paid`}>
          <span className="text-muted-foreground">You paid (optional)</span>
          <span className="mt-1 flex h-11 items-center rounded-md border bg-background px-3 focus-within:border-brand">
            <span className="text-muted-foreground">£</span>
            <input id={`${id}-paid`} value={paid} onChange={(e) => setPaid(e.target.value)} inputMode="decimal" autoComplete="off" placeholder="0" className="w-full bg-transparent pl-1 text-lg font-semibold tabular-nums outline-none" />
          </span>
        </label>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={ownThings} onChange={(e) => setOwnThings(e.target.checked)} className="size-4 accent-[var(--brand)]" />
        Selling my own things on eBay (private seller)
      </label>

      <ul className="mt-4 space-y-2.5" aria-live="polite">
        {rows.map((r) => {
          const share = p > 0 ? Math.max(0, Math.min(1, r.keep / p)) : 0;
          const top = p > 0 && r === best;
          return (
            <li key={r.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn(top && "font-semibold")}>{r.name}</span>
                <span className="tabular-nums">
                  <span className={cn("font-semibold", top && "text-brand")}>{money(r.keep)}</span>
                  {cost > 0 ? <span className={cn("ml-2 text-xs", r.profit >= 0 ? "text-success" : "text-destructive")}>{r.profit >= 0 ? `${money(r.profit)} profit` : `${money(-r.profit)} loss`}</span> : <span className="ml-2 text-xs text-muted-foreground">{money(r.fees)} fees</span>}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
                <div className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", top ? "bg-brand" : "bg-muted-foreground/40")} style={{ width: `${share * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Before postage, on standard fees with VAT on fees. Vinted and Depop buyers pay a fee on top. Figures come from each marketplace&apos;s published fees.
      </p>
    </div>
  );
}

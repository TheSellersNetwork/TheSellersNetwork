"use client";

import { useId, useState } from "react";
import { Calculator } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/*
  "What does this mean for me" calculators used inside change breakdowns.
  Figures (before and after) come from the page's frontmatter author, who
  must take them from the official announcement.
*/

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pence = (n: number) => (Math.abs(n) < 1 ? `${Math.round(n * 100)}p` : gbp(n));

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="not-prose forum-card my-6 rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Calculator className="size-4 text-brand" aria-hidden="true" /> {title}
      </p>
      {children}
    </div>
  );
}

function Result({ monthly }: { monthly: number }) {
  const worse = monthly > 0;
  const same = Math.abs(monthly) < 0.005;
  return (
    <div className="mt-3 grid grid-cols-2 gap-3" aria-live="polite">
      {[
        { label: "A month", value: monthly },
        { label: "A year", value: monthly * 12 },
      ].map((r) => (
        <div key={r.label} className="rounded-lg bg-secondary p-3">
          <p className="text-xs text-muted-foreground">{r.label}</p>
          <p className={cn("text-xl font-semibold tabular-nums", same ? "" : worse ? "text-destructive" : "text-success")}>
            {same ? "No change" : `${worse ? "+" : "-"}${gbp(Math.abs(r.value))}`}
          </p>
          <p className="text-xs text-muted-foreground">{same ? "" : worse ? "more in fees" : "saved"}</p>
        </div>
      ))}
    </div>
  );
}

/* MDX passes props as text (it does not run code), so figures arrive as strings like "0.30". */
type Figure = number | string;
const num = (v: Figure) => Number(v);

export function PerUnitCalculator({ label, unit = "order", before: b, after: a }: { label: string; unit?: string; before: Figure; after: Figure }) {
  const before = num(b);
  const after = num(a);
  const id = useId();
  const [count, setCount] = useState("");
  const n = Math.max(0, Number(count) || 0);
  const diff = after - before;
  return (
    <Shell title="Work out your own numbers">
      <p className="mt-1 text-sm text-muted-foreground">
        {pence(before)} before, {pence(after)} now: {diff >= 0 ? `${pence(diff)} more` : `${pence(-diff)} less`} per {unit}.
      </p>
      <label htmlFor={id} className="mt-3 block text-sm font-medium">
        {label}
      </label>
      <Input id={id} inputMode="numeric" className="mt-1 w-40" placeholder="e.g. 120" value={count} onChange={(e) => setCount(e.target.value.replace(/[^0-9]/g, ""))} />
      {n > 0 ? <Result monthly={n * diff} /> : null}
    </Shell>
  );
}

export function PercentCalculator({ label, before: b, after: a }: { label: string; before: Figure; after: Figure }) {
  const before = num(b);
  const after = num(a);
  const id = useId();
  const [amount, setAmount] = useState("");
  const n = Math.max(0, Number(amount.replace(/,/g, "")) || 0);
  const diff = ((after - before) / 100) * n;
  return (
    <Shell title="Work out your own numbers">
      <p className="mt-1 text-sm text-muted-foreground">
        {before}% before, {after}% now: {after >= before ? "up" : "down"} {Math.abs(after - before).toFixed(1).replace(/\.0$/, "")} percentage points.
      </p>
      <label htmlFor={id} className="mt-3 block text-sm font-medium">
        {label}
      </label>
      <div className="mt-1 flex w-48 items-center gap-2">
        <span className="text-muted-foreground">£</span>
        <Input id={id} inputMode="decimal" placeholder="e.g. 2,000" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ""))} />
      </div>
      {n > 0 ? <Result monthly={diff} /> : null}
    </Shell>
  );
}

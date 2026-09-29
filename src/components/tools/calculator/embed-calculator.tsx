"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculate, feeData } from "@/lib/tools/fees";
import { sharedQuery } from "@/lib/og/calculator-share";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { embedSlugs, gbp, noExtras, toPlatformSale, type PlatformInputs } from "./model";

/*
  The small fee calculator other sites put in an iframe. Only the figures:
  no sign-in, no saving, nothing stored. The link at the bottom opens the full
  calculator with the same figures in a new tab.
*/

const num = (s: string) => {
  const n = Number(s.replace(/[£,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 100000) : 0;
};

const checked = new Date(`${feeData.checked}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const VAT_PLATFORMS = ["ebay_business", "ebay_live", "etsy", "whatnot", "amazon_fbm"];

export function EmbedCalculator({ initialSlug, fixed }: { initialSlug: string; fixed: boolean }) {
  const [slug, setSlug] = useState(initialSlug);
  const [price, setPrice] = useState("20");
  const [postage, setPostage] = useState("3.50");
  const [postageCost, setPostageCost] = useState("3.20");
  const [cost, setCost] = useState("5");
  const [vatOnFees, setVatOnFees] = useState(true);
  const page = embedSlugs.find((e) => e.slug === slug) ?? embedSlugs[0];
  const vinted = page.id === "vinted";
  const inputs: PlatformInputs = { price: num(price), postage: vinted ? 0 : num(postage), postageCost: num(postageCost), cost: num(cost), category: null, noVat: !vatOnFees, ...noExtras };
  const r = calculate(page.id, toPlatformSale(page.id, inputs));
  const full = `/tools/calculator/${page.slug}${inputs.price > 0 ? `?${sharedQuery(inputs)}` : ""}`;

  const field = (id: string, label: string, value: string, set: (v: string) => void) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className="h-9" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold">{fixed ? page.title : "Fee calculator"}</h1>
        {fixed ? null : (
          <div className="flex items-center gap-2">
            <Label htmlFor="em-platform" className="text-xs">
              Platform
            </Label>
            <select id="em-platform" value={slug} onChange={(e) => setSlug(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
              {embedSlugs.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.platform}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {field("em-price", "Selling price (£)", price, setPrice)}
        {vinted ? null : field("em-postage", "Buyer pays for postage (£)", postage, setPostage)}
        {field("em-postcost", "Postage cost (£)", postageCost, setPostageCost)}
        {field("em-cost", "You paid (£)", cost, setCost)}
      </div>
      {VAT_PLATFORMS.includes(page.id) ? (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" />
          Add VAT to fees
        </label>
      ) : null}
      {inputs.price > 0 ? (
        <div aria-live="polite" className="space-y-2">
          <dl className="grid grid-cols-3 gap-2">
            {[
              ["Fees", gbp(r.fees), false],
              ["You receive", gbp(r.youReceive), false],
              ["Profit", gbp(r.profit), true],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="rounded-md bg-secondary p-2">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className={cn("font-semibold tabular-nums", tone && (r.profit < 0 ? "text-destructive" : "text-success"))}>{value}</dd>
              </div>
            ))}
          </dl>
          {r.lines.length ? (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">Fee breakdown</summary>
              <table className="mt-1 w-full">
                <tbody className="divide-y">
                  {r.lines.map((l) => (
                    <tr key={l.label}>
                      <td className="py-0.5">{l.label}</td>
                      <td className="py-0.5 text-right tabular-nums">{gbp(l.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Enter a selling price.</p>
      )}
      <p className="flex flex-wrap justify-between gap-x-3 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
        <span>UK fees checked {checked}. Not financial advice.</span>
        <a href={full} target="_blank" rel="noopener" className="underline hover:text-foreground">
          Powered by {siteConfig.name}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Download, FileUp, Lock } from "lucide-react";
import { feeData } from "@/lib/tools/fees";
import { amazonFile, columnAliases, computeFloors, parseSkus, templateHeaders, type Fulfilment, type Settings } from "@/lib/tools/repricer-floors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/*
  Amazon repricer floors: minimum and maximum prices per SKU from the seller's
  own costs, ready for the Automate Pricing upload. Everything stays in the
  browser. Logic is in src/lib/tools/repricer-floors.ts.
*/

const gbp = (n: number | null | undefined) => (n === null || n === undefined || !Number.isFinite(n) ? "" : n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }));
const num = (s: string) => Number(s.replace(/[£,\s%]/g, "")) || 0;
const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const fieldNames: Record<string, string> = {
  sku: "SKU",
  cost: "Cost price",
  price: "Current price",
  category: "Category",
  fulfilment: "Fulfilment",
  fbaFee: "FBA fee",
  sizeTier: "Size tier",
  otherCosts: "Other costs",
  months: "Months in storage",
  cubicFeet: "Cubic feet",
};

function save(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Field({ id, label, value, onChange, hint, suffix }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; suffix?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function RepricerFloors() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [ruleKind, setRuleKind] = useState<"profit" | "roi">("profit");
  const [ruleValue, setRuleValue] = useState("2");
  const [fulfilment, setFulfilment] = useState<Fulfilment>("FBA");
  const [category, setCategory] = useState("other");
  const [fbaFee, setFbaFee] = useState("");
  const [otherCosts, setOtherCosts] = useState("0");
  const [months, setMonths] = useState("1");
  const [cubic, setCubic] = useState("0");
  const [peak, setPeak] = useState(false);
  const [vatOnFees, setVatOnFees] = useState(true);
  const [maxMode, setMaxMode] = useState<Settings["maxMode"]>("multiple");
  const [maxFactor, setMaxFactor] = useState("2");
  const [ruleName, setRuleName] = useState("");

  const parsed = useMemo(
    () => (text.trim() ? parseSkus(text, { category, fulfilment, fbaFee: fbaFee.trim() ? num(fbaFee) : null, otherCosts: num(otherCosts), months: num(months), cubicFeet: num(cubic) }) : null),
    [text, category, fulfilment, fbaFee, otherCosts, months, cubic],
  );
  const settings = useMemo<Settings>(() => ({ rule: { kind: ruleKind, value: num(ruleValue) }, vatOnFees, peak, maxMode, maxFactor: num(maxFactor) || 1 }), [ruleKind, ruleValue, vatOnFees, peak, maxMode, maxFactor]);
  const rows = useMemo(() => (parsed ? computeFloors(parsed.rows, settings) : []), [parsed, settings]);
  const ready = rows.filter((r) => r.min !== null && r.max !== null).length;

  async function onFile(files: FileList | null) {
    setError("");
    const f = files?.[0];
    if (!f) return;
    try {
      setText(await f.text());
      setFileName(f.name);
    } catch {
      setError("That file could not be read. Save it as CSV or tab-separated text and try again.");
    }
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="rf-rule" className="space-y-4 rounded-xl border bg-card p-4">
        <h2 id="rf-rule" className="text-lg font-semibold">
          Your rule
        </h2>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Never sell for less than</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="rf-kind" checked={ruleKind === "profit"} onChange={() => setRuleKind("profit")} className="size-4" /> A profit per unit in pounds
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="rf-kind" checked={ruleKind === "roi"} onChange={() => setRuleKind("roi")} className="size-4" /> A return on cost (ROI)
            </label>
          </div>
          <div className="w-48">
            <Field id="rf-value" label={ruleKind === "profit" ? "Least profit per unit (£)" : "Least ROI"} value={ruleValue} onChange={setRuleValue} suffix={ruleKind === "roi" ? "%" : undefined} />
          </div>
          {ruleKind === "roi" ? <p className="text-xs text-muted-foreground">ROI here is profit divided by your cost price, the same as our FBA calculator.</p> : null}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Maximum price</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="rf-max" checked={maxMode === "multiple"} onChange={() => setMaxMode("multiple")} className="size-4" /> The minimum times a number
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="rf-max" checked={maxMode === "current"} onChange={() => setMaxMode("current")} className="size-4" /> The current price times a number
            </label>
          </div>
          <div className="w-48">
            <Field id="rf-factor" label="Times" value={maxFactor} onChange={setMaxFactor} suffix="×" />
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={vatOnFees} onChange={(e) => setVatOnFees(e.target.checked)} className="size-4" /> Add VAT to Amazon&rsquo;s fees (untick if you are VAT registered and reclaim it)
        </label>
        <div className="max-w-sm">
          <Label htmlFor="rf-rule-name">Automate Pricing rule name (optional)</Label>
          <Input id="rf-rule-name" className="mt-1" value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Type it exactly as it appears in Automate Pricing. If you fill this in, the file adds rule-name and rule-action (START) so the SKUs join that rule.</p>
        </div>
      </section>

      <section aria-labelledby="rf-defaults" className="space-y-4 rounded-xl border bg-card p-4">
        <div>
          <h2 id="rf-defaults" className="text-lg font-semibold">
            Defaults
          </h2>
          <p className="text-sm text-muted-foreground">Used for any SKU where your file leaves the column out or blank.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="rf-fulfil">Fulfilment</Label>
            <select id="rf-fulfil" value={fulfilment} onChange={(e) => setFulfilment(e.target.value as Fulfilment)} className={selectCls}>
              <option value="FBA">FBA (Amazon sends it)</option>
              <option value="FBM">FBM (you send it)</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="rf-cat">Category (for the referral fee)</Label>
            <select id="rf-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
              {feeData.amazon.referral.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="rf-tier">FBA size tier</Label>
            <select id="rf-tier" value={fbaFee} onChange={(e) => setFbaFee(e.target.value)} className={selectCls}>
              <option value="">Choose, or type the fee</option>
              {feeData.amazon.fbaExamples.map((t) => (
                <option key={t.tier} value={String(t.fee)}>
                  {t.tier}: {gbp(t.fee)}
                </option>
              ))}
            </select>
          </div>
          <Field id="rf-fee" label="Or type the FBA fee (£)" value={fbaFee} onChange={setFbaFee} hint="From Amazon's own calculator" />
          <Field id="rf-other" label="Other costs per unit (£)" value={otherCosts} onChange={setOtherCosts} hint="FBM: postage and packaging. FBA: shipping to Amazon and prep." />
          <Field id="rf-months" label="Months in storage (FBA)" value={months} onChange={setMonths} />
          <Field id="rf-cubic" label="Size per unit, cubic feet (FBA)" value={cubic} onChange={setCubic} hint="Length × width × height in inches ÷ 1728" />
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input type="checkbox" checked={peak} onChange={(e) => setPeak(e.target.checked)} className="size-4" /> Use October to December storage rates
          </label>
        </div>
      </section>

      <section aria-labelledby="rf-skus" className="space-y-3">
        <h2 id="rf-skus" className="text-lg font-semibold">
          Your SKUs
        </h2>
        <div className="rounded-xl border-2 border-dashed p-6 text-center">
          <FileUp className="mx-auto size-8 text-brand" aria-hidden="true" />
          <label className="mt-2 block cursor-pointer font-medium">
            Choose a CSV or tab-separated file
            <input type="file" accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values" className="sr-only" onChange={(e) => onFile(e.target.files)} />
          </label>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="size-3" aria-hidden="true" /> Read in your browser only. Nothing is uploaded or saved.
          </p>
          {fileName ? <p className="mt-1 text-sm">{fileName}</p> : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="rf-text">Or paste or type them here, with a header row</Label>
          <Textarea id="rf-text" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={"sku,cost,price,category,fulfilment,fba-fee\nMY-SKU-1,4.50,14.99,toys,FBA,3.00"} className="font-mono text-sm" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => save(`${templateHeaders.join(",")}\r\n`, "repricer-floors-template.csv", "text/csv")}>
            <Download className="size-4" aria-hidden="true" /> Blank template
          </Button>
          {text ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setText("");
                setFileName("");
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Only sku and cost are needed. Optional columns: price (current), category, fulfilment (FBA or FBM; Amazon&rsquo;s AFN and MFN work too), fba-fee, size-tier, other-costs, months, cubic-feet.
        </p>
      </section>

      {parsed ? (
        <section aria-live="polite" aria-labelledby="rf-results" className="space-y-4">
          <h2 id="rf-results" className="text-lg font-semibold">
            Minimum and maximum prices
          </h2>
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Columns we found</p>
            <ul className="mt-1 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
              {Object.keys(columnAliases).map((k) => (
                <li key={k} className={cn(parsed.columns[k] ? "" : "text-muted-foreground")}>
                  {fieldNames[k]}: {parsed.columns[k] ? `"${parsed.columns[k]}"` : k === "sku" || k === "cost" ? "missing, needed" : "not in file, default used"}
                </li>
              ))}
            </ul>
            {!parsed.columns.sku || !parsed.columns.cost ? <p className="mt-2 text-destructive">Your file needs a column called sku and one called cost (or cost price).</p> : null}
            {parsed.skipped.length ? (
              <details className="mt-2">
                <summary className="cursor-pointer">{parsed.skipped.length} rows skipped</summary>
                <ul className="mt-1 text-muted-foreground">
                  {parsed.skipped.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          {rows.length ? (
            <>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">Minimum and maximum price for each SKU</caption>
                  <thead className="bg-secondary text-left">
                    <tr>
                      <th scope="col" className="p-2 font-medium">SKU</th>
                      <th scope="col" className="p-2 font-medium">Fulfilment</th>
                      <th scope="col" className="p-2 text-right font-medium">Cost</th>
                      <th scope="col" className="p-2 text-right font-medium">Current</th>
                      <th scope="col" className="p-2 text-right font-medium">Minimum</th>
                      <th scope="col" className="p-2 text-right font-medium">Maximum</th>
                      <th scope="col" className="p-2 text-right font-medium">Fees at minimum</th>
                      <th scope="col" className="p-2 text-right font-medium">Profit at minimum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => (
                      <tr key={`${r.input.sku}-${i}`} className="align-top">
                        <th scope="row" className="p-2 text-left font-medium">
                          {r.input.sku}
                          {r.problems.length ? (
                            <ul className="mt-1 text-xs font-normal text-destructive">
                              {r.problems.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                          ) : null}
                        </th>
                        <td className="p-2">{r.input.fulfilment}</td>
                        <td className="p-2 text-right tabular-nums">{gbp(r.input.cost)}</td>
                        <td className={cn("p-2 text-right tabular-nums", r.input.price !== null && r.min !== null && r.input.price < r.min && "text-destructive")}>{gbp(r.input.price)}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">{r.min === null ? "?" : gbp(r.min)}</td>
                        <td className="p-2 text-right tabular-nums">{r.max === null ? "?" : gbp(r.max)}</td>
                        <td className="p-2 text-right tabular-nums">{gbp(r.feesAtMin)}</td>
                        <td className="p-2 text-right tabular-nums text-success">{gbp(r.profitAtMin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" onClick={() => save(amazonFile(rows, ruleName, ","), "automate-pricing-min-max.csv", "text/csv")} disabled={!ready}>
                  <Download className="size-4" aria-hidden="true" /> Download CSV
                </Button>
                <Button type="button" variant="outline" onClick={() => save(amazonFile(rows, ruleName, "\t"), "automate-pricing-min-max.txt", "text/plain")} disabled={!ready}>
                  <Download className="size-4" aria-hidden="true" /> Download tab-separated text
                </Button>
                <p className="text-sm text-muted-foreground">
                  {ready} of {rows.length} SKUs have a minimum and maximum.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Columns: sku, minimum-seller-allowed-price, maximum-seller-allowed-price{ruleName.trim() ? ", rule-name, rule-action" : ""}. These match the headers in Amazon&rsquo;s UK Automate Pricing template, but Amazon can change its template: download the current one from Seller Central and paste these columns into it before you upload. SKUs with a question mark are left out of the file.
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Minimums use Amazon&rsquo;s referral fee for the category, the digital services fee, and for FBA the fulfilment fee you give, the fuel and logistics surcharge and storage, all from our fee data checked on{" "}
        {new Date(`${feeData.checked}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}. They do not include the Professional plan&rsquo;s monthly fee, advertising, returns, or VAT you owe on your sales if you are VAT registered. Check the result against Amazon&rsquo;s own revenue calculator for a few SKUs before you rely on it. Not financial advice.
      </p>
    </div>
  );
}

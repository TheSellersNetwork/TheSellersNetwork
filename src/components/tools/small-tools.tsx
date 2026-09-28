"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Download, X } from "lucide-react";
import { parseCsv, parseMoney, toCsv } from "@/lib/tools/sales-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/* Small calculators that need only what the seller types: no fee tables, no outside data. */

const gbp = (n: number) => (Number.isFinite(n) ? n.toLocaleString("en-GB", { style: "currency", currency: "GBP" }) : "");
const num = (s: string) => Number(s.replace(/[£,\s%]/g, "")) || 0;

function Field({ id, label, value, onChange, suffix, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input id={id} inputMode="decimal" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {suffix ? <span className="text-sm text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-semibold tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</p>
    </div>
  );
}

/* ---- Stock ageing and markdown planner ---- */
export function StockAgeing() {
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [days, setDays] = useState("");
  const [feePct, setFeePct] = useState("13");
  const [postage, setPostage] = useState("");
  const steps = [
    { at: 30, off: 10 },
    { at: 60, off: 20 },
    { at: 90, off: 30 },
  ];
  const c = num(cost);
  const p = num(price);
  const f = num(feePct) / 100;
  const post = num(postage);
  const floor = f < 1 ? (c + post) / (1 - f) : 0;
  const d = num(days);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-5">
        <Field id="sa-cost" label="You paid" value={cost} onChange={setCost} placeholder="8" />
        <Field id="sa-price" label="Listed at" value={price} onChange={setPrice} placeholder="35" />
        <Field id="sa-days" label="Days listed" value={days} onChange={setDays} placeholder="45" />
        <Field id="sa-fee" label="Fees" value={feePct} onChange={setFeePct} suffix="%" />
        <Field id="sa-post" label="Postage you pay" value={postage} onChange={setPostage} placeholder="3.50" />
      </div>
      {c > 0 && p > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Break-even price (never go below)" value={gbp(floor)} />
            <Stat label="Profit at today's price" value={gbp(p * (1 - f) - c - post)} tone={p * (1 - f) - c - post >= 0 ? "good" : "bad"} />
            <Stat label="Money tied up" value={gbp(c)} />
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">When</th>
                <th className="py-1">Price</th>
                <th className="py-1 text-right">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {steps.map((s) => {
                const np = Math.max(floor, p * (1 - s.off / 100));
                const due = d >= s.at;
                return (
                  <tr key={s.at} className={due ? "font-medium" : ""}>
                    <td className="py-1.5">
                      Day {s.at} ({s.off}% off){due ? " · due now" : ""}
                    </td>
                    <td className="py-1.5 tabular-nums">{gbp(Math.round(np * 100) / 100)}</td>
                    <td className="py-1.5 text-right tabular-nums">{gbp(np * (1 - f) - c - post)}</td>
                  </tr>
                );
              })}
              <tr>
                <td className="py-1.5" colSpan={3}>
                  After day 90: bundle it, try another platform, or sell it on for what you paid and move on. See{" "}
                  <Link href="/guides/stale-stock" className="underline">
                    stale stock
                  </Link>
                  .
                </td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Enter what you paid and the listed price.</p>
      )}
    </div>
  );
}

/* The column that names each listing: a title if there is one, not an item number. */
function titleCol(headers: string[]): string {
  return headers.find((h) => /title/i.test(h)) ?? headers.find((h) => /name|description/i.test(h)) ?? headers.find((h) => /item/i.test(h) && !/number|id|sku/i.test(h)) ?? headers[0];
}

/* ---- Bulk price change ---- */
export function BulkPrice() {
  const [rows, setRows] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [priceCol, setPriceCol] = useState("");
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState("-10");
  const [round, setRound] = useState<"none" | "99" | "49" | "whole">("99");
  const [minimum, setMinimum] = useState("");

  const apply = (p: number) => {
    let n = mode === "percent" ? p * (1 + num(amount) / 100) : p + num(amount);
    // Nearest price ending in .99 (9.60 becomes 9.99, 10.20 becomes 9.99).
    if (round === "99") n = Math.max(0.99, Math.round(n + 0.01) - 0.01);
    if (round === "49") n = Math.floor(n) + 0.49;
    if (round === "whole") n = Math.round(n);
    const min = num(minimum);
    if (min && n < min) n = min;
    return Math.round(n * 100) / 100;
  };

  const preview = useMemo(() => (rows && priceCol ? rows.rows.map((r) => ({ r, old: parseMoney(r[priceCol]), next: apply(parseMoney(r[priceCol])) })) : []), [rows, priceCol, mode, amount, round, minimum]); // eslint-disable-line react-hooks/exhaustive-deps

  function download() {
    if (!rows) return;
    const out = [rows.headers, ...preview.map(({ r, next }) => rows.headers.map((h) => (h === priceCol ? next.toFixed(2) : r[h] ?? "")))];
    const url = URL.createObjectURL(new Blob([toCsv(out)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "new-prices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed p-5 text-center text-sm">
        <span className="font-medium">Choose your listings CSV</span> (for example an eBay active listings download). Read in your browser only.
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const parsed = parseCsv(await f.text());
            setRows(parsed);
            setPriceCol(parsed.headers.find((h) => /price/i.test(h)) ?? "");
          }}
        />
      </label>
      {rows ? (
        <>
          <div className="grid gap-3 sm:grid-cols-5">
            <div className="space-y-1">
              <Label htmlFor="bp-col">Price column</Label>
              <select id="bp-col" value={priceCol} onChange={(e) => setPriceCol(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="">Choose</option>
                {rows.headers.map((h) => (
                  <option key={h}>{h}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bp-mode">Change by</Label>
              <select id="bp-mode" value={mode} onChange={(e) => setMode(e.target.value as "percent" | "fixed")} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed £</option>
              </select>
            </div>
            <Field id="bp-amount" label={mode === "percent" ? "Change (%)" : "Change (£)"} value={amount} onChange={setAmount} />
            <div className="space-y-1">
              <Label htmlFor="bp-round">Round to</Label>
              <select id="bp-round" value={round} onChange={(e) => setRound(e.target.value as typeof round)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
                <option value="99">.99</option>
                <option value="49">.49</option>
                <option value="whole">Whole pounds</option>
                <option value="none">No rounding</option>
              </select>
            </div>
            <Field id="bp-min" label="Never below (£)" value={minimum} onChange={setMinimum} />
          </div>
          {priceCol ? (
            <>
              <div className="max-h-80 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    {preview.slice(0, 200).map(({ r, old, next }, i) => (
                      <tr key={i}>
                        <td className="max-w-xs truncate p-2">{r[titleCol(rows.headers)]}</td>
                        <td className="p-2 text-right tabular-nums text-muted-foreground">{gbp(old)}</td>
                        <td className="p-2 text-right font-medium tabular-nums">{gbp(next)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button type="button" onClick={download}>
                <Download className="size-4" /> Download new prices (CSV)
              </Button>
              <p className="text-xs text-muted-foreground">Upload the file back through your platform&rsquo;s bulk edit or file upload. Check a few rows before you do.</p>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/* ---- ISBN check and lookup (Open Library, free and public) ---- */
export function isbnValid(raw: string): string | null {
  const s = raw.replace(/[-\s]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(s)) {
    const sum = s.split("").reduce((t, ch, i) => t + (ch === "X" ? 10 : +ch) * (10 - i), 0);
    return sum % 11 === 0 ? s : null;
  }
  if (/^\d{13}$/.test(s)) {
    const sum = s.split("").reduce((t, ch, i) => t + +ch * (i % 2 ? 3 : 1), 0);
    return sum % 10 === 0 ? s : null;
  }
  return null;
}

export function IsbnLookup() {
  const [isbn, setIsbn] = useState("");
  const [result, setResult] = useState<{ title?: string; authors?: string; publishers?: string; date?: string; pages?: number } | null>(null);
  const [message, setMessage] = useState("");
  const valid = isbnValid(isbn);

  async function look() {
    if (!valid) return;
    setMessage("Looking up");
    setResult(null);
    try {
      const res = await fetch(`https://openlibrary.org/isbn/${valid}.json`);
      if (!res.ok) throw new Error();
      const b = (await res.json()) as { title?: string; publishers?: string[]; publish_date?: string; number_of_pages?: number; authors?: { key: string }[] };
      let authors = "";
      if (b.authors?.length) {
        const names = await Promise.all(b.authors.slice(0, 3).map(async (a) => ((await (await fetch(`https://openlibrary.org${a.key}.json`)).json()) as { name?: string }).name ?? ""));
        authors = names.filter(Boolean).join(", ");
      }
      setResult({ title: b.title, authors, publishers: b.publishers?.join(", "), date: b.publish_date, pages: b.number_of_pages });
      setMessage("");
    } catch {
      setMessage("Not found in Open Library. The number is valid, so the book may just not be listed there.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex max-w-md items-end gap-2">
        <div className="flex-1 space-y-1">
          <Label htmlFor="isbn">ISBN (10 or 13 digits, on the back cover or copyright page)</Label>
          <Input id="isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} placeholder="978..." />
        </div>
        <Button type="button" onClick={look} disabled={!valid}>
          Look up
        </Button>
      </div>
      {isbn.replace(/[-\s]/g, "").length >= 10 ? (
        <p className={cn("flex items-center gap-1 text-sm", valid ? "text-success" : "text-destructive")}>
          {valid ? <Check className="size-4" /> : <X className="size-4" />}
          {valid ? "Valid ISBN." : "That is not a valid ISBN: check for a typo."}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {result ? (
        <dl className="grid gap-2 rounded-xl border bg-card p-4 text-sm sm:grid-cols-[120px_1fr]">
          {[
            ["Title", result.title],
            ["Author", result.authors],
            ["Publisher", result.publishers],
            ["Published", result.date],
            ["Pages", result.pages ? String(result.pages) : ""],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted-foreground">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
      ) : null}
      <p className="text-xs text-muted-foreground">Book details come from Open Library, a free public catalogue. It does not show prices; check recent sold listings for those.</p>
    </div>
  );
}

/* ---- Scam message checker (a checklist, not AI) ---- */
const scamSigns = [
  ["They want to pay by a method with no buyer or seller protection, or ask you to go off the platform.", true],
  ["You got an email or text saying payment is 'pending' until you do something (pay a fee, send a code, click a link).", true],
  ["They asked for a code sent to your phone or email.", true],
  ["They offered to send their own courier and asked you to pay a delivery fee or insurance.", true],
  ["They sent more than the price and want the difference back.", true],
  ["The link they sent goes to a site that is not the platform's own address.", true],
  ["They are rushing you, or telling a story about why it has to happen now.", false],
  ["Their account is brand new, has no feedback, or the name does not match the payment.", false],
  ["They want your bank details, card details or personal information.", true],
] as const;

export function ScamCheck() {
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const serious = scamSigns.filter(([, s], i) => s && ticked.has(i)).length;
  const any = ticked.size;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Tick anything that has happened in the conversation.</p>
      <ul className="space-y-2">
        {scamSigns.map(([text], i) => (
          <li key={i}>
            <label className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 size-4"
                checked={ticked.has(i)}
                onChange={(e) => {
                  const next = new Set(ticked);
                  if (e.target.checked) next.add(i);
                  else next.delete(i);
                  setTicked(next);
                }}
              />
              {text}
            </label>
          </li>
        ))}
      </ul>
      <div className={cn("rounded-xl border-2 p-4", serious ? "border-destructive/60" : any ? "border-brand/40" : "border-transparent")} aria-live="polite">
        {serious ? (
          <p className="font-semibold text-destructive">This has the signs of a scam. Stop replying, do not send anything or share any code, and report the account on the platform.</p>
        ) : any ? (
          <p className="font-semibold">Be careful. Keep everything on the platform and only accept its own payment method.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing ticked yet.</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          If you have lost money, contact your bank straight away, then report it to{" "}
          <a href="https://www.reportfraud.police.uk/" target="_blank" rel="noopener" className="underline">
            Report Fraud
          </a>{" "}
          (which replaced Action Fraud)
          . You can forward scam texts to 7726. More in{" "}
          <Link href="/guides/facebook-marketplace-scams" className="underline">
            Facebook Marketplace scams
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

/* ---- Platform reporting counter ---- */
export function ReportingCheck() {
  const platforms = ["eBay", "Vinted", "Depop", "Etsy", "Amazon", "TikTok Shop", "Whatnot", "Other"];
  const [v, setV] = useState<Record<string, { sales: string; total: string }>>(Object.fromEntries(platforms.map((p) => [p, { sales: "", total: "" }])));
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">For each platform, enter this calendar year&rsquo;s number of sales and total received. Each platform counts separately.</p>
      <div className="divide-y rounded-xl border">
        {platforms.map((p) => {
          const s = num(v[p].sales);
          const t = num(v[p].total);
          const over = s >= 30 || t >= 1700;
          const near = !over && (s >= 24 || t >= 1400);
          return (
            <div key={p} className="grid items-end gap-2 p-3 sm:grid-cols-[120px_1fr_1fr_1.5fr]">
              <span className="font-medium">{p}</span>
              <Field id={`rc-s-${p}`} label="Sales" value={v[p].sales} onChange={(x) => setV({ ...v, [p]: { ...v[p], sales: x } })} />
              <Field id={`rc-t-${p}`} label="Received (£)" value={v[p].total} onChange={(x) => setV({ ...v, [p]: { ...v[p], total: x } })} />
              <span className={cn("text-sm", over ? "font-medium text-destructive" : near ? "text-brand" : "text-muted-foreground")}>
                {s || t ? (over ? "This platform will report you to HMRC." : near ? "Close to the reporting limit." : "Below the reporting limit.") : ""}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Platforms report sellers with 30 or more sales, or about £1,700 (€2,000) or more, in a calendar year (
        <a href="https://www.gov.uk/guidance/selling-goods-or-services-on-a-digital-platform" target="_blank" rel="noopener" className="underline">
          GOV.UK
        </a>
        ). Being reported does not by itself mean you owe tax; whether you do depends on whether you are trading and your income over the tax year. Not tax advice. See{" "}
        <Link href="/blog/hmrc-platform-reporting-rules" className="underline">
          platform reporting explained
        </Link>
        .
      </p>
    </div>
  );
}

/* ---- VAT arithmetic ---- */
export function VatTools() {
  const [months, setMonths] = useState<string[]>(Array(12).fill(""));
  const [buy, setBuy] = useState("");
  const [sell, setSell] = useState("");
  const [turnover, setTurnover] = useState("");
  const [flatRate, setFlatRate] = useState("16.5");
  const [vatOnCosts, setVatOnCosts] = useState("");
  const rolling = months.reduce((t, m) => t + num(m), 0);
  const margin = num(sell) - num(buy);
  const marginVat = margin > 0 ? margin / 6 : 0;
  const gross = num(turnover);
  const flat = (gross * num(flatRate)) / 100;
  const standard = gross / 6 - num(vatOnCosts);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold">Rolling 12 months against the VAT threshold</h2>
        <p className="text-sm text-muted-foreground">Enter your VAT-taxable turnover for each of the last 12 months, oldest first.</p>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {months.map((m, i) => (
            <Input key={i} aria-label={`Month ${i + 1}`} inputMode="decimal" value={m} placeholder={`Month ${i + 1}`} onChange={(e) => setMonths(months.map((x, j) => (j === i ? e.target.value : x)))} />
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Stat label="Last 12 months" value={gbp(rolling)} tone={rolling > 90000 ? "bad" : undefined} />
          <Stat label="Room below £90,000" value={gbp(Math.max(0, 90000 - rolling))} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          You must register if taxable turnover over the last 12 months goes over £90,000, within 30 days of the end of that month (
          <a href="https://www.gov.uk/vat-registration/when-to-register" target="_blank" rel="noopener" className="underline">
            GOV.UK
          </a>
          ). Turnover means sales, not profit.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Margin scheme: VAT on one second-hand item</h2>
        <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
          <Field id="vat-buy" label="You bought it for (£)" value={buy} onChange={setBuy} />
          <Field id="vat-sell" label="You sold it for (£)" value={sell} onChange={setSell} />
        </div>
        {num(sell) ? (
          <div className="mt-3 grid max-w-lg gap-3 sm:grid-cols-2">
            <Stat label="Margin" value={gbp(margin)} />
            <Stat label="VAT due on the margin (1/6)" value={gbp(marginVat)} />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          Under the margin scheme, VAT is 1/6 of the margin at the 20% rate, and nothing if you sold at a loss. There are conditions and record-keeping rules: see{" "}
          <a href="https://www.gov.uk/guidance/the-margin-and-global-accounting-scheme-vat-notice-718" target="_blank" rel="noopener" className="underline">
            VAT Notice 718
          </a>
          .
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Flat Rate Scheme against standard VAT</h2>
        <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-3">
          <Field id="vat-t" label="Quarter's sales incl. VAT (£)" value={turnover} onChange={setTurnover} />
          <Field id="vat-fr" label="Your flat rate" value={flatRate} onChange={setFlatRate} suffix="%" />
          <Field id="vat-c" label="VAT you paid on costs (£)" value={vatOnCosts} onChange={setVatOnCosts} />
        </div>
        {gross ? (
          <div className="mt-3 grid max-w-2xl gap-3 sm:grid-cols-2">
            <Stat label="Flat Rate Scheme: VAT to pay" value={gbp(flat)} />
            <Stat label="Standard: VAT to pay (roughly)" value={gbp(standard)} />
          </div>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">
          16.5% is the rate for limited cost traders; other rates depend on your business type. See{" "}
          <a href="https://www.gov.uk/guidance/flat-rate-scheme-for-small-businesses-vat-notice-733--2" target="_blank" rel="noopener" className="underline">
            VAT Notice 733
          </a>
          . Arithmetic only, not tax advice: an accountant can tell you which scheme suits you.
        </p>
      </section>
    </div>
  );
}

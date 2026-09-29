"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileUp, Lock } from "lucide-react";
import { guessMapping, parseCsv, summarise, toCsv, type Mapping, type Row } from "@/lib/tools/sales-report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const gbp = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP" });
const select = "h-9 w-full rounded-md border bg-background px-2 text-sm";

type Loaded = { name: string; headers: string[]; rows: Row[]; mapping: Mapping; types: string[]; include: Set<string> | null };

export function SalesReportTool() {
  const [files, setFiles] = useState<Loaded[]>([]);
  const [error, setError] = useState("");
  const [costs, setCosts] = useState("");

  async function onFiles(list: FileList | null) {
    setError("");
    if (!list) return;
    const next: Loaded[] = [];
    for (const f of Array.from(list).slice(0, 10)) {
      if (f.size > 20 * 1024 * 1024) {
        setError(`${f.name} is over 20 MB. Export a shorter date range.`);
        continue;
      }
      try {
        const { headers, rows } = parseCsv(await f.text());
        if (!rows.length) throw new Error("empty");
        const mapping = guessMapping(headers);
        const types = mapping.type ? Array.from(new Set(rows.map((r) => r[mapping.type!] ?? ""))).filter(Boolean).slice(0, 30) : [];
        // Start with sale-like rows only, when the file has a type column.
        const saleLike = types.filter((t) => /order|sale|sold|shipment|completed|paid/i.test(t));
        next.push({ name: f.name, headers, rows, mapping, types, include: types.length ? new Set(saleLike.length ? saleLike : types) : null });
      } catch {
        setError(`We could not read ${f.name}. It needs to be a CSV file from your selling account.`);
      }
    }
    setFiles((prev) => [...prev, ...next]);
  }

  const update = (i: number, change: Partial<Loaded>) => setFiles((fs) => fs.map((f, j) => (j === i ? { ...f, ...change } : f)));
  const summaries = useMemo(() => files.map((f) => summarise(f.rows, f.mapping, f.include)), [files]);
  const total = summaries.reduce((t, s) => ({ gross: t.gross + s.gross, fees: t.fees + s.fees, postage: t.postage + s.postage, net: t.net + s.net, rows: t.rows + s.rows }), { gross: 0, fees: 0, postage: 0, net: 0, rows: 0 });
  const cost = Number(costs.replace(/[£,]/g, "")) || 0;

  // Combine tax years and calendar years across every file.
  const combine = (key: "byTaxYear" | "byCalendarYear") => {
    const m = new Map<string, { count: number; gross: number; net: number }>();
    for (const s of summaries) for (const r of s[key]) {
      const e = m.get(r.key) ?? { count: 0, gross: 0, net: 0 };
      e.count += r.count;
      e.gross += r.gross;
      e.net += "net" in r ? (r as { net: number }).net : 0;
      m.set(r.key, e);
    }
    return Array.from(m, ([k, v]) => ({ key: k, ...v })).sort((a, b) => a.key.localeCompare(b.key));
  };
  const taxYears = combine("byTaxYear");
  const calYears = combine("byCalendarYear");

  function download() {
    const rows: (string | number)[][] = [["File", "Month", "Sales", "Gross", "Fees", "Net"]];
    files.forEach((f, i) => summaries[i].byMonth.forEach((m) => rows.push([f.name, m.key, String(m.count), m.gross, m.fees, m.net])));
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-summary.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-dashed p-6 text-center">
        <FileUp className="mx-auto size-8 text-brand" aria-hidden="true" />
        <label className="mt-2 block cursor-pointer font-medium">
          Choose your sales report files (CSV)
          <input type="file" accept=".csv,text/csv" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} />
        </label>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" /> Read in your browser only. Nothing is uploaded or saved.
        </p>
        {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
      </div>

      {files.map((f, i) => (
        <section key={`${f.name}-${i}`} className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{f.name}</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}>
              Remove
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {f.rows.length} rows. We guessed which column is which; check them.
            {summaries[i].skipped ? ` ${summaries[i].skipped} rows had no readable date and were left out.` : ""}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {(["date", "item", "gross", "postage", "net", "type"] as const).map((k) => (
              <div key={k} className="space-y-1">
                <Label className="text-xs capitalize">{k === "gross" ? "Sale amount" : k === "net" ? "Net payout (optional)" : k === "type" ? "Row type (optional)" : k}</Label>
                <select className={select} value={f.mapping[k] ?? ""} onChange={(e) => update(i, { mapping: { ...f.mapping, [k]: e.target.value || null } })}>
                  <option value="">None</option>
                  {f.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs">Fee columns (tick all that are fees)</Label>
              <div className="flex flex-wrap gap-2">
                {f.headers.map((h) => (
                  <label key={h} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                    <input
                      type="checkbox"
                      checked={f.mapping.fees.includes(h)}
                      onChange={(e) => update(i, { mapping: { ...f.mapping, fees: e.target.checked ? [...f.mapping.fees, h] : f.mapping.fees.filter((x) => x !== h) } })}
                    />
                    {h}
                  </label>
                ))}
              </div>
            </div>
            {f.types.length ? (
              <div className="space-y-1 sm:col-span-3">
                <Label className="text-xs">Count these row types as sales</Label>
                <div className="flex flex-wrap gap-2">
                  {f.types.map((t) => (
                    <label key={t} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                      <input
                        type="checkbox"
                        checked={f.include?.has(t) ?? true}
                        onChange={(e) => {
                          const next = new Set(f.include ?? f.types);
                          if (e.target.checked) next.add(t);
                          else next.delete(t);
                          update(i, { include: next });
                        }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <p className="mt-3 text-sm">
            {summaries[i].rows} sales · {gbp(summaries[i].gross)} sales · {gbp(summaries[i].fees)} fees · {gbp(summaries[i].net)} net
          </p>
        </section>
      ))}

      {files.length ? (
        <section aria-labelledby="totals" className="space-y-6">
          <h2 id="totals" className="text-xl font-semibold">
            All files together
          </h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              ["Sales", total.gross],
              ["Fees", total.fees],
              ["Net payout", total.net],
              ["Profit after costs", total.net - cost],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold tabular-nums">{gbp(v as number)}</p>
              </div>
            ))}
          </div>
          <div className="max-w-xs space-y-1">
            <Label htmlFor="costs">What you paid for the stock you sold (£)</Label>
            <Input id="costs" inputMode="decimal" value={costs} onChange={(e) => setCosts(e.target.value)} placeholder="From your stock tracker" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">By UK tax year</h3>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y">
                  {taxYears.map((t) => (
                    <tr key={t.key}>
                      <td className="py-1.5">{t.key}</td>
                      <td className="py-1.5 text-right tabular-nums">{t.count} sales</td>
                      <td className="py-1.5 text-right tabular-nums">{gbp(t.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Trading income over £1,000 in a tax year usually needs telling to HMRC. See{" "}
                <Link href="/tools/tax" className="underline">
                  tax dates and thresholds
                </Link>
                . Not tax advice.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">By calendar year (what platforms report)</h3>
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y">
                  {calYears.map((t) => (
                    <tr key={t.key}>
                      <td className="py-1.5">{t.key}</td>
                      <td className="py-1.5 text-right tabular-nums">{t.count} sales</td>
                      <td className="py-1.5 text-right tabular-nums">{gbp(t.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-muted-foreground">
                Each platform reports you to HMRC separately once you reach 30 sales or about £1,700 on that platform in a calendar year. See{" "}
                <Link href="/blog/hmrc-platform-reporting-rules" className="underline">
                  platform reporting explained
                </Link>
                .
              </p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={download}>
            Download monthly summary (CSV)
          </Button>
        </section>
      ) : null}
    </div>
  );
}

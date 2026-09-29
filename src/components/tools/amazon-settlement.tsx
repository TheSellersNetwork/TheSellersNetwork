"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileUp, Lock } from "lucide-react";
import {
  detectKind,
  formatDate,
  readReport,
  REPORT_NAMES,
  SETTLEMENT_CATEGORIES,
  settlementJournalCsv,
  settlementSummaryCsv,
  summariseSettlements,
  type SettlementCategory,
  type Table,
} from "@/lib/tools/amazon-reports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const money = (n: number, currency = "GBP") => {
  try {
    return n.toLocaleString("en-GB", { style: "currency", currency: currency || "GBP" });
  } catch {
    return n.toFixed(2);
  }
};

function save(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

type Loaded = { name: string; table: Table };

const defaultAccounts = () =>
  Object.fromEntries(SETTLEMENT_CATEGORIES.map((c) => [c.id, c.account])) as Record<
    SettlementCategory,
    string
  >;

export function AmazonSettlement() {
  const [files, setFiles] = useState<Loaded[]>([]);
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState(defaultAccounts);
  const [payout, setPayout] = useState("Bank");

  async function onFiles(list: FileList | null) {
    setError("");
    if (!list) return;
    const next: Loaded[] = [];
    const problems: string[] = [];
    for (const f of Array.from(list).slice(0, 20)) {
      if (f.size > 30 * 1024 * 1024) {
        problems.push(`${f.name} is over 30 MB.`);
        continue;
      }
      try {
        const table = readReport(await f.text());
        const kind = detectKind(table);
        if (kind !== "settlement") {
          problems.push(
            kind === "unknown"
              ? `${f.name} does not look like a settlement report. We need the flat file V2 settlement report, which has columns such as settlement-id, amount-type and amount-description.`
              : `${f.name} looks like the ${REPORT_NAMES[kind]}, not a settlement report.`,
          );
          continue;
        }
        next.push({ name: f.name, table });
      } catch {
        problems.push(
          `We could not read ${f.name}. It needs to be the .txt or .csv file Amazon gives you.`,
        );
      }
    }
    setError(problems.join(" "));
    setFiles((prev) => [...prev, ...next]);
  }

  const result = useMemo(() => summariseSettlements(files.map((f) => f.table)), [files]);
  const { settlements } = result;
  const unbalanced = settlements.filter((s) => s.difference !== null && s.difference !== 0);

  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-dashed p-6 text-center">
        <FileUp className="mx-auto size-8 text-brand" aria-hidden="true" />
        <label className="mt-2 block cursor-pointer font-medium focus-within:underline">
          Choose your settlement report files (.txt or .csv)
          <input
            type="file"
            accept=".txt,.csv,.tsv,text/plain,text/csv,text/tab-separated-values"
            multiple
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
          />
        </label>
        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="size-3" aria-hidden="true" /> Read in your browser only. Your files never
          leave your device.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {files.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Files:</span>
          {files.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="inline-flex items-center gap-1 rounded border px-2 py-1"
            >
              {f.name}
              <button
                type="button"
                className="text-muted-foreground underline hover:text-foreground"
                onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                aria-label={`Remove ${f.name}`}
              >
                remove
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div aria-live="polite" className="space-y-8">
        {files.length ? (
          <section className="rounded-xl border bg-card p-4 text-sm">
            <h2 className="font-semibold">Columns we used</h2>
            <p className="mt-1 text-muted-foreground">
              Found: {result.found.join(", ") || "none"}.
            </p>
            {result.missing.length ? (
              <p className="mt-1 text-destructive">
                Missing: {result.missing.join(", ")}. Without these we cannot summarise the file.
                Check it is the flat file V2 settlement report.
              </p>
            ) : null}
          </section>
        ) : null}

        {unbalanced.length ? (
          <p
            role="alert"
            className="flex gap-2 rounded-lg border border-destructive p-3 text-sm text-destructive"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            {unbalanced.length === 1
              ? "One settlement does"
              : `${unbalanced.length} settlements do`}{" "}
            not add up to the total in the file. Check you uploaded the whole report, not part of
            it.
          </p>
        ) : null}

        {settlements.map((s) => (
          <section
            key={s.id}
            aria-labelledby={`s-${s.id}`}
            className="rounded-xl border bg-card p-4"
          >
            <h2 id={`s-${s.id}`} className="font-semibold">
              Settlement {s.id}
            </h2>
            <p className="text-sm text-muted-foreground">
              {s.start || s.end
                ? `${formatDate(s.start)} to ${formatDate(s.end)}`
                : "Dates not in the file"}
              {s.deposit ? `, paid ${formatDate(s.deposit)}` : ""}
              {s.currency ? `, ${s.currency}` : ""}. {s.lineCount} lines.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">Settlement {s.id} grouped</caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-1.5 font-medium">
                      Group
                    </th>
                    <th scope="col" className="py-1.5 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {SETTLEMENT_CATEGORIES.filter((c) => s.totals[c.id] !== 0).map((c) => (
                    <tr key={c.id}>
                      <th scope="row" className="py-1.5 text-left font-normal">
                        {c.label}
                      </th>
                      <td
                        className={`py-1.5 text-right tabular-nums ${s.totals[c.id] < 0 ? "text-destructive" : ""}`}
                      >
                        {money(s.totals[c.id], s.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <th scope="row" className="py-1.5 text-left">
                      Total of the lines
                    </th>
                    <td className="py-1.5 text-right tabular-nums">
                      {money(s.sumOfLines, s.currency)}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-1.5 text-left font-normal">
                      Settlement total in the file
                    </th>
                    <td className="py-1.5 text-right tabular-nums">
                      {s.total === null ? "Not found" : money(s.total, s.currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {s.difference === 0 ? (
              <p className="mt-2 flex items-center gap-1 text-sm text-success">
                <CheckCircle2 className="size-4" aria-hidden="true" /> The lines add up to the
                settlement total.
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
                <AlertTriangle className="size-4" aria-hidden="true" />
                {s.difference === null
                  ? "The totals row is missing, so we could not check this settlement."
                  : `The lines are ${money(Math.abs(s.difference), s.currency)} ${s.difference > 0 ? "more" : "less"} than the settlement total.`}
              </p>
            )}
            {s.totals.other !== 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">
                Some lines did not fit a group and are under Other. Open the breakdown to see what
                they are.
              </p>
            ) : null}
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">Breakdown by line type</summary>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left">
                      <th scope="col" className="py-1 pr-2 font-medium">
                        Group
                      </th>
                      <th scope="col" className="py-1 pr-2 font-medium">
                        transaction-type
                      </th>
                      <th scope="col" className="py-1 pr-2 font-medium">
                        amount-type
                      </th>
                      <th scope="col" className="py-1 pr-2 font-medium">
                        amount-description
                      </th>
                      <th scope="col" className="py-1 pr-2 text-right font-medium">
                        Lines
                      </th>
                      <th scope="col" className="py-1 text-right font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {s.details.map((d) => (
                      <tr
                        key={`${d.category}|${d.transactionType}|${d.amountType}|${d.amountDescription}`}
                      >
                        <td className="py-1 pr-2">
                          {SETTLEMENT_CATEGORIES.find((c) => c.id === d.category)?.label}
                        </td>
                        <td className="py-1 pr-2">{d.transactionType}</td>
                        <td className="py-1 pr-2">{d.amountType}</td>
                        <td className="py-1 pr-2">{d.amountDescription}</td>
                        <td className="py-1 pr-2 text-right tabular-nums">{d.count}</td>
                        <td className="py-1 text-right tabular-nums">
                          {money(d.amount, s.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </section>
        ))}
      </div>

      {settlements.length ? (
        <section aria-labelledby="downloads" className="space-y-4">
          <h2 id="downloads" className="text-xl font-semibold">
            Download for your bookkeeping
          </h2>
          <p className="text-sm text-muted-foreground">
            The journal has one line per group for each settlement, dated on the day Amazon paid
            you, then a payout line that takes the total back off so each settlement adds up to
            zero. Positive amounts are money to you. Rename the accounts to match your own chart of
            accounts before you download.
          </p>
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Account names</legend>
            {SETTLEMENT_CATEGORIES.map((c) => (
              <div key={c.id} className="space-y-1">
                <Label htmlFor={`acc-${c.id}`} className="text-xs">
                  {c.label}
                </Label>
                <Input
                  id={`acc-${c.id}`}
                  value={accounts[c.id]}
                  onChange={(e) => setAccounts((a) => ({ ...a, [c.id]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1">
              <Label htmlFor="acc-payout" className="text-xs">
                Payout to your bank
              </Label>
              <Input id="acc-payout" value={payout} onChange={(e) => setPayout(e.target.value)} />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                save("amazon-settlement-summary.csv", settlementSummaryCsv(settlements))
              }
            >
              <Download aria-hidden="true" /> Summary (CSV)
            </Button>
            <Button
              type="button"
              onClick={() =>
                save(
                  "amazon-settlement-journal.csv",
                  settlementJournalCsv(settlements, accounts, payout || "Bank"),
                )
              }
            >
              <Download aria-hidden="true" /> Journal (CSV)
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAccounts(defaultAccounts())}>
              Reset account names
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

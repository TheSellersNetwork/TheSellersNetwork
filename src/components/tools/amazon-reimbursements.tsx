"use client";

import { useMemo, useState } from "react";
import { Download, FileUp, Lock } from "lucide-react";
import {
  checkReimbursements,
  detectKind,
  FLAG_LABELS,
  flagsCsv,
  formatDate,
  readReport,
  REPORT_NAMES,
  STATUS_LABELS,
  type CheckInput,
  type DateOrder,
  type ReportKind,
  type Table,
} from "@/lib/tools/amazon-reports";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const select = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const USABLE: ReportKind[] = [
  "ledger",
  "adjustments",
  "reimbursements",
  "returns",
  "settlement",
  "transactions",
];

type Loaded = { name: string; table: Table; kind: ReportKind };

function save(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const todayUtc = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
};

export function AmazonReimbursements() {
  const [files, setFiles] = useState<Loaded[]>([]);
  const [error, setError] = useState("");
  const [dateOrder, setDateOrder] = useState<DateOrder>("dmy");
  const [today] = useState(todayUtc);

  async function onFiles(list: FileList | null) {
    setError("");
    if (!list) return;
    const next: Loaded[] = [];
    const problems: string[] = [];
    for (const f of Array.from(list).slice(0, 20)) {
      if (f.size > 50 * 1024 * 1024) {
        problems.push(`${f.name} is over 50 MB. Download a shorter date range.`);
        continue;
      }
      try {
        const table = readReport(await f.text());
        if (!table.rows.length) throw new Error("empty");
        next.push({ name: f.name, table, kind: detectKind(table) });
      } catch {
        problems.push(
          `We could not read ${f.name}. It needs to be the .txt or .csv file Amazon gives you.`,
        );
      }
    }
    setError(problems.join(" "));
    setFiles((prev) => [...prev, ...next]);
  }

  const result = useMemo(() => {
    if (!files.length) return null;
    const pick = (...kinds: ReportKind[]) =>
      files.filter((f) => kinds.includes(f.kind)).map((f) => f.table);
    const input: CheckInput = {
      ledger: pick("ledger", "adjustments"),
      reimbursements: pick("reimbursements"),
      returns: pick("returns"),
      settlements: pick("settlement"),
      transactions: pick("transactions"),
    };
    return checkReimbursements(input, { today, dateOrder });
  }, [files, today, dateOrder]);

  const claimable = result?.flags.filter((f) => f.status === "claim-now") ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-xl border-2 border-dashed p-6 text-center">
        <FileUp className="mx-auto size-8 text-brand" aria-hidden="true" />
        <label className="mt-2 block cursor-pointer font-medium focus-within:underline">
          Choose your Amazon reports (.txt or .csv, several at once is fine)
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
        <section aria-labelledby="files" className="rounded-xl border bg-card p-4">
          <h2 id="files" className="font-semibold">
            Your files
          </h2>
          <p className="text-sm text-muted-foreground">
            We worked out which report each file is from its column names. Change it if we got it
            wrong.
          </p>
          <ul className="mt-3 space-y-3">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="grid items-end gap-2 sm:grid-cols-[1fr_260px_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.table.rows.length} rows</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`kind-${i}`} className="text-xs">
                    Report
                  </Label>
                  <select
                    id={`kind-${i}`}
                    className={select}
                    value={f.kind}
                    onChange={(e) =>
                      setFiles((fs) =>
                        fs.map((x, j) =>
                          j === i ? { ...x, kind: e.target.value as ReportKind } : x,
                        ),
                      )
                    }
                  >
                    {[...USABLE, "unknown" as const].map((k) => (
                      <option key={k} value={k}>
                        {k === "unknown" ? "Not recognised (ignore)" : REPORT_NAMES[k]}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                  aria-label={`Remove ${f.name}`}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div aria-live="polite" className="space-y-6">
        {result ? (
          <>
            {result.ambiguousDates ? (
              <div className="max-w-sm space-y-1 rounded-lg border p-3">
                <Label htmlFor="date-order">
                  Your files have dates like 03/04/2026. Which way round are they?
                </Label>
                <select
                  id="date-order"
                  className={select}
                  value={dateOrder}
                  onChange={(e) => setDateOrder(e.target.value as DateOrder)}
                >
                  <option value="dmy">Day first (3 April)</option>
                  <option value="mdy">Month first (4 March)</option>
                </select>
              </div>
            ) : null}
            {result.notes.length ? (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {result.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm text-muted-foreground">
              Checked {result.counts.lostOrDamagedEvents} lost or damaged events,{" "}
              {result.counts.refunds} refunded order lines, {result.counts.returns} returns and{" "}
              {result.counts.reimbursements} reimbursements.
            </p>
            <h2 className="text-xl font-semibold">
              {result.flags.length
                ? `${result.flags.length} possible ${result.flags.length === 1 ? "claim" : "claims"}, ${claimable.length} you can raise now`
                : "Nothing to flag in these files"}
            </h2>
          </>
        ) : null}
      </div>

      {result && result.flags.length ? (
        <section className="space-y-3">
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <caption className="sr-only">Possible claims, soonest deadline first</caption>
              <thead className="bg-muted/50">
                <tr className="text-left">
                  {[
                    "Claim by",
                    "Status",
                    "What",
                    "Date",
                    "SKU / FNSKU / ASIN",
                    "Order or reference",
                    "Qty",
                    "Reason",
                  ].map((h) => (
                    <th key={h} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.flags.map((f, i) => (
                  <tr
                    key={i}
                    className={cn(f.status === "deadline-passed" && "text-muted-foreground")}
                  >
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatDate(f.deadline)}
                      {f.status === "claim-now" ? (
                        <span className="block text-xs">{f.daysLeft} days left</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs whitespace-nowrap",
                          f.status === "claim-now" ? "bg-brand-soft text-foreground" : "border",
                        )}
                      >
                        {STATUS_LABELS[f.status]}
                      </span>
                      {f.status === "too-early" ? (
                        <span className="block text-xs">from {formatDate(f.claimFrom)}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{FLAG_LABELS[f.kind]}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatDate(f.date)}
                    </td>
                    <td className="px-3 py-2">
                      <span className="block">{f.sku || "No SKU"}</span>
                      <span className="block text-xs text-muted-foreground">
                        {[f.fnsku, f.asin].filter(Boolean).join(" / ")}
                      </span>
                      {f.title ? (
                        <span className="block max-w-56 truncate text-xs text-muted-foreground">
                          {f.title}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-xs break-all">{f.orderId || f.reference}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.quantity}</td>
                    <td className="px-3 py-2 text-xs">{f.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => save("amazon-possible-claims.csv", flagsCsv(result.flags))}
          >
            <Download aria-hidden="true" /> Download this list (CSV)
          </Button>
        </section>
      ) : null}
    </div>
  );
}

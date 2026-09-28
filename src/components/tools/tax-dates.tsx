"use client";

import { useSyncExternalStore } from "react";
import { CalendarClock } from "lucide-react";
import { daysUntil, TAX_CHECKED, taxLinks, upcomingTaxDates } from "@/lib/tools/tax";
import { cn } from "@/lib/utils";

// Today changes at most once a day; re-reading on each render is enough.
const subscribe = () => () => {};
const todayKey = () => new Date().toISOString().slice(0, 10);

/*
  Next UK tax dates for sellers. Rendered on the client so the countdown is
  always today's, even on pages built ahead of time.
*/
export function TaxDates({ count = 5, compact = false, className }: { count?: number; compact?: boolean; className?: string }) {
  const key = useSyncExternalStore(subscribe, todayKey, () => null);
  const today = key ? new Date(`${key}T00:00:00Z`) : null;
  const dates = today ? upcomingTaxDates(today, count, !compact) : [];

  return (
    <section aria-labelledby="tax-dates-heading" className={cn("not-prose forum-card rounded-xl border bg-card p-4", className)}>
      <h2 id="tax-dates-heading" className="flex items-center gap-2 font-semibold">
        <CalendarClock className="size-4 text-brand" aria-hidden="true" /> Coming up: tax dates
      </h2>
      {today ? (
        <ol className="mt-3 space-y-3">
          {dates.map((t) => {
            const days = daysUntil(t.date, today);
            return (
              <li key={`${t.title}-${t.date.toISOString()}`} className="flex gap-3">
                <div className="w-14 shrink-0 rounded-md bg-secondary py-1 text-center leading-tight">
                  <div className="text-lg font-semibold tabular-nums">{t.date.getUTCDate()}</div>
                  <div className="text-xs uppercase text-muted-foreground">{t.date.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</div>
                </div>
                <div className="min-w-0 text-sm">
                  <p className="font-medium">
                    <a href={t.url} target="_blank" rel="noopener" className="hover:underline">
                      {t.title}
                    </a>
                  </p>
                  {compact ? null : <p className="text-muted-foreground">{t.detail}</p>}
                  <p className={cn("text-xs", days <= 30 ? "text-destructive" : "text-muted-foreground")}>
                    {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`} · {t.date.getUTCFullYear()}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Loading dates.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        From{" "}
        <a href={taxLinks.deadlines} target="_blank" rel="noopener" className="underline">
          GOV.UK
        </a>
        , checked {TAX_CHECKED}. Not tax advice.
      </p>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { deleteCalculation, renameCalculation } from "@/app/account/calculations/actions";
import { gbp, type Outcome } from "./model";

export type SavedView = { id: string; name: string; platform: string; href: string; created: string; now: Outcome; saved: Outcome | null };

const pct = (n: number | null) => (n === null ? "" : `${n.toLocaleString("en-GB", { maximumFractionDigits: 1 })}%`);

/* One saved calculation: today's result, the saved one if fees changed, and open, rename and delete. */
export function SavedCalculationRow({ item }: { item: SavedView }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const renameButton = useRef<HTMLButtonElement>(null);
  const field = `rename-${item.id}`;

  function rename(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await renameCalculation(item.id, name);
      if (r.ok) {
        setRenaming(false);
        setError(null);
        requestAnimationFrame(() => renameButton.current?.focus());
      } else setError(r.message);
    });
  }

  function remove() {
    start(async () => {
      const r = await deleteCalculation(item.id);
      if (!r.ok) setError(r.message);
    });
  }

  const { now, saved } = item;
  return (
    <li className="rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {renaming ? (
          <form onSubmit={rename} className="flex w-full flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Label htmlFor={field}>Name</Label>
              <Input id={field} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
            </div>
            <Button type="submit" size="sm" disabled={pending} className="min-h-11 sm:min-h-8">
              Save name
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="min-h-11 sm:min-h-8"
              onClick={() => {
                setRenaming(false);
                setName(item.name);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <h2 className="font-semibold">{item.name}</h2>
        )}
        {renaming ? null : (
          <p className="text-xs text-muted-foreground">
            {item.platform}, saved {item.created}
          </p>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {[
          ["Fees", gbp(now.fees)],
          ["You receive", gbp(now.youReceive)],
          ["Profit", gbp(now.profit)],
          ["Margin", pct(now.margin)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md bg-secondary p-2">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className={cn("font-semibold tabular-nums", label === "Profit" && (now.profit < 0 ? "text-destructive" : "text-success"))}>{value}</dd>
          </div>
        ))}
      </dl>
      {now.best ? <p className="mt-2 text-xs text-muted-foreground">Best platform today: {now.best}</p> : null}
      {saved ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Fees have changed since you saved this. Then: fees {gbp(saved.fees)}, profit {gbp(saved.profit)}
          {saved.best && saved.best !== now.best ? `, best on ${saved.best}` : ""}.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className="min-h-11 sm:min-h-8">
          <Link href={item.href}>Open</Link>
        </Button>
        {renaming ? null : (
          <Button ref={renameButton} type="button" size="sm" variant="ghost" className="min-h-11 sm:min-h-8" onClick={() => setRenaming(true)}>
            Rename
          </Button>
        )}
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Confirm delete">
            Delete this calculation?
            <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={remove} className="min-h-11 sm:min-h-8">
              Delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)} className="min-h-11 sm:min-h-8">
              Keep it
            </Button>
          </span>
        ) : (
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(true)} className="min-h-11 text-muted-foreground sm:min-h-8">
            Delete
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </li>
  );
}

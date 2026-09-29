"use client";

import Link from "next/link";
import Form from "next/form";
import { useRef } from "react";
import { Check, X } from "lucide-react";
import { pickupCategories, pickupSources } from "@/lib/pickups";
import { cn } from "@/lib/utils";

export type PickupFilterState = { category?: string; source?: string; sold?: string; brand?: string };

const BASE = "/community/pickups";

function pickupsHref(sp: PickupFilterState, change: PickupFilterState = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...change })) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${BASE}?${s}` : BASE;
}

const chip =
  "inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:min-h-8";

/*
  Filters for the pickups wall. Stays under the site header while scrolling.
  Sold only and the source are one tap each (a row that scrolls sideways on a
  phone); category and brand sit in a small form that works without
  JavaScript and applies itself when the category changes.
*/
export function PickupFilters({ sp }: { sp: PickupFilterState }) {
  const form = useRef<HTMLFormElement>(null);
  const active = [sp.category, sp.source, sp.sold, sp.brand].filter(Boolean).length;

  return (
    <div className="sticky top-[var(--header-height)] z-20 -mx-4 mt-6 border-b bg-background px-4 py-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <nav aria-label="Filter pickups by source" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ul className="flex gap-1.5 pb-1">
          <li>
            <Link
              href={pickupsHref(sp, { sold: sp.sold ? undefined : "1" })}
              scroll={false}
              aria-current={sp.sold ? "page" : undefined}
              className={cn(chip, sp.sold ? "border-success bg-success/10 text-success" : "hover:bg-secondary")}
            >
              {sp.sold ? <Check className="size-3.5" aria-hidden="true" /> : null}
              Sold only
            </Link>
          </li>
          {Object.entries(pickupSources).map(([id, label]) => {
            const on = sp.source === id;
            return (
              <li key={id}>
                <Link href={pickupsHref(sp, { source: on ? undefined : id })} scroll={false} aria-current={on ? "page" : undefined} className={cn(chip, on ? "border-brand bg-brand-soft text-foreground" : "hover:bg-secondary")}>
                  {on ? <Check className="size-3.5" aria-hidden="true" /> : null}
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Form key={`${sp.category}|${sp.brand}|${sp.source}|${sp.sold}`} ref={form} action={BASE} scroll={false} className="mt-1.5 flex flex-wrap items-center gap-2" aria-label="Filter pickups by category and brand">
        {sp.source ? <input type="hidden" name="source" value={sp.source} /> : null}
        {sp.sold ? <input type="hidden" name="sold" value="1" /> : null}
        <label className="sr-only" htmlFor="pickup-category">
          Category
        </label>
        <select
          id="pickup-category"
          name="category"
          defaultValue={sp.category ?? ""}
          onChange={() => form.current?.requestSubmit()}
          className="h-11 min-w-0 flex-1 rounded-md border bg-card px-2 text-sm sm:h-8 sm:flex-none"
        >
          <option value="">All categories</option>
          {Object.entries(pickupCategories).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="pickup-brand">
          Brand
        </label>
        <input
          id="pickup-brand"
          name="brand"
          type="search"
          defaultValue={sp.brand ?? ""}
          placeholder="Brand"
          maxLength={60}
          autoComplete="off"
          className="h-11 w-32 min-w-0 flex-1 rounded-md border bg-card px-2 text-sm sm:h-8 sm:w-40 sm:flex-none"
        />
        <button type="submit" className="h-11 rounded-md border px-3 text-sm font-medium hover:bg-secondary sm:h-8">
          Apply
        </button>
        {active > 0 ? (
          <Link href={BASE} scroll={false} className="inline-flex h-11 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground hover:text-foreground hover:underline sm:h-8">
            <X className="size-3.5" aria-hidden="true" />
            Clear {active === 1 ? "filter" : `${active} filters`}
          </Link>
        ) : null}
      </Form>
    </div>
  );
}

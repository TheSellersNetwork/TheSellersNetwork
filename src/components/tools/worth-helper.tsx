"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchPhrase, worthCategories, worthLinks, type WorthCategory, type WorthCondition } from "@/lib/tools/worth-links";
import { cn } from "@/lib/utils";

/* "What's it worth?": builds search links to sold and asking prices. Nothing is fetched here. */

const selectCls = "h-9 w-full rounded-md border bg-background px-2 text-sm";

const kindLabel = { sold: "Sold prices", asking: "Asking prices", guide: "Price guide" } as const;

export function WorthHelper() {
  const [brand, setBrand] = useState("");
  const [item, setItem] = useState("");
  const [size, setSize] = useState("");
  const [condition, setCondition] = useState<WorthCondition>("any");
  const [category, setCategory] = useState<WorthCategory>("general");
  const input = { brand, item, size, condition, category };
  const phrase = searchPhrase(input);
  const links = worthLinks(input);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="wi-brand">Brand or maker</Label>
          <Input id="wi-brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Barbour" autoComplete="off" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wi-item">Item</Label>
          <Input id="wi-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Bedale wax jacket" autoComplete="off" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="wi-size">Size, model or edition (optional)</Label>
          <Input id="wi-size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="40" autoComplete="off" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="wi-condition">Condition</Label>
            <select id="wi-condition" value={condition} onChange={(e) => setCondition(e.target.value as WorthCondition)} className={selectCls}>
              <option value="any">Any</option>
              <option value="used">Used</option>
              <option value="new">New</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="wi-category">Kind of item</Label>
            <select id="wi-category" value={category} onChange={(e) => setCategory(e.target.value as WorthCategory)} className={selectCls}>
              {worthCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <section aria-live="polite" aria-labelledby="wi-results" className="space-y-3">
        <h2 id="wi-results" className="text-lg font-semibold">
          {phrase ? <>Where to look for &ldquo;{phrase}&rdquo;</> : "Where to look"}
        </h2>
        {!phrase ? (
          <p className="text-sm text-muted-foreground">Type a brand or an item and the search links appear here. Condition only narrows the eBay search.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {links.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                <div className="min-w-0">
                  <p className="font-medium">
                    {l.site}
                    <span className={cn("ml-2 rounded-full px-2 py-0.5 text-xs font-normal", l.kind === "sold" ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground")}>{l.paid ? "Paid subscription" : kindLabel[l.kind]}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{l.note}</p>
                </div>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start rounded-md border px-3 text-sm font-medium hover:border-brand/60 sm:min-h-9"
                >
                  {l.label} on {l.site}
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        )}
        {category === "books" && phrase ? (
          <p className="text-sm text-muted-foreground">
            For books, the ISBN on the back is more exact than the title. Check it in the{" "}
            <Link href="/tools/pricing?tab=books" className="underline">
              books tab
            </Link>{" "}
            and search eBay with the ISBN.
          </p>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border bg-card p-4 text-sm">
        <h2 className="font-semibold">Then work out a price</h2>
        <p className="text-muted-foreground">
          Copy the sold prices that match yours and paste them into{" "}
          <Link href="/tools/pricing?tab=comps" className="underline">
            what to list at
          </Link>
          . It gives the typical price and the range, and what you would keep after fees.
        </p>
        <p className="text-muted-foreground">These are only links: we do not look anything up or collect prices, and the sites may change how their searches work.</p>
      </section>
    </div>
  );
}

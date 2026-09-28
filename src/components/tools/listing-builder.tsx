"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/*
  Builds a listing title in the order buyers search (brand, item, model,
  key detail, size, colour) and a plain description template. No AI and no
  keyword data: it only arranges what the seller types. eBay titles are
  limited to 80 characters (eBay help: "Writing a good title").
*/

const conditions = ["New with tags", "New without tags", "Excellent used condition", "Very good used condition", "Good used condition", "Well worn", "For parts or not working"];

const fields = [
  ["brand", "Brand", "Barbour"],
  ["item", "What it is", "Wax jacket"],
  ["model", "Model or style", "Bedale"],
  ["detail", "Key detail", "Tartan lining"],
  ["size", "Size", "Size L"],
  ["colour", "Colour", "Olive"],
  ["material", "Material", "Waxed cotton"],
  ["extra", "Other words buyers search", "Country, vintage"],
] as const;

type Key = (typeof fields)[number][0];

export function ListingBuilder() {
  const [v, setV] = useState<Record<Key, string>>({ brand: "", item: "", model: "", detail: "", size: "", colour: "", material: "", extra: "" });
  const [condition, setCondition] = useState(conditions[4]);
  const [flaws, setFlaws] = useState("");
  const [measure, setMeasure] = useState({ pit: "", length: "", sleeve: "", waist: "", inseam: "" });

  const title = useMemo(() => {
    const words: string[] = [];
    const seen = new Set<string>();
    for (const k of ["brand", "item", "model", "detail", "material", "size", "colour", "extra"] as Key[]) {
      for (const w of v[k].split(/[,\s]+/).filter(Boolean)) {
        if (!seen.has(w.toLowerCase())) {
          seen.add(w.toLowerCase());
          words.push(w);
        }
      }
    }
    return words.join(" ");
  }, [v]);

  const measurements = Object.entries(measure)
    .filter(([, x]) => x.trim())
    .map(([k, x]) => `${{ pit: "Pit to pit", length: "Length", sleeve: "Sleeve", waist: "Waist", inseam: "Inside leg" }[k]}: ${x.trim()}${/cm|in|"/i.test(x) ? "" : " cm"}`);

  const description = [
    [v.brand, v.model, v.item].filter(Boolean).join(" ") || "Item",
    "",
    `Condition: ${condition}.${flaws.trim() ? ` ${flaws.trim()}` : " No marks or flaws that we can see; please check the photos."}`,
    v.size ? `Size: ${v.size}` : "",
    v.colour ? `Colour: ${v.colour}` : "",
    v.material ? `Material: ${v.material}` : "",
    measurements.length ? `\nMeasurements, taken flat:\n${measurements.join("\n")}` : "",
    "\nFrom a smoke-free home. Posted within one working day.",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast("Copied.");
  };

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map(([k, label, ph]) => (
            <div key={k} className="space-y-1">
              <Label htmlFor={`lb-${k}`}>{label}</Label>
              <Input id={`lb-${k}`} value={v[k]} placeholder={ph} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="lb-condition">Condition</Label>
          <select id="lb-condition" value={condition} onChange={(e) => setCondition(e.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-sm">
            {conditions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="lb-flaws">Flaws, honestly (optional)</Label>
          <Input id="lb-flaws" value={flaws} placeholder="Small mark on left cuff, see photo 6" onChange={(e) => setFlaws(e.target.value)} />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Measurements (clothing, optional)</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {Object.keys(measure).map((k) => (
              <Input key={k} aria-label={k} placeholder={{ pit: "Pit to pit", length: "Length", sleeve: "Sleeve", waist: "Waist", inseam: "Inside leg" }[k]} value={measure[k as keyof typeof measure]} onChange={(e) => setMeasure({ ...measure, [k]: e.target.value })} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            How to measure: see{" "}
            <Link href="/guides/measuring-clothes-for-listings" className="underline">
              measuring clothes for listings
            </Link>
            .
          </p>
        </fieldset>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Title</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(title)} disabled={!title}>
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <p className="mt-2 min-h-6 break-words font-medium">{title || <span className="text-muted-foreground">Fill in the boxes on the left.</span>}</p>
          <p className={cn("mt-2 text-xs", title.length > 80 ? "text-destructive" : "text-muted-foreground")}>
            {title.length} characters. eBay allows up to 80{title.length > 80 ? ": trim the least important words at the end." : "."}
          </p>
        </section>
        <section className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Description</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(description)}>
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">{description}</pre>
        </section>
        <p className="text-xs text-muted-foreground">
          Only describe what is true of the item: brand names you use must be genuine, and condition must match the photos. See{" "}
          <Link href="/guides/ebay-titles-item-specifics-and-search" className="underline">
            titles and item specifics
          </Link>{" "}
          and{" "}
          <Link href="/guides/descriptions-that-sell" className="underline">
            descriptions that sell
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

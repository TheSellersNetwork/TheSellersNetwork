"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Copy, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { countHashtags, depopDescription, depopHashtags, etsyTags, etsyTitle, limits, limitSources, titleWords, trimToWords } from "@/lib/tools/listing-copy";

/*
  Builds a listing title in the order buyers search (brand, item, model,
  key detail, size, colour), a plain description template, and a copy pack
  for eBay, Vinted, Depop and Etsy. No AI and no keyword data: it only
  arranges what the seller types. Limits and their sources live in
  src/lib/tools/listing-copy.ts. Nothing is posted anywhere.
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

  const words = useMemo(() => titleWords(v), [v]);
  const title = words.join(" ");
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
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied.");
    } catch {
      toast("Could not copy. Select the text and copy it yourself.");
    }
  };

  const ebay = trimToWords(words, limits.ebayTitle);
  const vinted = trimToWords(words, limits.vintedTitle);
  const etsy = etsyTitle(words);
  const tags = etsyTags(v);
  const hashtags = depopHashtags(v);
  const depop = depopDescription(title, description, hashtags);

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
            <h2 className="font-semibold">Title, every word</h2>
            <Button type="button" variant="ghost" size="sm" onClick={() => copy(title)} disabled={!title}>
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <p className="mt-2 min-h-6 break-words font-medium">{title || <span className="text-muted-foreground">Fill in the boxes on the left.</span>}</p>
          <p className="mt-2 text-xs text-muted-foreground">{title.length} characters. Each platform&rsquo;s version below drops whole words from the end until it fits.</p>
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
        <section aria-labelledby="lb-pack" className="space-y-4">
          <div>
            <h2 id="lb-pack" className="text-lg font-semibold">Copy pack for each platform</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing here posts for you. Copying and pasting it yourself keeps you within each platform&rsquo;s rules, unlike crosslisting apps that post through your account. You can edit any box before you copy it.
            </p>
          </div>

          <PlatformCard name="eBay" source={limitSources.ebay}>
            <CopyField id="lb-ebay-title" label="Title" generated={ebay.text} max={limits.ebayTitle} dropped={ebay.dropped} onCopy={copy} />
          </PlatformCard>

          <PlatformCard name="Vinted" source={limitSources.vinted}>
            <CopyField id="lb-vinted-title" label="Title" generated={vinted.text} max={limits.vintedTitle} dropped={vinted.dropped} onCopy={copy} />
            <CopyField id="lb-vinted-desc" label="Description" generated={description} max={limits.vintedDescription} rows={8} onCopy={copy} />
            <p className="text-xs text-muted-foreground">Vinted&rsquo;s limits are from its own documentation for Vinted Pro listings; the app may allow a little more or less.</p>
          </PlatformCard>

          <PlatformCard name="Depop" source={limitSources.depop}>
            <CopyField id="lb-depop-desc" label="Description with hashtags" generated={depop} rows={10} onCopy={copy} extraCount={hashtagCount} />
            <p className="text-xs text-muted-foreground">
              Depop allows up to {limits.depopHashtags} hashtags. They are made from the words you typed, so only keep ones that are true of the item. Depop does not publish a description length, so this only counts.
            </p>
          </PlatformCard>

          <PlatformCard name="Etsy" source={limitSources.etsy}>
            <CopyField id="lb-etsy-title" label="Title" generated={etsy.text} max={limits.etsyTitle} dropped={etsy.dropped} onCopy={copy} />
            <div>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium">
                  Tags{" "}
                  <span className="font-normal text-muted-foreground">
                    ({tags.length} of {limits.etsyTags}, up to {limits.etsyTagLength} characters each)
                  </span>
                </h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => copy(tags.join(", "))} disabled={!tags.length} aria-label="Copy Etsy tags">
                  <Copy className="size-4" aria-hidden="true" /> Copy
                </Button>
              </div>
              {tags.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <li key={t} className="rounded-full border bg-background px-2.5 py-0.5 text-xs">
                      {t} <span className="text-muted-foreground">{t.length}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">Fill in the boxes on the left.</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Built only from the phrases you typed; a phrase over {limits.etsyTagLength} characters is split into single words. Copies as a list separated by commas. Etsy only allows vintage (20 years or older) and craft supplies for resold items.
              </p>
            </div>
          </PlatformCard>
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

const hashtagCount = (text: string) => {
  const n = countHashtags(text);
  return { text: `${n} of ${limits.depopHashtags} hashtags`, over: n > limits.depopHashtags };
};

function PlatformCard({ name, source, children }: { name: string; source: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4" aria-label={name}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        <a href={source} target="_blank" rel="noopener" className="text-xs text-muted-foreground underline">
          {name}&rsquo;s rules
        </a>
      </div>
      {children}
    </section>
  );
}

/* An editable output box that follows the form until the seller edits it, with a live counter. */
function CopyField({
  id,
  label,
  generated,
  max,
  rows = 2,
  dropped,
  onCopy,
  extraCount,
}: {
  id: string;
  label: string;
  generated: string;
  max?: number;
  rows?: number;
  dropped?: string[];
  onCopy: (text: string) => void;
  extraCount?: (text: string) => { text: string; over: boolean };
}) {
  const [edited, setEdited] = useState<string | null>(null);
  const value = edited ?? generated;
  const over = max !== undefined && value.length > max;
  const extra = extraCount?.(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <div className="flex items-center">
          {edited !== null ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setEdited(null)}>
              <RotateCcw className="size-4" aria-hidden="true" /> Reset
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => onCopy(value)} disabled={!value} aria-label={`Copy ${label.toLowerCase()}`}>
            <Copy className="size-4" aria-hidden="true" /> Copy
          </Button>
        </div>
      </div>
      <Textarea id={id} rows={rows} value={value} onChange={(e) => setEdited(e.target.value)} aria-describedby={`${id}-count`} className="mt-1 text-sm" />
      <p id={`${id}-count`} aria-live="polite" className={cn("mt-1 text-xs", over || extra?.over ? "text-destructive" : "text-muted-foreground")}>
        {max !== undefined ? `${value.length} of ${max} characters` : `${value.length} characters`}
        {over ? ": over the limit, shorten it before you paste" : ""}
        {extra ? `. ${extra.text}${extra.over ? ": remove some before you paste" : ""}` : ""}
        {edited === null && dropped?.length ? `. Left out to fit: ${dropped.join(" ")}` : ""}.
      </p>
    </div>
  );
}

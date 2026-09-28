"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkParcel, checkTube, formatKg, TUBE_RULE, type Carrier, type Fit } from "@/lib/tools/parcels";
import { cn } from "@/lib/utils";

const carriers: Carrier[] = ["Royal Mail", "Evri", "Parcelforce"];

function num(v: string): number | null {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function ParcelChecker() {
  const [shape, setShape] = useState<"box" | "tube">("box");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [depth, setDepth] = useState("");
  const [weight, setWeight] = useState("");
  const [unit, setUnit] = useState<"g" | "kg">("g");

  const l = num(length);
  const w = num(width);
  const d = num(depth);
  const rawWeight = num(weight);
  const kg = rawWeight === null ? null : unit === "g" ? rawWeight / 1000 : rawWeight;

  const results = useMemo(() => (l && w && d && kg ? checkParcel([l, w, d], kg) : null), [l, w, d, kg]);
  const tube = shape === "tube" && l && w ? checkTube(l, w) : null;

  return (
    <div className="space-y-6">
      <fieldset className="forum-card rounded-xl border bg-card p-4 sm:p-5">
        <legend className="sr-only">Your parcel</legend>
        <div className="mb-4 inline-flex rounded-md border p-0.5 text-sm" role="radiogroup" aria-label="Shape">
          {(["box", "tube"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={shape === s}
              onClick={() => setShape(s)}
              className={cn("rounded px-3 py-1", shape === s ? "bg-brand text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {s === "box" ? "Box or bag" : "Tube or roll"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field id="length" label="Length (cm)" value={length} onChange={setLength} placeholder="30" />
          <Field id="width" label={shape === "tube" ? "Diameter (cm)" : "Width (cm)"} value={width} onChange={setWidth} placeholder="20" />
          {shape === "box" ? (
            <>
              <Field id="depth" label="Depth (cm)" value={depth} onChange={setDepth} placeholder="10" />
              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight</Label>
                <div className="flex gap-2">
                  <Input id="weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={unit === "g" ? "850" : "0.85"} />
                  <select aria-label="Weight unit" value={unit} onChange={(e) => setUnit(e.target.value as "g" | "kg")} className="h-9 rounded-md border bg-background px-2 text-sm">
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Measure the packed parcel, not the item. Weigh it with the packaging on. Any side can be the length; we try every way round.</p>
      </fieldset>

      {shape === "tube" ? (
        tube ? (
          <div className={cn("rounded-xl border p-4", tube.fits ? "border-success/60" : "border-destructive/60")} aria-live="polite">
            <p className="flex items-center gap-2 font-medium">
              {tube.fits ? <CheckCircle2 className="size-5 text-success" /> : <XCircle className="size-5 text-destructive" />}
              {tube.fits ? "This tube fits Royal Mail's tube rules." : "This tube is too big for Royal Mail's tube rules."}
            </p>
            {tube.reason ? <p className="mt-1 text-sm text-muted-foreground">{tube.reason}</p> : null}
            <p className="mt-2 text-sm text-muted-foreground">
              Tubes are priced by weight as a parcel. Rule: longest side up to {TUBE_RULE.maxLength} cm, and length plus twice the diameter up to {TUBE_RULE.maxLengthPlusTwoDiameters} cm.{" "}
              <a href={TUBE_RULE.url} target="_blank" rel="noopener" className="underline">
                Royal Mail size guide
              </a>
            </p>
          </div>
        ) : (
          <Empty />
        )
      ) : results ? (
        <div className="space-y-6" aria-live="polite">
          <p className="text-sm">
            {results.some((r) => r.fits) ? (
              <>
                <strong>{results.filter((r) => r.fits).length}</strong> of {results.length} services take this parcel ({formatKg(kg!)}). The first match in each list is usually the cheapest format, but check the price pages.
              </>
            ) : (
              "None of these services take this parcel. Try a courier that handles large or heavy items, or split it into two."
            )}
          </p>
          {carriers.map((carrier) => (
            <CarrierList key={carrier} carrier={carrier} results={results.filter((r) => r.service.carrier === carrier)} />
          ))}
        </div>
      ) : (
        <Empty />
      )}
    </div>
  );
}

function Field({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Empty() {
  return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Enter the size and weight to see which services take it.</p>;
}

function CarrierList({ carrier, results }: { carrier: Carrier; results: Fit[] }) {
  const firstFit = results.find((r) => r.fits)?.service.id;
  return (
    <section aria-labelledby={`carrier-${carrier}`}>
      <h2 id={`carrier-${carrier}`} className="mb-2 text-lg font-semibold">
        {carrier}
      </h2>
      <ul className="grid gap-2">
        {results.map(({ service, fits, reason }) => (
          <li
            key={service.id}
            className={cn("flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center", !fits && "opacity-60", service.id === firstFit && "border-brand")}
          >
            <div className="flex flex-1 items-start gap-2">
              {fits ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Fits" /> : <XCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Does not fit" />}
              <div>
                <p className="font-medium">
                  {service.format}
                  {service.id === firstFit ? <span className="ml-2 rounded bg-brand/15 px-1.5 py-0.5 text-xs text-brand">Smallest that fits</span> : null}
                </p>
                <p className="text-sm text-muted-foreground">{service.services}</p>
                {reason ? <p className="text-sm text-destructive">{reason}</p> : service.note ? <p className="text-xs text-muted-foreground">{service.note}</p> : null}
              </div>
            </div>
            <div className="flex gap-3 text-sm sm:shrink-0">
              <a href={service.priceUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
                Prices <ExternalLink className="size-3" aria-hidden="true" />
              </a>
              <a href={service.sizeUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-muted-foreground underline">
                Size rules <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

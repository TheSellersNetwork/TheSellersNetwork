"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/site";
import type { Flair } from "@/lib/db/types";

/*
  Per platform the member has ticked: the year they started and an optional
  short label. Saved as flair and shown next to their name. Fields for
  platforms that are not ticked are ignored on save.
*/
export function FlairEditor({ flair, marketplaces }: { flair: Flair[]; marketplaces: string[] }) {
  const year = new Date().getFullYear();
  const chosen = siteConfig.marketplaces.filter((m) => marketplaces.includes(m.id));
  if (chosen.length === 0) return <p className="text-sm text-muted-foreground">Tick where you sell above and you can add flair for each platform.</p>;
  return (
    <div className="space-y-3">
      {chosen.map((m) => {
        const f = flair.find((x) => x.platform === m.id);
        return (
          <div key={m.id} className="grid gap-2 sm:grid-cols-[180px_120px_1fr] sm:items-center">
            <span className="text-sm font-medium">{m.label.split(" (")[0]}</span>
            <div>
              <Label htmlFor={`flair-since-${m.id}`} className="sr-only">
                Selling since
              </Label>
              <Input id={`flair-since-${m.id}`} name={`flair_since_${m.id}`} type="number" min={1995} max={year} defaultValue={f?.since ?? ""} placeholder="Since year" />
            </div>
            <div>
              <Label htmlFor={`flair-label-${m.id}`} className="sr-only">
                Label
              </Label>
              <Input id={`flair-label-${m.id}`} name={`flair_label_${m.id}`} maxLength={24} defaultValue={f?.label ?? ""} placeholder="Short label, e.g. Top Rated or 200+ shows" />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">Shows next to your name as, for example, &ldquo;eBay · since 2016 · Top Rated&rdquo;. No links. Staff can remove anything misleading.</p>
    </div>
  );
}

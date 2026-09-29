"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Label } from "@/components/ui/label";
import { LABELS_CHECKED, labelAdvice, labelPlatforms, printers, type LabelPlatformId, type PrinterId } from "@/lib/tools/label-sizes";

/* Label size helper: printer settings for the paper you use, and what each platform's own help says about labels. */

const selectCls = "h-11 w-full rounded-md border bg-background px-2 text-sm sm:h-9";

export function LabelHelper() {
  const [printerId, setPrinterId] = useState<PrinterId>("thermal");
  const [platformId, setPlatformId] = useState<LabelPlatformId>("click-drop");
  const { printer, platform } = labelAdvice(printerId, platformId);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="lh-printer">What you print on</Label>
          <select id="lh-printer" value={printerId} onChange={(e) => setPrinterId(e.target.value as PrinterId)} className={selectCls}>
            {printers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="lh-platform">Where the label comes from</Label>
          <select id="lh-platform" value={platformId} onChange={(e) => setPlatformId(e.target.value as LabelPlatformId)} className={selectCls}>
            {labelPlatforms.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div aria-live="polite" className="space-y-6">
        <section aria-labelledby="lh-settings" className="space-y-3">
          <h2 id="lh-settings" className="text-lg font-semibold">
            Settings to choose
          </h2>
          <p className="text-sm text-muted-foreground">For {printer.paper}. These apply to any label you print from a PDF.</p>
          <dl className="divide-y rounded-xl border text-sm">
            {printer.settings.map((s) => (
              <div key={s.name} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr]">
                <dt className="font-medium">{s.name}</dt>
                <dd className="text-muted-foreground">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm">{printer.watch}</p>
        </section>

        <section aria-labelledby="lh-platform-heading" className="space-y-3">
          <h2 id="lh-platform-heading" className="text-lg font-semibold">
            {platform.name}
          </h2>
          {platform.says.length ? (
            <>
              <p className="text-sm text-muted-foreground">What {platform.name}&rsquo;s own help page says:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {platform.says.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="text-sm text-muted-foreground">{platform.lookFor}</p>
          <a href={platform.help.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium underline sm:min-h-0">
            {platform.help.title}
            <ExternalLink className="size-3.5" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        Platform notes checked on {LABELS_CHECKED}. Menus and label options change, so if a setting has moved, search the platform&rsquo;s help for &ldquo;label format&rdquo; or &ldquo;print label&rdquo;. Print one test label on plain paper before a batch.
      </p>
    </div>
  );
}

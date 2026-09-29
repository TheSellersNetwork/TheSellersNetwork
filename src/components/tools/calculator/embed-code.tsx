"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/lib/site";
import { embedSlugs, type EmbedTheme } from "./model";

/* Builds the iframe code for the embeddable calculator, with a live preview of exactly what it will show. */

const selectCls = "h-11 w-full rounded-md border bg-background px-2 text-sm sm:h-9";

export function embedSrc(origin: string, platform: string, theme: EmbedTheme): string {
  const p = new URLSearchParams();
  if (platform) p.set("platform", platform);
  if (theme === "dark") p.set("theme", "dark");
  const q = p.toString();
  return `${origin}/embed/calculator${q ? `?${q}` : ""}`;
}

export function EmbedCode() {
  const [platform, setPlatform] = useState("ebay");
  const [theme, setTheme] = useState<EmbedTheme>("light");
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("460");
  const [copied, setCopied] = useState(false);

  const w = /^\d{2,4}(%|px)?$/.test(width.trim()) ? width.trim().replace(/px$/, "") : "100%";
  const h = /^\d{2,4}$/.test(height.trim()) ? height.trim() : "460";
  const name = embedSlugs.find((e) => e.slug === platform)?.title ?? "Fee calculator";
  const code = `<iframe src="${embedSrc(siteConfig.url, platform, theme)}" width="${w}" height="${h}" style="border:0;max-width:100%" title="${name} from ${siteConfig.name}" loading="lazy"></iframe>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Code copied");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Select the code and copy it with Ctrl+C or Cmd+C.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="ec-platform">Platform</Label>
          <select id="ec-platform" value={platform} onChange={(e) => setPlatform(e.target.value)} className={selectCls}>
            {embedSlugs.map((e) => (
              <option key={e.slug} value={e.slug}>
                {e.platform}
              </option>
            ))}
            <option value="">Let visitors choose</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ec-theme">Theme</Label>
          <select id="ec-theme" value={theme} onChange={(e) => setTheme(e.target.value === "dark" ? "dark" : "light")} className={selectCls}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ec-width">Width</Label>
          <Input id="ec-width" value={width} onChange={(e) => setWidth(e.target.value)} />
          <p className="text-xs text-muted-foreground">Pixels, or a percentage such as 100%</p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ec-height">Height (pixels)</Label>
          <Input id="ec-height" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ec-code">Code to paste into your page</Label>
        <textarea id="ec-code" readOnly value={code} rows={4} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-md border bg-secondary p-3 font-mono text-xs break-all" />
        <Button type="button" variant="outline" size="sm" onClick={copy} className="min-h-11 sm:min-h-8">
          {copied ? <Check data-icon="inline-start" aria-hidden="true" /> : <Copy data-icon="inline-start" aria-hidden="true" />}
          {copied ? "Code copied" : "Copy code"}
        </Button>
      </div>

      <section aria-labelledby="ec-preview-heading" className="space-y-2">
        <h2 id="ec-preview-heading" className="text-lg font-semibold">
          Preview
        </h2>
        <div className="overflow-hidden rounded-xl border bg-secondary p-3">
          <iframe key={`${platform}-${theme}`} src={embedSrc("", platform, theme)} width={w} height={h} style={{ border: 0, maxWidth: "100%" }} title={`Preview: ${name}`} />
        </div>
      </section>
    </div>
  );
}

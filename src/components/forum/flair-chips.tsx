import { siteConfig } from "@/lib/site";
import type { Flair } from "@/lib/db/types";

const short: Record<string, string> = {
  ebay: "eBay",
  amazon: "Amazon",
  vinted: "Vinted",
  etsy: "Etsy",
  depop: "Depop",
  facebook: "Facebook",
  own_website: "Own site",
  live: "Live",
  other: "Other",
};

export function flairText(f: Flair): string {
  const name = short[f.platform] ?? siteConfig.marketplaces.find((m) => m.id === f.platform)?.label ?? f.platform;
  const parts = [name];
  if (f.since) parts.push(`since ${f.since}`);
  if (f.label) parts.push(f.label);
  return parts.join(" · ");
}

/* Small labels next to a name: "eBay · since 2016 · Top Rated". Self-declared, so styled quietly. */
export function FlairChips({ flair, limit = 2, className }: { flair: Flair[] | null | undefined; limit?: number; className?: string }) {
  if (!flair || flair.length === 0) return null;
  return (
    <span className={className}>
      {flair.slice(0, limit).map((f, i) => (
        <span key={`${f.platform}-${i}`} className="mr-1 inline-block rounded border px-1.5 py-0.5 text-[11px] leading-4 text-muted-foreground">
          {flairText(f)}
        </span>
      ))}
    </span>
  );
}

export function StreakChip({ weeks }: { weeks: number }) {
  if (weeks < 2) return null;
  return (
    <span className="inline-block rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium leading-4 text-brand" title="Consecutive weekly numbers threads posted in">
      {weeks}-week streak
    </span>
  );
}

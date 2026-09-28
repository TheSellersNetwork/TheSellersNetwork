"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { platformColours, platformLabels, type ChangePlatform, type PolicyChange } from "@/lib/tools/changes";
import { cn } from "@/lib/utils";

export function ChangeTimeline({ changes }: { changes: PolicyChange[] }) {
  const [filter, setFilter] = useState<ChangePlatform | "all">("all");
  const platforms = Array.from(new Set(changes.map((c) => c.platform)));
  const shown = filter === "all" ? changes : changes.filter((c) => c.platform === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by platform">
        {(["all", ...platforms] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={filter === p}
            onClick={() => setFilter(p)}
            className={cn("rounded-full border px-3 py-1 text-sm", filter === p ? "border-brand bg-brand/15" : "bg-card hover:border-brand/60")}
          >
            {p === "all" ? "All" : platformLabels[p]}
          </button>
        ))}
      </div>

      <ol className="relative mt-8 border-l pl-6">
        {shown.flatMap((c, i) => {
          const year = c.date.slice(0, 4);
          const items = [];
          if (i === 0 || shown[i - 1].date.slice(0, 4) !== year) {
            items.push(
              <li key={year} className="-ml-6 mb-4 text-sm font-semibold text-muted-foreground" aria-hidden="true">
                {year}
              </li>,
            );
          }
          items.push(
            <li key={`${c.date}-${c.title}`} className="relative mb-8">
              <span className="absolute -left-[30.5px] top-1 size-3 rounded-full border-2 border-background" style={{ background: `var(--cat-${platformColours[c.platform]})` }} aria-hidden="true" />
              <p className="text-xs text-muted-foreground">
                <time dateTime={c.date}>{new Date(`${c.date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}</time>
                {" · "}
                {platformLabels[c.platform]}
              </p>
              <h2 className="mt-0.5 font-semibold">{c.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.summary}</p>
              {c.note ? <p className="mt-1 text-xs text-muted-foreground">{c.note}</p> : null}
              <a href={c.url} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-sm underline">
                Official announcement <ExternalLink className="size-3" aria-hidden="true" />
              </a>
            </li>,
          );
          return items;
        })}
      </ol>
    </div>
  );
}

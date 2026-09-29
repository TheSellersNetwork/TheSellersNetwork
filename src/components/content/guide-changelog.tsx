import { ChevronRight } from "lucide-react";
import { formatDay, type GuideChange } from "@/lib/content/guide-changes";

/*
  A collapsible "What changed" list at the end of a guide, newest first. The
  list carries id="what-changed", so the "Updated" link near the title opens
  the details (browsers expand a closed <details> when a link targets
  something inside it). Print styles show the list even when closed.
*/
export function GuideChangelog({ changes }: { changes: GuideChange[] }) {
  if (changes.length === 0) return null;
  return (
    <details className="group mt-10 rounded-lg border bg-card print:border-0" data-testid="guide-changelog">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-4 py-2 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        What changed
        <span className="text-sm font-normal text-muted-foreground">({changes.length === 1 ? "1 update" : `${changes.length} updates`})</span>
      </summary>
      <ol id="what-changed" className="scroll-mt-[calc(var(--header-height)+4rem)] space-y-3 border-t px-4 py-3 text-sm">
        {changes.map((c, i) => (
          <li key={`${c.date}-${i}`}>
            <time dateTime={c.date} className="font-medium">
              {formatDay(c.date)}
            </time>
            <p className="mt-0.5 text-muted-foreground">{c.note}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

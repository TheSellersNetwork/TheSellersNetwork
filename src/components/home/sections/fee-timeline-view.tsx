"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { defaultIndex, shortDate, type Timeline } from "@/lib/home/sections/fee-timeline";
import { platformColours, platformLabels } from "@/lib/tools/changes";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

/*
  The timeline itself. Each change is a dot with its platform and date;
  hovering, focusing or tapping one shows it in the panel underneath. On a
  narrow screen the line scrolls sideways and starts centred on Today.
*/
export function FeeTimelineView({ timeline }: { timeline: Timeline }) {
  const headingId = useId();
  const panelId = useId();
  const [active, setActive] = useState(() => defaultIndex(timeline));
  const scroller = useRef<HTMLDivElement>(null);
  const today = useRef<HTMLLIElement>(null);

  // Centre Today in the scroller. Only the scroller moves, never the page.
  useEffect(() => {
    const box = scroller.current;
    const mark = today.current;
    if (!box || !mark || box.scrollWidth <= box.clientWidth) return;
    const b = box.getBoundingClientRect();
    const m = mark.getBoundingClientRect();
    box.scrollLeft += m.left + m.width / 2 - (b.left + b.width / 2);
  }, []);

  const item = timeline.items[active];
  const nodes = timeline.items.map((c, i) => (
    <li key={c.slug} className="w-28 shrink-0 snap-center" data-upcoming={c.upcoming || undefined}>
      <button
        type="button"
        onMouseEnter={() => setActive(i)}
        onFocus={() => setActive(i)}
        onClick={() => setActive(i)}
        aria-pressed={i === active}
        aria-controls={panelId}
        className="group flex w-full flex-col items-center rounded-md px-1 pb-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <span className="grid h-11 place-items-center" aria-hidden="true">
          <span
            className={cn("block size-3.5 rounded-full border-2 transition-transform", "motion-reduce:transition-none", c.announced && "border-dashed", i === active && "scale-125 ring-2 ring-ring/40 ring-offset-2 ring-offset-card")}
            style={{ borderColor: `var(--cat-${platformColours[c.platform]})`, background: c.upcoming || c.announced ? "var(--card)" : `var(--cat-${platformColours[c.platform]})` }}
          />
        </span>
        <span className={cn("text-xs font-medium", i === active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>{platformLabels[c.platform]}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{shortDate(c.date)}</span>
        <span className="sr-only">
          , {c.title}
          {c.announced ? " (announced, no start date yet)" : c.upcoming ? " (coming)" : ""}
        </span>
      </button>
    </li>
  ));

  return (
    <section aria-labelledby={headingId} className="rounded-2xl border bg-card p-5 sm:p-6" data-testid="fee-timeline">
      <h2 id={headingId} className="text-lg font-semibold">
        Fee changes, past and coming
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Tap a dot to see what changed. Hollow dots have not happened yet; dashed ones are plans with no start date.</p>

      <div ref={scroller} className="-mx-5 mt-4 snap-x snap-proximity overflow-x-auto px-5 sm:-mx-6 sm:px-6" data-testid="fee-timeline-scroller">
        <ol className="relative mx-auto flex w-max">
          <span className="absolute top-[22px] right-0 left-0 h-px bg-border" aria-hidden="true" />
          {nodes.slice(0, timeline.pastCount)}
          <li ref={today} className="flex w-16 shrink-0 snap-center flex-col items-center" data-testid="fee-timeline-today">
            <span className="grid h-11 place-items-center" aria-hidden="true">
              <span className="block h-7 w-0.5 rounded-full bg-primary" />
            </span>
            <span className="text-xs font-semibold text-brand">Today</span>
          </li>
          {nodes.slice(timeline.pastCount)}
        </ol>
      </div>

      {item ? (
        <div id={panelId} aria-live="polite" className="mt-3 rounded-lg border bg-background p-4" data-testid="fee-timeline-panel">
          <p className="text-xs text-muted-foreground">
            {platformLabels[item.platform]} · {item.announced ? "Announced on" : item.upcoming ? "Comes in on" : "Came in on"} {shortDate(item.date)}
          </p>
          <p className="mt-1 font-medium">{item.title}</p>
          {item.summary ? <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p> : null}
          <Link href={urls.blogPost(item.slug)} className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline sm:min-h-0">
            What it means for you <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

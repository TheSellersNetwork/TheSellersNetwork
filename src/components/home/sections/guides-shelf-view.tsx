"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { ProgressRing } from "@/components/content/path-progress";
import { useReadSteps } from "@/lib/content/read-progress";
import { continuePath, type ShelfCover, type ShelfGroup, type ShelfPath } from "@/lib/home/sections/guides-shelf-core";
import { cn } from "@/lib/utils";

/*
  The shelf itself. A row of covers for the chosen group, scrolled sideways
  by touch, trackpad or the arrow buttons (shown on wider screens). Reading
  progress lives in this browser only, so the "Continue" card and the ticks
  appear once the page has loaded.
*/
export function GuidesShelfView({ groups, paths, byPath }: { groups: ShelfGroup[]; paths: ShelfPath[]; byPath: boolean }) {
  const read = useReadSteps();
  const resume = continuePath(paths, read);
  const [active, setActive] = useState(groups[0]?.id);
  const group = groups.find((g) => g.id === active) ?? groups[0];

  const rowRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollLeft = 0;
    measure();
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [measure, active, resume?.path.slug]);

  function scroll(direction: 1 | -1) {
    const el = rowRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: reduce ? "auto" : "smooth" });
  }

  if (!group) return null;

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {groups.length > 1 ? (
          <div role="group" aria-label={byPath ? "Beginner paths" : "Topics"} className="flex max-w-full gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                aria-pressed={g.id === group.id}
                onClick={() => setActive(g.id)}
                className={cn(
                  "min-h-11 shrink-0 whitespace-nowrap rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:min-h-9",
                  g.id === group.id ? "border-brand bg-brand-soft font-medium text-foreground" : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {g.title}
              </button>
            ))}
          </div>
        ) : null}
        <div className="hidden gap-1 md:flex">
          <ScrollButton label="Scroll guides left" disabled={edges.start} onClick={() => scroll(-1)}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </ScrollButton>
          <ScrollButton label="Scroll guides right" disabled={edges.end} onClick={() => scroll(1)}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </ScrollButton>
        </div>
      </div>

      <ul ref={rowRef} onScroll={measure} aria-label={group.title} className="mt-3 flex snap-x gap-3 overflow-x-auto pb-3 motion-safe:scroll-smooth">
        {resume ? (
          <li className="w-56 shrink-0 snap-start" data-testid="shelf-continue">
            <Link
              href={resume.next.href}
              className="flex h-full flex-col gap-3 rounded-lg border border-brand bg-brand-soft p-4 transition-colors hover:border-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <span className="flex items-center gap-3">
                <ProgressRing done={resume.done} total={resume.total} size={40} />
                <span className="text-sm font-semibold">
                  Continue: step {resume.step} of {resume.total}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{resume.path.title}</span>
              <span className="line-clamp-3 text-sm font-medium leading-snug underline-offset-2 hover:underline">{resume.next.title}</span>
            </Link>
          </li>
        ) : null}
        {group.covers.map((c, i) => (
          <Cover key={c.key} cover={c} step={byPath ? i + 1 : null} read={read.includes(c.key)} />
        ))}
        <li className="w-40 shrink-0 snap-start">
          <Link
            href={group.href}
            className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm font-medium text-brand hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {byPath ? "See the whole path" : "All guides"}
          </Link>
        </li>
      </ul>
    </div>
  );
}

function ScrollButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full border bg-card text-foreground transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}

function Cover({ cover, step, read }: { cover: ShelfCover; step: number | null; read: boolean }) {
  return (
    <li className="w-40 shrink-0 snap-start">
      <Link
        href={cover.href}
        className="group flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-brand/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
        style={{ "--cover": `var(--cat-${cover.colour})` } as React.CSSProperties}
      >
        <span className="relative flex h-24 items-end justify-between border-b bg-secondary py-2 pl-4 pr-3">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-[var(--cover)]" />
          <span aria-hidden="true" className="text-4xl font-semibold leading-none tracking-tight text-[var(--cover)]">
            {cover.initial}
          </span>
          {read ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" aria-hidden="true" />
              Read
            </span>
          ) : step !== null ? (
            <span className="text-xs text-muted-foreground">Step {step}</span>
          ) : null}
        </span>
        <span className="flex flex-1 flex-col gap-1 p-3">
          <span className="text-xs text-muted-foreground">
            {cover.topic}
            {cover.kind === "blog" ? " · Blog" : ""}
          </span>
          <span className="line-clamp-3 text-sm font-semibold leading-snug group-hover:underline">{cover.title}</span>
          <span className="mt-auto pt-1 text-xs text-muted-foreground">{cover.minutes} min read</span>
        </span>
      </Link>
    </li>
  );
}

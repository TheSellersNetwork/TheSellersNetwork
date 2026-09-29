"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { pathProgress, type PathStep } from "@/lib/content/paths-core";
import { setStepRead, useReadSteps } from "@/lib/content/read-progress";
import { cn } from "@/lib/utils";

/* A small ring that fills as steps are ticked. Decorative: the "x of y read" text beside it says the same. */
export function ProgressRing({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fraction = total > 0 ? done / total : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={done === total && total > 0 ? "var(--success)" : "var(--brand)"}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - fraction)}
        className="transition-[stroke-dashoffset] duration-300 ease-out motion-reduce:transition-none"
      />
    </svg>
  );
}

/* "3 of 8 read" with the ring, for path cards and the path page header. */
export function PathProgress({ steps, size = 44, className }: { steps: { key: string }[]; size?: number; className?: string }) {
  const read = useReadSteps();
  const { done, total } = pathProgress(steps, read);
  return (
    <div className={cn("flex items-center gap-3", className)} data-testid="path-progress">
      <ProgressRing done={done} total={total} size={size} />
      <p className="text-sm">
        <span className="font-medium tabular-nums">
          {done} of {total}
        </span>{" "}
        <span className="text-muted-foreground">{done === total && total > 0 ? "read. Path complete." : "read"}</span>
      </p>
    </div>
  );
}

/* The steps of a path, each with a tick box the reader can set by hand. */
export function PathStepList({ steps }: { steps: PathStep[] }) {
  const read = useReadSteps();
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const done = read.includes(s.key);
        const id = `step-${s.key.replace(/[^a-z0-9-]/g, "-")}`;
        return (
          <li key={s.key} className={cn("forum-card flex gap-3 rounded-lg border bg-card p-4 transition-colors motion-reduce:transition-none", done && "border-success/50")}>
            <div className="flex shrink-0 flex-col items-center">
              <label className="relative -m-2 flex size-11 cursor-pointer items-center justify-center rounded-md focus-within:ring-2 focus-within:ring-ring">
                <input id={id} type="checkbox" checked={done} onChange={(e) => setStepRead(s.key, e.target.checked)} className="peer sr-only" />
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border-2 transition-colors motion-reduce:transition-none",
                    done ? "border-success bg-success text-background" : "border-muted-foreground/50 bg-card",
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <span className="sr-only">
                  Mark step {i + 1}, {s.title}, as read
                </span>
              </label>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                Step {i + 1} · {s.kind === "guide" ? "Guide" : "Blog post"}
                {done ? <span className="text-success"> · Read</span> : null}
              </p>
              <Link href={s.href} className="mt-0.5 block font-semibold leading-snug hover:underline">
                {s.title}
              </Link>
              {s.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.excerpt}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/*
  Placed after an article that belongs to a path. When the reader scrolls to
  it, the step is ticked. Renders nothing visible.
*/
export function ArticleEndTracker({ stepKey }: { stepKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStepRead(stepKey, true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stepKey]);
  return <div ref={ref} aria-hidden="true" data-article-end className="h-px" />;
}

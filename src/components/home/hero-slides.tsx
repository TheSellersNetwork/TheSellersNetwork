"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Megaphone, Package, Pause, Play, TrendingUp, Wrench } from "lucide-react";
import type { Slide, SlideIcon } from "@/lib/home/coming-up";
import { cn } from "@/lib/utils";

const SLIDE_MS = 6000;
const REDUCED = "(prefers-reduced-motion: reduce)";

const icons: Record<SlideIcon, typeof BookOpen> = {
  question: CircleHelp,
  guide: BookOpen,
  tool: Wrench,
  numbers: TrendingUp,
  pickup: Package,
  change: Megaphone,
};

function subscribeReducedMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const month = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
const dayNum = (d: string) => Number(d.slice(8, 10));

/*
  The revolving card at the top of the home page: dates, pickups, questions,
  guides and tools, one at a time. It moves on every few seconds with a
  progress line. It stops while hovered or focused, has a pause button
  (WCAG 2.2.2), and never moves on its own for people who ask for reduced
  motion.
*/
export function HeroSlides({ slides, className }: { slides: Slide[]; className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED).matches, () => false);

  const running = !paused && !held && !reduced && slides.length > 1;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [running, index, slides.length]);

  const slide = slides[index];
  if (!slide) return null;
  const go = (step: number) => setIndex((i) => (i + step + slides.length) % slides.length);

  return (
    <section
      aria-label="Around the site"
      aria-roledescription="carousel"
      className={cn("relative overflow-hidden rounded-2xl border bg-card", className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
      }}
    >
      <div className="flex items-center justify-between gap-3 px-5 pt-4">
        <p key={`eyebrow-${slide.key}`} className="slide-in truncate text-sm font-medium text-muted-foreground">
          {slide.eyebrow}
        </p>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label="Previous" onClick={() => go(-1)}>
            <ChevronLeft className="size-4" />
          </IconButton>
          <IconButton label={paused ? "Play" : "Pause"} onClick={() => setPaused((p) => !p)}>
            {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
          </IconButton>
          <IconButton label="Next" onClick={() => go(1)}>
            <ChevronRight className="size-4" />
          </IconButton>
        </div>
      </div>

      <div aria-live={running ? "off" : "polite"} className="px-5 pb-4 pt-3">
        <Link key={slide.key} href={slide.href} className="slide-in group flex min-h-[6.25rem] gap-4">
          <Visual slide={slide} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 font-semibold leading-snug group-hover:underline">{slide.title}</span>
            {slide.detail ? <span className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{slide.detail}</span> : null}
            <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              {slide.pill ? (
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", slide.urgent ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground")}>{slide.pill}</span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-brand">
                {slide.cta}
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
              </span>
            </span>
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-3 border-t px-5 py-2.5 text-xs text-muted-foreground">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="live-dot size-2 shrink-0 rounded-full bg-success" aria-hidden="true" />
          <span className="truncate text-foreground">Users are online</span>
        </span>
        <span className="flex shrink-0 gap-1">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${i + 1} of ${slides.length}`}
              aria-current={i === index}
              className={cn("h-1.5 rounded-full transition-all motion-reduce:transition-none", i === index ? "w-4 bg-brand" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground")}
            />
          ))}
        </span>
      </div>

      {/* Time until the next slide */}
      {running ? <span key={`bar-${index}`} className="slide-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-brand" style={{ animationDuration: `${SLIDE_MS}ms` }} aria-hidden="true" /> : null}
    </section>
  );
}

function Visual({ slide }: { slide: Slide }) {
  const v = slide.visual;
  if (v.kind === "date") {
    return (
      <span className={cn("grid size-14 shrink-0 place-items-center content-center rounded-xl border leading-none", slide.urgent ? "border-brand/70" : "bg-background")}>
        <span className="text-2xl font-semibold tabular-nums">{dayNum(v.date)}</span>
        <span className="mt-1 text-xs text-muted-foreground">{month(v.date)}</span>
      </span>
    );
  }
  if (v.kind === "photo" && v.src) {
    return <Image src={v.src} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl border object-cover" />;
  }
  const Icon = icons[v.kind === "icon" ? v.icon : "pickup"];
  return (
    <span className="grid size-14 shrink-0 place-items-center rounded-xl border bg-background text-brand">
      <Icon className="size-6" aria-hidden="true" />
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-brand">
      {children}
    </button>
  );
}

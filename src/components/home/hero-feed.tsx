"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { HeroSlides } from "@/components/home/hero-slides";
import type { Slide } from "@/lib/home/coming-up";
import type { FeedItem } from "@/lib/home/hero-feed";
import { cn } from "@/lib/utils";

/*
  The right-hand side of the home page hero: real guides, changes and
  questions drifting upwards in two columns, with the revolving card in front.
  The ribbon is decoration (the same content is linked all over the page), so
  it is hidden from screen readers. It stops on hover, has a pause button
  (WCAG 2.2.2), and stays still for people who ask for reduced motion.
*/
export function HeroFeed({ slides, feed }: { slides: Slide[]; feed: FeedItem[] }) {
  const [paused, setPaused] = useState(false);
  const cols = [feed.filter((_, n) => n % 2 === 0), feed.filter((_, n) => n % 2 === 1)];

  return (
    <div className="relative flex flex-col gap-4 lg:block lg:h-[27rem]">
      <div className="relative h-64 lg:absolute lg:inset-x-0 lg:top-0 lg:h-[17.5rem]">
        <div className={cn("feed-mask absolute inset-0 grid grid-cols-2 gap-3 overflow-hidden", paused && "feed-paused")} aria-hidden="true">
          {cols.map((col, c) => (
            <div key={c} className="feed-col space-y-3" style={{ animationDuration: `${c === 0 ? 40 : 55}s` }}>
              {[...col, ...col].map((item, n) => (
                <div key={n} className="rounded-lg border bg-card px-3 py-2">
                  <p className={cn("text-[11px] font-medium", item.kind === "Question" ? "text-success" : "text-brand")}>{item.kind}</p>
                  <p className="line-clamp-2 text-xs leading-snug">{item.title}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Play background animation" : "Pause background animation"}
          className="absolute right-1 top-1 z-10 grid size-7 place-items-center rounded-md border bg-card text-muted-foreground hover:text-foreground"
        >
          {paused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
        </button>
      </div>
      <HeroSlides slides={slides} className="z-10 lg:absolute lg:inset-x-0 lg:bottom-0" />
    </div>
  );
}

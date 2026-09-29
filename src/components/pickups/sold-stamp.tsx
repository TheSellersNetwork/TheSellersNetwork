"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const STORE = "tsn:sold-stamps-seen";
const MAX_KEPT = 500;

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(STORE);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function remember(key: string) {
  try {
    const list = readSeen().filter((k) => k !== key);
    list.push(key);
    window.localStorage.setItem(STORE, JSON.stringify(list.slice(-MAX_KEPT)));
  } catch {
    // Storage blocked (private window): the stamp simply animates again next time.
  }
}

/*
  "Sold · 14x" on a pickup photo. The first time a viewer scrolls it into view
  after it was marked sold, it presses down like a rubber stamp (about a
  quarter of a second). After that, and for anyone who prefers reduced motion,
  it just sits there. Seen stamps are remembered in this browser only.
*/
export function SoldStamp({ stampKey, multiple, className }: { stampKey: string; multiple: string | null; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || readSeen().includes(stampKey)) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined" || typeof el.animate !== "function") {
      remember(stampKey);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        remember(stampKey);
        el.animate(
          [
            { transform: "scale(1.6) rotate(-14deg)", opacity: 0 },
            { transform: "scale(0.94) rotate(-6deg)", opacity: 1, offset: 0.7 },
            { transform: "scale(1) rotate(-6deg)", opacity: 1 },
          ],
          { duration: 260, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", delay: 120, fill: "backwards" },
        );
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [stampKey]);

  return (
    <span
      ref={ref}
      className={cn(
        "inline-block -rotate-6 rounded-md border-2 border-success bg-card px-2 py-0.5 text-sm font-bold tracking-wide text-success shadow-sm",
        className,
      )}
    >
      Sold{multiple ? ` · ${multiple}` : ""}
    </span>
  );
}

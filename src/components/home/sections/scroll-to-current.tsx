"use client";

import { useEffect, useRef } from "react";

/*
  Wraps a horizontally scrolling list and, on load, scrolls it sideways so
  the item marked aria-current is in view. Only the list moves, never the
  page, and nothing happens when the list is not scrolling (wide screens).
*/
export function ScrollToCurrent({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    const list = root?.querySelector<HTMLElement>("[data-scroller]");
    const current = list?.querySelector<HTMLElement>("[aria-current]");
    if (!list || !current || list.scrollWidth <= list.clientWidth) return;
    // The list is position: relative, so offsetLeft is measured from its start.
    list.scrollLeft = Math.max(0, current.offsetLeft - 16);
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

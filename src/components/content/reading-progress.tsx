"use client";

import { useEffect, useRef } from "react";

/*
  A thin bar under the site header showing how far through the article the
  reader is. Updated on scroll with no animation of its own, so it is the
  same with reduced motion. Decorative, hidden from assistive technology.
*/
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const el = bar.current;
    if (!target || !el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = target.getBoundingClientRect();
      const distance = rect.height - window.innerHeight;
      const fraction = distance <= 0 ? (rect.top <= 0 ? 1 : 0) : Math.min(1, Math.max(0, -rect.top / distance));
      el.style.transform = `scaleX(${fraction})`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [targetId]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-[var(--header-height)] z-40 h-0.5" data-reading-progress>
      <div ref={bar} className="h-full origin-left bg-brand" style={{ transform: "scaleX(0)" }} />
    </div>
  );
}

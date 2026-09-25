"use client";

import { useEffect, useState } from "react";

/* Counts from zero to the value over 600ms. Renders the final value immediately when motion is reduced. */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (value === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const start = performance.now();
    const duration = 600;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(value * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{shown.toLocaleString("en-GB")}</span>;
}

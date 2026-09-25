"use client";

import { useEffect } from "react";
import { recordRead } from "@/app/community/actions";

/*
  Records one topic read and the posts on the page after a short dwell, plus
  time on page when the member leaves. Feeds user_stats_daily for trust levels.
*/
export function ReadTracker({ postCount }: { postCount: number }) {
  useEffect(() => {
    const started = Date.now();
    let recorded = false;
    const dwell = window.setTimeout(() => {
      recorded = true;
      void recordRead(1, postCount, 10);
    }, 10_000);

    const leave = () => {
      const seconds = Math.round((Date.now() - started) / 1000);
      if (recorded && seconds > 10) void recordRead(0, 0, seconds - 10);
      else if (!recorded && seconds >= 3) void recordRead(1, postCount, seconds);
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.clearTimeout(dwell);
      window.removeEventListener("pagehide", leave);
    };
  }, [postCount]);
  return null;
}

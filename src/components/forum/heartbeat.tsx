"use client";

import { useEffect } from "react";
import { touchPresence } from "@/app/community/presence-actions";

/* Tells the server the member is still here, every two minutes while the tab is visible. */
export function Heartbeat() {
  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") void touchPresence();
    };
    beat();
    const timer = window.setInterval(beat, 120_000);
    document.addEventListener("visibilitychange", beat);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, []);
  return null;
}

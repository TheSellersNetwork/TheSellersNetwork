"use client";

import { useEffect } from "react";

/* Registers the push service worker once per visit. It does not cache pages. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Push is optional; the site works without it.
    });
  }, []);
  return null;
}

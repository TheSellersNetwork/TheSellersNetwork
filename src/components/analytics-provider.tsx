"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/*
  PostHog is initialised only when a real key is present. Capturing is opted out
  by default until the cookie consent banner (a later task) opts the visitor in,
  which keeps us on the right side of GDPR without a separate flag.
*/
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key || key.startsWith("placeholder")) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      capture_pageleave: true,
      opt_out_capturing_by_default: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

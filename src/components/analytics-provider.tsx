"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { CONSENT_EVENT, readConsent, type Consent } from "@/lib/consent";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/*
  PostHog is not loaded at all until the visitor accepts analytics in the
  cookie banner, so nothing is stored or sent before consent. Withdrawing
  consent stops capture and clears what PostHog stored.
*/
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key || key.startsWith("placeholder")) return;
    const apply = (consent: Consent | null) => {
      if (consent === "analytics") {
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: host,
            capture_pageview: true,
            capture_pageleave: true,
            persistence: "localStorage+cookie",
            disable_session_recording: true,
            ip: false,
          });
        }
        posthog.opt_in_capturing();
      } else if (posthog.__loaded) {
        posthog.opt_out_capturing();
        posthog.reset();
      }
    };
    apply(readConsent());
    const onChange = (e: Event) => apply((e as CustomEvent<Consent>).detail);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

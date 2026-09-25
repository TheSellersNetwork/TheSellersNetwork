"use client";

import posthog from "posthog-js";

export type ClientEvent = "signup" | "first_post" | "solution_marked" | "signup_form_submitted";

/* Client-side event. Safe to call before PostHog is initialised. */
export function track(event: ClientEvent, properties: Record<string, unknown> = {}) {
  try {
    if (posthog.__loaded) posthog.capture(event, properties);
  } catch {
    // Never let analytics interrupt the member.
  }
}

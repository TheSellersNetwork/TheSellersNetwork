"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/client";

const SEARCH_ENGINES = /(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./i;

/*
  Funnel start for search visitors. On a topic page, a signed-out visitor
  arriving from a search engine fires search_landing with the topic and its
  solved state, and the landing path is kept for the session so the later
  signup events can carry it.
*/
export function LandingTracker({ topicId, solved, signedIn }: { topicId: string; solved: boolean; signedIn: boolean }) {
  useEffect(() => {
    if (signedIn) return;
    try {
      if (!sessionStorage.getItem("tsn:landing")) {
        sessionStorage.setItem("tsn:landing", window.location.pathname);
        sessionStorage.setItem("tsn:landing_referrer", document.referrer || "direct");
      }
      let host = "";
      try {
        host = document.referrer ? new URL(document.referrer).hostname : "";
      } catch {
        host = "";
      }
      if (host && SEARCH_ENGINES.test(host)) {
        track("search_landing", { topic_id: topicId, solved, engine: host });
      }
    } catch {
      // Storage unavailable.
    }
  }, [topicId, solved, signedIn]);
  return null;
}

/* The landing page recorded for this session, for signup events. */
export function landingContext(): Record<string, string> {
  try {
    return {
      landing_path: sessionStorage.getItem("tsn:landing") ?? "",
      landing_referrer: sessionStorage.getItem("tsn:landing_referrer") ?? "",
    };
  } catch {
    return {};
  }
}

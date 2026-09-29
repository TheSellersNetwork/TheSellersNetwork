import type { NextRequest } from "next/server";
import { siteConfig } from "@/lib/site";
import { getCalendar, PAST_DAYS } from "@/lib/tools/calendar";
import { eventsFrom, filterCategories, parseCategories, toYmd } from "@/lib/tools/calendar-dates";
import { buildIcs } from "@/lib/tools/ics";

/*
  The reseller calendar as an iCalendar feed, for subscribing in Google,
  Apple or Outlook calendars or for a one-off download.
  ?categories=pokemon,tax limits it to those categories.
*/
export async function GET(request: NextRequest) {
  const now = new Date();
  const categories = parseCategories(request.nextUrl.searchParams.get("categories"));
  const events = filterCategories(eventsFrom(await getCalendar(now), toYmd(now), PAST_DAYS), categories);

  const body = buildIcs(events, {
    name: `${siteConfig.name}: reseller calendar`,
    description: "Release dates, sale dates, fee and policy changes and UK tax deadlines for resellers. Every date links to its source.",
    siteUrl: siteConfig.url,
    now,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="reseller-calendar.ics"',
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

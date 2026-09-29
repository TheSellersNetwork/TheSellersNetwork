import "server-only";
import calendarData from "../../../content/calendar.json";
import bankHolidayFallback from "../../../content/bank-holidays.json";
import { getChanges } from "@/lib/content/changes";
import { upcomingTaxDates } from "@/lib/tools/tax";
import {
  addDays,
  bankHolidayEvents,
  changeEvents,
  entryEvents,
  eventsFrom,
  mergeEvents,
  parseYmd,
  ruleBasedSales,
  taxEvents,
  toYmd,
  type CalendarEvent,
} from "@/lib/tools/calendar-dates";

/*
  Loads every source for the reseller calendar and merges them into one
  sorted list:
  - researched dates in content/calendar.json (each with an official source),
  - fee and policy changes from content/changes,
  - UK tax dates from src/lib/tools/tax.ts,
  - Black Friday, Cyber Monday and Boxing Day, worked out from their rules,
  - UK bank holidays from the GOV.UK feed, with a stored copy if it is down.
*/

export const BANK_HOLIDAYS_FEED = "https://www.gov.uk/bank-holidays.json";

/* How far back the calendar keeps events. The page and the .ics file show the last 60 days at most. */
export const PAST_DAYS = 60;

async function bankHolidays(): Promise<CalendarEvent[]> {
  try {
    const res = await fetch(BANK_HOLIDAYS_FEED, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(5_000) });
    if (res.ok) {
      const events = bankHolidayEvents(await res.json());
      if (events.length > 0) return events;
    }
  } catch {
    // Fall through to the stored copy.
  }
  return bankHolidayEvents(bankHolidayFallback.divisions);
}

/*
  Everything from a week before the past-60-days window onwards, so a page
  built a few days ago still has what the visitor's own "today" needs.
*/
export async function getCalendar(now = new Date()): Promise<CalendarEvent[]> {
  const today = toYmd(now);
  const from = addDays(today, -(PAST_DAYS + 7));
  const year = now.getUTCFullYear();

  const [changes, holidays] = await Promise.all([getChanges(), bankHolidays()]);
  const tax = [...upcomingTaxDates(parseYmd(from), 100), ...upcomingTaxDates(parseYmd(today), 100)];

  const all = mergeEvents(
    entryEvents(calendarData.entries),
    changeEvents(changes),
    taxEvents(tax),
    ruleBasedSales([year - 1, year, year + 1]),
    holidays,
  );
  return eventsFrom(all, from);
}

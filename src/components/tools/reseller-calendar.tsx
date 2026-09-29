"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { CalendarPlus, Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  calendarCategories,
  categoryLabel,
  countdown,
  daysBetween,
  eventsFrom,
  filterCategories,
  formatDay,
  groupByMonth,
  parseYmd,
  type CalendarCategory,
  type CalendarEvent,
} from "@/lib/tools/calendar-dates";
import { cn } from "@/lib/utils";

const PAST_DAYS = 60;

// Today changes at most once a day; re-reading on each render is enough.
const subscribe = () => () => {};
const todayKey = () => new Date().toISOString().slice(0, 10);

type Props = {
  events: CalendarEvent[];
  /* The server's today, used until the browser takes over, so the list renders without JavaScript. */
  serverToday: string;
  /* Absolute https URL of the .ics feed, without a query string. */
  feedUrl: string;
};

export function ResellerCalendar({ events, serverToday, feedUrl }: Props) {
  const today = useSyncExternalStore(subscribe, todayKey, () => serverToday);
  const [selected, setSelected] = useState<CalendarCategory[]>([]);
  const [showPast, setShowPast] = useState(false);

  const visible = useMemo(
    () => filterCategories(eventsFrom(events, today, showPast ? PAST_DAYS : 0), selected),
    [events, today, showPast, selected],
  );
  const groups = groupByMonth(visible);

  const query = selected.length > 0 ? `?categories=${selected.join(",")}` : "";
  const httpsFeed = `${feedUrl}${query}`;
  const webcalFeed = httpsFeed.replace(/^https?:/, "webcal:");
  const downloadPath = `/tools/calendar/calendar.ics${query}`;

  function toggle(id: CalendarCategory) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch {
      toast.error("Could not copy. Select the address and copy it by hand.");
    }
  }

  return (
    <div>
      <section aria-labelledby="calendar-filters" className="rounded-xl border bg-card p-4">
        <h2 id="calendar-filters" className="text-sm font-semibold">
          Show
        </h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Categories">
          <button
            type="button"
            aria-pressed={selected.length === 0}
            onClick={() => setSelected([])}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              selected.length === 0 ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary",
            )}
          >
            Everything
          </button>
          {calendarCategories.map((c) => {
            const on = selected.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-secondary",
                )}
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Switch id="calendar-past" checked={showPast} onCheckedChange={setShowPast} />
          <Label htmlFor="calendar-past" className="text-sm">
            Include the past 60 days
          </Label>
        </div>
      </section>

      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {visible.length === 0 ? "Nothing matches these filters." : `Showing ${visible.length} ${visible.length === 1 ? "date" : "dates"}.`}
      </p>

      <div className="mt-2 space-y-8">
        {groups.map((g) => (
          <section key={g.key} aria-labelledby={`month-${g.key}`}>
            <h2 id={`month-${g.key}`} className="border-b pb-1 text-lg font-semibold">
              {g.label}
            </h2>
            <ol className="mt-3 space-y-3">
              {g.events.map((e) => (
                <EventRow key={e.id} event={e} today={today} />
              ))}
            </ol>
          </section>
        ))}
      </div>

      <section aria-labelledby="calendar-export" className="mt-12 rounded-xl border bg-card p-4">
        <h2 id="calendar-export" className="flex items-center gap-2 font-semibold">
          <CalendarPlus className="size-4 text-brand" aria-hidden="true" /> Add these dates to your calendar
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Subscribe and new dates appear in your calendar on their own. {selected.length > 0 ? `This link only includes: ${selected.map(categoryLabel).join(", ")}.` : "This link includes every category. Pick categories above for a smaller one."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 break-all rounded-md border bg-background px-2 py-1.5 text-xs">{webcalFeed}</code>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => copy(webcalFeed)}>
              <Copy aria-hidden="true" /> Copy link
            </Button>
            <Button asChild size="sm">
              <a href={downloadPath} download="reseller-calendar.ics">
                <Download aria-hidden="true" /> Download .ics
              </a>
            </Button>
          </div>
        </div>
        <dl className="mt-4 divide-y rounded-lg border text-sm">
          <div className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium">Google Calendar</dt>
            <dd className="text-muted-foreground">
              On a computer, open Google Calendar, then next to &ldquo;Other calendars&rdquo; choose the plus sign, then &ldquo;From URL&rdquo;. Paste this address:{" "}
              <button type="button" onClick={() => copy(httpsFeed)} className="break-all text-left underline">
                {httpsFeed}
              </button>
              . Google can take up to a day to fetch new dates.
            </dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium">Apple Calendar</dt>
            <dd className="text-muted-foreground">
              On an iPhone or iPad,{" "}
              <a href={webcalFeed} className="underline">
                open the subscribe link
              </a>{" "}
              and confirm. On a Mac, choose File, then New Calendar Subscription, and paste the link.
            </dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium">Outlook</dt>
            <dd className="text-muted-foreground">In Outlook on the web, go to Calendar, then Add calendar, then Subscribe from web, and paste the link.</dd>
          </div>
          <div className="grid gap-1 p-3 sm:grid-cols-[140px_1fr]">
            <dt className="font-medium">Anything else</dt>
            <dd className="text-muted-foreground">Download the .ics file and open it. A download is a one-off copy and will not update.</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Menu names in calendar apps change from time to time; if one has moved, search the app&rsquo;s help for &ldquo;subscribe to calendar&rdquo;.</p>
      </section>
    </div>
  );
}

function EventRow({ event: e, today }: { event: CalendarEvent; today: string }) {
  const past = (e.endDate ?? e.date) < today;
  const soon = !past && daysBetween(today, e.date) <= 14;
  const internal = e.url?.startsWith("/");
  const day = Number(e.date.slice(8, 10));
  const weekday = parseYmd(e.date).toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });

  return (
    <li className={cn("flex gap-3 rounded-lg border bg-card p-3", past && "opacity-70")}>
      <div className="w-14 shrink-0 rounded-md bg-secondary py-1 text-center leading-tight">
        <div className="text-xs uppercase text-muted-foreground">{weekday}</div>
        <div className="text-lg font-semibold tabular-nums">{day}</div>
      </div>
      <div className="min-w-0 text-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{categoryLabel(e.category)}</p>
        <p className="font-medium">{e.title}</p>
        {e.endDate ? <p className="text-muted-foreground">Until {formatDay(e.endDate)}</p> : null}
        {e.detail ? <p className="mt-0.5 text-muted-foreground">{e.detail}</p> : null}
        {e.note ? <p className="mt-0.5 text-muted-foreground">{e.note}</p> : null}
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={cn("font-medium", soon ? "text-destructive" : "text-muted-foreground")}>{countdown(e, today)}</span>
          {e.url ? (
            internal ? (
              <Link href={e.url} className="underline">
                {e.linkLabel ?? "More"}
              </Link>
            ) : (
              <a href={e.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 underline">
                {e.linkLabel ?? "Source"} <ExternalLink className="size-3" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )
          ) : null}
          {e.checked ? <span className="text-muted-foreground">Checked {formatDay(e.checked, false)} {e.checked.slice(0, 4)}</span> : null}
        </p>
      </div>
    </li>
  );
}

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { ScrollToCurrent } from "@/components/home/sections/scroll-to-current";
import { getWeekRhythm, type RhythmTile } from "@/lib/home/sections/week-rhythm";
import { parseYmd } from "@/lib/tools/calendar-dates";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

/*
  The week's rhythm: Monday to Sunday of this UK week, each day with the
  thread the forum posts that day. Past days link to the real thread when it
  went up; today and the days ahead say what is coming. Seven columns when
  there is room, a sideways scroll with today in view on phones.
*/
export async function WeekRhythm({ now }: { now?: Date } = {}) {
  const days = await getWeekRhythm(now);

  return (
    <section aria-labelledby="week-rhythm-heading" className="@container" data-testid="week-rhythm">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h2 id="week-rhythm-heading" className="text-2xl font-semibold tracking-tight">
            The week&apos;s rhythm
          </h2>
          <p className="mt-1 text-muted-foreground">A regular thread for most days. Join in whenever it suits you.</p>
        </div>
        <Link href={urls.category("weekly-threads")} className="inline-flex min-h-11 items-center text-sm text-brand underline-offset-2 hover:underline sm:min-h-0">
          Weekly threads
        </Link>
      </div>

      <ScrollToCurrent className="mt-5">
        <ol data-scroller aria-label="This week" className="relative flex snap-x gap-2 overflow-x-auto pb-2 @3xl:grid @3xl:grid-cols-7 @3xl:overflow-visible @3xl:pb-0">
          {days.map((d) => (
            <DayTile key={d.date} day={d} />
          ))}
        </ol>
      </ScrollToCurrent>
    </section>
  );
}

function DayTile({ day }: { day: RhythmTile }) {
  const today = day.when === "today";
  return (
    <li
      aria-current={today ? "date" : undefined}
      className={cn("flex w-40 shrink-0 snap-start flex-col gap-2 rounded-lg border bg-card p-3 @3xl:w-auto", today && "border-brand bg-brand-soft", day.when === "past" && "bg-card/60")}
    >
      <p className="flex items-baseline justify-between gap-1 text-xs text-muted-foreground">
        <span>
          <span className={cn("font-semibold", today ? "text-brand" : "text-foreground")}>{day.short}</span> {parseYmd(day.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}
        </span>
        {today ? <span className="font-medium text-brand">Today</span> : null}
      </p>
      <p className="text-sm font-semibold leading-snug">{day.theme}</p>

      {day.items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {day.items.map((item) => {
            const thread = day.threads[item.key];
            // "Friday wins" under the heading "Friday wins" would say it twice.
            const same = item.title === day.theme;
            return (
              <li key={item.key} className="text-xs leading-snug @3xl:text-[13px]">
                {thread ? (
                  <>
                    <Link href={urls.topic(thread)} className="line-clamp-3 font-medium text-brand underline-offset-2 hover:underline">
                      {same ? "Join the thread" : item.title}
                    </Link>
                    <span className="block text-muted-foreground">{thread.reply_count === 0 ? "No replies yet" : plural(thread.reply_count, "reply", "replies")}</span>
                  </>
                ) : (
                  <>
                    {same ? null : <span className={cn("line-clamp-3", day.when === "past" && "text-muted-foreground")}>{item.title}</span>}
                    <span className="block text-muted-foreground">{day.when === "past" ? "Not posted" : today ? "Goes up today" : `Goes up ${day.name}`}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      ) : day.calendar ? (
        <p className="text-xs leading-snug @3xl:text-[13px]">
          <Link href="/tools/calendar" className="flex gap-1.5 text-foreground underline-offset-2 hover:underline">
            <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span>
              <span className="line-clamp-3 font-medium">{day.calendar.title}</span>
              <span className="block text-muted-foreground">{day.calendar.onTheDay ? "On the calendar" : `Next up: ${day.calendar.day}, ${day.calendar.when.toLowerCase()}`}</span>
            </span>
          </Link>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">No thread. Catch up on the week.</p>
      )}
    </li>
  );
}

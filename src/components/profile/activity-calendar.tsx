"use client";

import { useId, useState } from "react";
import { activityLevel, describeCounts, type Activity, type ActivityDay } from "@/lib/badges-activity";
import { cn } from "@/lib/utils";

const shade = ["bg-secondary", "bg-brand/25", "bg-brand/50", "bg-brand/75", "bg-primary"] as const;
/* Phones show the most recent half year so each square stays tappable; wider screens show the full year. */
const PHONE_WEEKS = 26;

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
const weekFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "short" });
const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

type Pos = { w: number; d: number };

/*
  A GitHub-style grid: one column per week, Monday at the top, shaded by how
  much the member did that day (topics, replies and pickups). Hover, tap or
  focus the grid and use the arrow keys to read a day; the line under the grid
  says what happened that day and that week. "Show as a table" lists every
  active week for screen readers and anyone who prefers numbers.
*/
export function ActivityCalendar({ activity }: { activity: Activity }) {
  const { weeks, max } = activity;
  const [active, setActive] = useState<Pos | null>(null);
  const captionId = useId();
  const n = weeks.length;
  const firstPhoneWeek = Math.max(0, n - PHONE_WEEKS);

  const activeDay: ActivityDay | null = active ? weeks[active.w].days[active.d] : null;
  const activeWeek = active ? weeks[active.w] : null;

  function move(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const minW = window.matchMedia("(min-width: 640px)").matches ? 0 : firstPhoneWeek;
    const cur = active ?? lastPastDay();
    let { w, d } = cur;
    if (e.key === "ArrowLeft") w--;
    if (e.key === "ArrowRight") w++;
    if (e.key === "ArrowUp") d--;
    if (e.key === "ArrowDown") d++;
    if (e.key === "Home") w = minW;
    if (e.key === "End") return setActive(lastPastDay());
    if (d < 0) {
      d = 6;
      w--;
    }
    if (d > 6) {
      d = 0;
      w++;
    }
    w = Math.min(n - 1, Math.max(minW, w));
    if (weeks[w].days[d].future) return;
    setActive({ w, d });
  }

  function lastPastDay(): Pos {
    const w = n - 1;
    let d = 6;
    while (d > 0 && weeks[w].days[d].future) d--;
    return { w, d };
  }

  return (
    <div>
      <div className="flex gap-1.5">
        {/* Weekday labels, Monday first. Decorative: every day is named in the caption and the table. */}
        <div aria-hidden="true" className="mt-5 grid w-7 shrink-0 grid-rows-7 gap-[3px] text-[10px] leading-none text-muted-foreground">
          {["Mon", "", "Wed", "", "Fri", "", ""].map((l, i) => (
            <span key={i} className="flex items-center">
              {l}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div aria-hidden="true" className="grid h-4 grid-flow-col auto-cols-fr gap-[3px] text-[10px] leading-none text-muted-foreground">
            {weeks.map((wk, i) => {
              const first = i === 0 || wk.start.slice(5, 7) !== weeks[i - 1].start.slice(5, 7);
              return (
                <span key={wk.start} className={cn("overflow-visible whitespace-nowrap", i < firstPhoneWeek && "hidden sm:block")}>
                  {first && i < n - 2 ? monthFmt.format(utc(wk.start)) : ""}
                </span>
              );
            })}
          </div>
          <div
            role="group"
            tabIndex={0}
            aria-label="Activity calendar. Use the arrow keys to move between days."
            aria-describedby={captionId}
            onKeyDown={move}
            onFocus={() => setActive((a) => a ?? lastPastDay())}
            className="mt-1 grid grid-flow-col grid-rows-7 auto-cols-fr gap-[3px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            {weeks.map((wk, w) =>
              wk.days.map((day, d) => {
                const on = active?.w === w && active?.d === d;
                return (
                  <div
                    key={day.date}
                    title={day.future ? undefined : `${dayFmt.format(utc(day.date))}: ${describeCounts(day)}`}
                    onMouseEnter={day.future ? undefined : () => setActive({ w, d })}
                    onClick={day.future ? undefined : () => setActive({ w, d })}
                    className={cn(
                      "aspect-square rounded-[2px]",
                      w < firstPhoneWeek && "hidden sm:block",
                      day.future ? "bg-transparent" : shade[activityLevel(day.total, max)],
                      on && "ring-2 ring-foreground ring-offset-1 ring-offset-background",
                    )}
                  />
                );
              }),
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p id={captionId} aria-live="polite" className="min-h-4">
          {activeDay && activeWeek ? (
            <>
              <strong className="font-medium text-foreground">{dayFmt.format(utc(activeDay.date))}</strong>: {describeCounts(activeDay).toLowerCase().replace(/^no activity$/, "nothing posted")}.{" "}
              Week of {weekFmt.format(utc(activeWeek.start))}: {describeCounts(activeWeek).toLowerCase().replace(/^no activity$/, "nothing posted")}.
            </>
          ) : (
            <>Hover or tap a square to see that day.</>
          )}
        </p>
        <div aria-hidden="true" className="flex items-center gap-1">
          <span className="mr-1">Less</span>
          {shade.map((s) => (
            <span key={s} className={cn("size-2.5 rounded-[2px]", s)} />
          ))}
          <span className="ml-1">More</span>
        </div>
      </div>

      <details className="mt-3 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted-foreground hover:text-foreground sm:min-h-0">Show as a table</summary>
        <ActivityTable activity={activity} />
      </details>
    </div>
  );
}

function ActivityTable({ activity }: { activity: Activity }) {
  const rows = activity.weeks.filter((w) => w.total > 0).reverse();
  if (rows.length === 0) return <p className="mt-2 text-muted-foreground">No topics, replies or pickups in these weeks.</p>;
  return (
    <div className="mt-2 overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">Topics, replies and pickups per week, newest first. Weeks with nothing posted are left out.</caption>
        <thead className="bg-secondary text-left">
          <tr>
            <th scope="col" className="p-2 font-medium">
              Week of
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              Topics
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              Replies
            </th>
            <th scope="col" className="p-2 text-right font-medium">
              Pickups
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((w) => (
            <tr key={w.start}>
              <th scope="row" className="p-2 text-left font-normal">
                {weekFmt.format(utc(w.start))}
              </th>
              <td className="p-2 text-right tabular-nums">{w.topics}</td>
              <td className="p-2 text-right tabular-nums">{w.posts}</td>
              <td className="p-2 text-right tabular-nums">{w.pickups}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

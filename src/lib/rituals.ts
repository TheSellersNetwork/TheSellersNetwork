/*
  Recurring threads. Each ritual is posted by the cron on its weekday from a
  template in content/templates/rituals. Titles carry a fixed prefix so the
  home page cards and the streak function can find them.
    0 Sunday, 1 Monday ... 6 Saturday
*/
export type Ritual = {
  id: string;
  weekday: number;
  titlePrefix: string;
  template: string;
  categorySlug: string;
  /* Pin the newest and unpin the previous one. */
  pin: boolean;
  /* Monthly rituals post on this day of the month instead of a weekday. */
  monthDay?: number;
};

export const rituals: Ritual[] = [
  { id: "numbers", weekday: 1, titlePrefix: "What did you sell this week?", template: "monday-numbers.md", categorySlug: "weekly-threads", pin: true },
  { id: "wwyp", weekday: 3, titlePrefix: "What would you pay?", template: "wednesday-what-would-you-pay.md", categorySlug: "weekly-threads", pin: true },
  { id: "wins", weekday: 5, titlePrefix: "Friday wins", template: "friday-wins.md", categorySlug: "weekly-threads", pin: true },
  { id: "goals", weekday: 1, titlePrefix: "Goals for the week:", template: "monday-goals.md", categorySlug: "diaries-and-challenges", pin: true },
  { id: "monthly", weekday: -1, monthDay: 1, titlePrefix: "Monthly results:", template: "monthly-results.md", categorySlug: "diaries-and-challenges", pin: true },
];

/* Is this ritual due on the given date? */
export function ritualDue(r: Ritual, date: Date): boolean {
  return r.monthDay ? date.getUTCDate() === r.monthDay : r.weekday === date.getUTCDay();
}

export function ritualTitle(r: Ritual, date: Date): string {
  if (r.monthDay) {
    // Results are for the month that has just ended.
    const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
    return `${r.titlePrefix} ${last.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })}`;
  }
  const when = date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${r.titlePrefix} Week of ${when}`;
}

export const WEEKLY_THREADS_SLUG = "weekly-threads";

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
};

export const rituals: Ritual[] = [
  { id: "numbers", weekday: 1, titlePrefix: "What did you sell this week?", template: "monday-numbers.md", categorySlug: "weekly-threads", pin: true },
  { id: "wwyp", weekday: 3, titlePrefix: "What would you pay?", template: "wednesday-what-would-you-pay.md", categorySlug: "weekly-threads", pin: true },
  { id: "wins", weekday: 5, titlePrefix: "Friday wins", template: "friday-wins.md", categorySlug: "weekly-threads", pin: true },
];

export function ritualTitle(r: Ritual, date: Date): string {
  const when = date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  return `${r.titlePrefix} Week of ${when}`;
}

export const WEEKLY_THREADS_SLUG = "weekly-threads";

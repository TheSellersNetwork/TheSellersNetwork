/*
  Scheduled blog posts. A post goes live on its `published` date, where the
  date is read in UK time (Europe/London), so a post dated 30 September appears
  at midnight UK time on 30 September whether or not the clocks have gone back.
  Pure functions, no server imports, so scripts and tests can use them.
*/

const ukFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" });

/* The UK calendar date of an instant, as YYYY-MM-DD. */
export function ukDate(instant: Date): string {
  return ukFormatter.format(instant);
}

/*
  The UK date a post is published on. A date-only value ("2026-09-30", which
  the frontmatter parser turns into UTC midnight) keeps its calendar date; a
  full timestamp is read in UK time.
*/
export function publishedUkDate(published: string | Date): string | null {
  if (typeof published === "string" && /^\d{4}-\d{2}-\d{2}$/.test(published)) return published;
  const d = published instanceof Date ? published : new Date(published);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0) {
    return d.toISOString().slice(0, 10);
  }
  return ukDate(d);
}

/* True once the post's UK publish date has arrived. Drafts (no date) and unreadable dates are never live. */
export function isLive(published: string | Date | null | undefined, now: Date = new Date()): boolean {
  if (!published) return false;
  const day = publishedUkDate(published);
  return day !== null && day <= ukDate(now);
}

/* Dated, but not live yet. */
export function isScheduled(published: string | Date | null | undefined, now: Date = new Date()): boolean {
  return !!published && publishedUkDate(published) !== null && !isLive(published, now);
}

/* Staff preview scheduled posts and drafts outside production. */
export function showUnpublished(): boolean {
  return process.env.NODE_ENV !== "production";
}

/*
  Profile milestones: self-declared moments a member chooses to share, such
  as a 100th sale. The rules here match the database constraints in
  migration 20260930000200 so the form can explain a problem before saving.
*/

export const MILESTONE_MAX = 10;
export const MILESTONE_LABEL_MAX = 60;

/* Suggestions offered in the form. Members can type anything else. */
export const milestoneSuggestions = [
  "First sale",
  "100th sale",
  "1,000th sale",
  "1 year reselling",
  "First Amazon order",
  "First Vinted sale",
  "Went full time",
  "Registered as a business",
] as const;

export type Milestone = { id: string; label: string; happened_on: string };

/* Today's date in the UK as YYYY-MM-DD. */
export function ukToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function validateMilestone(label: string, date: string, today: string = ukToday()): string | null {
  const text = label.trim();
  if (text.length < 2) return "Say what the milestone was.";
  if (text.length > MILESTONE_LABEL_MAX) return `Milestones are at most ${MILESTONE_LABEL_MAX} characters.`;
  if (/(https?:\/\/|www\.)/i.test(text)) return "No links please.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00Z`))) return "Pick a date.";
  if (date < "1990-01-01") return "Pick a date after 1990.";
  if (date > today) return "Pick a date that has already happened.";
  return null;
}

/* "12 March 2025" for a YYYY-MM-DD date. */
export function milestoneDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/* Newest first; the same day keeps the order they were added. */
export function sortMilestones<T extends Milestone>(items: T[]): T[] {
  return [...items].sort((a, b) => b.happened_on.localeCompare(a.happened_on));
}

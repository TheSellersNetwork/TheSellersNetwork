/*
  Topic status labels, derived from columns topics already have. Pure, so the
  list, the topic page and the tests agree on one rule:
    Solved   has an accepted answer (wins over everything, even when locked)
    Closed   locked and not solved
    Answered at least one reply
    Open     no replies yet
*/

export type TopicStatus = "open" | "answered" | "solved" | "closed";

export const TOPIC_STATUSES: TopicStatus[] = ["open", "answered", "solved", "closed"];

export const statusLabels: Record<TopicStatus, string> = {
  open: "Open",
  answered: "Answered",
  solved: "Solved",
  closed: "Closed",
};

/* What each status means, for the filter's accessible description and tooltips. */
export const statusHints: Record<TopicStatus, string> = {
  open: "No replies yet",
  answered: "Has at least one reply",
  solved: "Has an accepted answer",
  closed: "Locked, no new replies",
};

type StatusFields = { reply_count: number; is_solved: boolean; is_locked: boolean };

export function topicStatus(t: StatusFields): TopicStatus {
  if (t.is_solved) return "solved";
  if (t.is_locked) return "closed";
  return t.reply_count > 0 ? "answered" : "open";
}

/* Reads ?status= from a URL. Anything unknown means no filter. */
export function parseStatus(value: unknown): TopicStatus | null {
  return typeof value === "string" && (TOPIC_STATUSES as string[]).includes(value) ? (value as TopicStatus) : null;
}

/*
  The same rule as topicStatus, as column filters for a query builder, so a
  filtered list only ever shows topics whose chip matches the filter.
*/
export type StatusFilter = { column: "is_solved" | "is_locked" | "reply_count"; op: "eq" | "gt"; value: boolean | number }[];

export function statusFilter(status: TopicStatus): StatusFilter {
  switch (status) {
    case "solved":
      return [{ column: "is_solved", op: "eq", value: true }];
    case "closed":
      return [
        { column: "is_solved", op: "eq", value: false },
        { column: "is_locked", op: "eq", value: true },
      ];
    case "answered":
      return [
        { column: "is_solved", op: "eq", value: false },
        { column: "is_locked", op: "eq", value: false },
        { column: "reply_count", op: "gt", value: 0 },
      ];
    case "open":
      return [
        { column: "is_solved", op: "eq", value: false },
        { column: "is_locked", op: "eq", value: false },
        { column: "reply_count", op: "eq", value: 0 },
      ];
  }
}

/* Adds or replaces ?status= on a list URL, dropping the cursor so the filtered list starts at the top. */
export function withStatus(href: string, status: TopicStatus | null): string {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.delete("cursor");
  if (status) params.set("status", status);
  else params.delete("status");
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

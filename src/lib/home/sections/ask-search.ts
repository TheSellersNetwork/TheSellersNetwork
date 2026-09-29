/*
  "Search before you ask": the pure half. Results come in groups (tools,
  guides and posts, forum threads) and the home page shows at most five in
  all, shared out so every group with a match gets a place before any group
  gets a second. No React imports, so the unit tests can use it.
*/

export type AskResult = { href: string; title: string; meta: string; solved?: boolean };
export type AskGroup = { id: string; label: string; results: AskResult[] };

export const ASK_LIMIT = 5;

/* Groups trimmed to `limit` results in all, taking one from each group in turn. Empty groups are dropped. */
export function shareOut(groups: AskGroup[], limit = ASK_LIMIT): AskGroup[] {
  const taken = groups.map(() => 0);
  let total = 0;
  let progressed = true;
  while (total < limit && progressed) {
    progressed = false;
    for (let g = 0; g < groups.length && total < limit; g += 1) {
      if (taken[g] < groups[g].results.length) {
        taken[g] += 1;
        total += 1;
        progressed = true;
      }
    }
  }
  return groups.map((g, i) => ({ ...g, results: g.results.slice(0, taken[i]) })).filter((g) => g.results.length > 0);
}

/* The rows in keyboard order, with the "ask the community" row last. */
export function flatRows(groups: AskGroup[]): { key: string; href: string | null }[] {
  return [...groups.flatMap((g) => g.results.map((r) => ({ key: `${g.id}:${r.href}`, href: r.href }))), { key: "ask", href: null }];
}

/* The highlighted row after an arrow key, wrapping at both ends. */
export function moveActive(current: number, count: number, key: "ArrowDown" | "ArrowUp"): number {
  if (count <= 0) return -1;
  if (current < 0) return key === "ArrowDown" ? 0 : count - 1;
  return key === "ArrowDown" ? (current + 1) % count : (current - 1 + count) % count;
}

/*
  Sorting and "Our pick" matching for markdown tables in posts. Pure, so the
  client table component and the unit tests share it.
*/

/*
  The number a cell sorts by: the first number in it, ignoring £, $, €, %,
  commas and a leading "from". "Free" and "None" count as 0. Null when the
  cell has no number (a dash, "Not published", "Varies").
*/
export function sortNumber(text: string): number | null {
  const t = text.trim();
  if (/^(free|none|nil|£0\b)/i.test(t)) return 0;
  const m = /(-?)\s*[£$€]?\s*(\d[\d,]*(?:\.\d+)?)/.exec(t);
  if (!m) return null;
  const n = Number(m[2].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  return m[1] === "-" ? -n : n;
}

/* A column sorts as numbers when most of its filled cells hold one. */
export function isNumericColumn(values: string[]): boolean {
  const filled = values.map((v) => v.trim()).filter((v) => v && !/^[-–—]$/.test(v));
  if (filled.length === 0) return false;
  const numeric = filled.filter((v) => sortNumber(v) !== null).length;
  return numeric / filled.length >= 0.6;
}

export type SortDirection = "ascending" | "descending";

/*
  Row order for a column. Stable: equal values keep their original order.
  Cells with no value sort last in both directions.
*/
export function sortRowIndexes(values: string[], direction: SortDirection): number[] {
  const numeric = isNumericColumn(values);
  const collator = new Intl.Collator("en-GB", { numeric: true, sensitivity: "base" });
  const sign = direction === "ascending" ? 1 : -1;
  const keyed = values.map((v, i) => ({ i, text: v.trim(), num: numeric ? sortNumber(v) : null }));
  const empty = (k: (typeof keyed)[number]) => (numeric ? k.num === null : k.text === "" || /^[-–—]$/.test(k.text));
  return keyed
    .sort((a, b) => {
      const ea = empty(a);
      const eb = empty(b);
      if (ea !== eb) return ea ? 1 : -1;
      if (ea && eb) return a.i - b.i;
      const c = numeric ? (a.num as number) - (b.num as number) : collator.compare(a.text, b.text);
      return c !== 0 ? c * sign : a.i - b.i;
    })
    .map((k) => k.i);
}

/*
  Whether a row's first cell names the post's pick: it starts with the pick,
  ignoring case, and the pick ends at a word boundary ("eBay" matches
  "eBay (business)" but "Tide" would not match "Tidewater").
*/
export function isPickedRow(firstCell: string, picks: string[]): boolean {
  const cell = firstCell.trim().toLowerCase();
  return picks.some((p) => {
    const pick = p.trim().toLowerCase();
    if (!pick || !cell.startsWith(pick)) return false;
    const next = cell.charAt(pick.length);
    return next === "" || !/[a-z0-9]/.test(next);
  });
}

/*
  Sold comps summariser. The seller pastes sold prices they found themselves
  (eBay's sold filter, Vinted, anywhere) and we pull out the pound amounts.
  Nothing is fetched from any platform.

  What counts as a price:
  - Any amount with a pound sign or "GBP": "£12", "£1,234.56", "GBP 20".
  - A plain number with pence, like "12.50".
  - A line that is only a number, like "12".
  - The second half of a range after a pound amount: "£10 to £15", "£10-15".
  What is left out:
  - Postage: an amount with "+" in front of it (eBay shows "+£3.20 postage"),
    an amount straight after or straight before the words postage, P&P,
    delivery or shipping ("Postage: £3.20", "£3.20 P&P"), or the only amount on
    a line that mentions one of those words. "Free postage" is not an amount.
  - Plain whole numbers in running text ("size 10", "3 bids", dates), because
    they are rarely prices.
*/

export type Found = { value: number; line: number; text: string };
export type Ignored = { text: string; line: number; reason: string };

const POSTAGE = /\b(postage|p\s*&\s*p|p\s*and\s*p|delivery|shipping)\b/i;
const POSTAGE_BEFORE = /\b(postage|p\s*&\s*p|p\s*and\s*p|delivery|shipping)\s*(cost|costs|price|fee|charge)?\s*(:|-|of|was|is|=)?\s*$/i;
const POSTAGE_AFTER = /^\s*[:)]?\s*(postage|p\s*&\s*p|p\s*and\s*p|delivery|shipping)\b/i;
const AMOUNT = /(\+\s*)?(?:(£|gbp)\s?)?(?<![\d.,])(\d{1,3}(?:,\d{3})+|\d+)(\.\d{1,2})?(?![\d.,]*\d)/gi;

export function parsePrices(text: string): { values: Found[]; ignored: Ignored[] } {
  const values: Found[] = [];
  const ignored: Ignored[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.replace(/\bfree\s+(postage|p\s*&\s*p|delivery|shipping)\b/gi, " ");
    const trimmed = line.trim();
    if (!trimmed) return;
    const matches = [...line.matchAll(AMOUNT)];
    let prevAcceptedEnd = -1;
    matches.forEach((m, j) => {
      const start = m.index ?? 0;
      const end = start + m[0].length;
      const before = line.slice(j === 0 ? 0 : (matches[j - 1].index ?? 0) + matches[j - 1][0].length, start);
      const after = line.slice(end, j + 1 < matches.length ? matches[j + 1].index : line.length);
      const hasPound = Boolean(m[2]);
      const hasPence = Boolean(m[4]) && m[4].length === 3;
      const alone = /^(£|gbp)?\s*[\d,]+(\.\d{1,2})?$/i.test(trimmed);
      // Part of a word or code, like "x2", "v1" or "A4".
      const glued = /[a-z]$/i.test(line.slice(0, start)) && !hasPound;
      const range = prevAcceptedEnd >= 0 && /^\s*(-|\u2013|to)\s*$/i.test(line.slice(prevAcceptedEnd, start));
      const text = m[0].trim();
      if (glued || !(hasPound || hasPence || alone || range)) return;
      if (/^\s*%/.test(after)) return;
      if (m[1]) {
        ignored.push({ text, line: i + 1, reason: "Has a plus sign in front, so it looks like postage" });
        return;
      }
      const postageBefore = POSTAGE_BEFORE.test(before);
      const postageAfter = POSTAGE_AFTER.test(after);
      if (postageBefore || postageAfter || (matches.length === 1 && POSTAGE.test(line))) {
        ignored.push({ text, line: i + 1, reason: "Next to the word postage, P&P, delivery or shipping" });
        return;
      }
      const value = Number(`${m[3].replace(/,/g, "")}${m[4] ?? ""}`);
      if (!Number.isFinite(value) || value <= 0) return;
      values.push({ value, line: i + 1, text });
      prevAcceptedEnd = end;
    });
  });
  return { values, ignored };
}

/* Quantile with linear interpolation between the nearest ranks (the same as Excel's QUARTILE.INC). */
export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type Summary = { count: number; min: number; q1: number; median: number; q3: number; max: number; mean: number };

export function summarise(values: number[]): Summary | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    count: s.length,
    min: s[0],
    q1: r2(quantile(s, 0.25)),
    median: r2(quantile(s, 0.5)),
    q3: r2(quantile(s, 0.75)),
    max: s[s.length - 1],
    mean: r2(s.reduce((t, x) => t + x, 0) / s.length),
  };
}

/* Values far outside the middle half (1.5 times the spread between the quartiles), a common rule of thumb for outliers. */
export function outliers(values: number[]): Set<number> {
  const s = summarise(values);
  if (!s || s.count < 4) return new Set();
  const spread = s.q3 - s.q1;
  return new Set(values.filter((v) => v < s.q1 - 1.5 * spread || v > s.q3 + 1.5 * spread));
}

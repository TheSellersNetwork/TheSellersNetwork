/*
  The instant half of site search: a small index of tools, guides and blog
  posts, built on the server (/api/search/catalogue) and ranked in the browser
  as you type. Forum threads come from the database separately. Pure, so unit
  tests can use it.
*/

export type IndexKind = "tool" | "guide" | "post";

export type IndexEntry = {
  kind: IndexKind;
  title: string;
  href: string;
  /* Description or excerpt, already clipped. */
  text: string;
  /* Short type label, such as "Guide" or "Comparison". */
  label: string;
  /* Extra words to match on, such as the tools inside a tool page. */
  keywords?: string;
};

export type SearchCatalogue = { entries: IndexEntry[] };

/* A forum thread from /api/search. */
export type ForumHit = { title: string; href: string; forum: string | null; replies: number; solved: boolean };

/* Lower case, accents removed, anything but letters and digits turned into spaces. */
export function normalise(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9£]+/g, " ")
    .trim();
}

export function tokens(q: string): string[] {
  return normalise(q).split(" ").filter(Boolean).slice(0, 8);
}

/* Words that on their own would match nearly everything. They still count when other words match. */
const STOP = new Set(["a", "an", "and", "the", "to", "of", "on", "in", "for", "is", "it", "my", "i", "how", "what", "do"]);

/*
  A score for one entry, or 0 when it does not match. Every meaningful word of
  the query must appear somewhere; title matches (especially at the start of a
  word) count most, then keywords, then the description.
*/
export function score(entry: IndexEntry, words: string[]): number {
  if (words.length === 0) return 0;
  const title = ` ${normalise(entry.title)}`;
  const keywords = ` ${normalise(entry.keywords ?? "")}`;
  const text = ` ${normalise(entry.text)}`;
  let total = 0;
  let meaningful = 0;
  for (const w of words) {
    const stop = STOP.has(w) && words.length > 1;
    let s = 0;
    if (title.includes(` ${w}`)) s = 10;
    else if (title.includes(w)) s = 6;
    else if (keywords.includes(` ${w}`)) s = 5;
    else if (text.includes(` ${w}`)) s = 3;
    else if (keywords.includes(w) || text.includes(w)) s = 1;
    if (s === 0 && !stop) return 0;
    if (!stop) meaningful += 1;
    total += s;
  }
  if (meaningful === 0) return 0;
  const phrase = words.join(" ");
  if (title.startsWith(` ${phrase}`)) total += 12;
  else if (title.includes(phrase)) total += 6;
  return total;
}

/* The best matches of the given kinds, highest score first, ties in index order. */
export function search(entries: IndexEntry[], query: string, kinds: IndexKind | IndexKind[], limit: number): IndexEntry[] {
  const words = tokens(query);
  if (words.length === 0) return [];
  const wanted = new Set(Array.isArray(kinds) ? kinds : [kinds]);
  return entries
    .map((e, i) => ({ e, i, s: wanted.has(e.kind) ? score(e, words) : 0 }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, limit)
    .map((r) => r.e);
}

/* Recent searches, newest first, without repeats (ignoring case), at most `max`. */
export function addRecent(list: string[], query: string, max = 5): string[] {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 80);
  if (q.length < 2) return list.slice(0, max);
  return [q, ...list.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, max);
}

/* Reads the stored recent searches, ignoring anything malformed. */
export function parseRecent(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string" && s.length > 0).slice(0, 5) : [];
  } catch {
    return [];
  }
}

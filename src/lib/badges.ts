/*
  Badges. Every badge is worked out from real rows (profiles, pickups and the
  weekly numbers threads), never granted by hand, so these rules are the whole
  story. Pure functions only: the queries live in badges-queries.ts.
*/

export type BadgeId = "founding" | "first-solution" | "helper" | "streak-4" | "streak-12" | "first-pickup" | "first-sold" | "sharp-eye" | "team";

export type BadgeDef = {
  id: BadgeId;
  name: string;
  /* How it is earned, in one sentence. Shown on /community/badges and in tooltips. */
  rule: string;
};

export const HELPER_SOLUTIONS = 10;
export const SHARP_EYE_MULTIPLE = 10;

export const badges: readonly BadgeDef[] = [
  { id: "founding", name: "Founding member", rule: "Joined in the forum's first months." },
  { id: "first-solution", name: "First solved answer", rule: "Had a reply marked as the answer to someone's question." },
  { id: "helper", name: "Helper", rule: `Had ${HELPER_SOLUTIONS} or more replies marked as the answer.` },
  { id: "streak-4", name: "4-week streak", rule: "Posted in the weekly numbers thread four weeks in a row." },
  { id: "streak-12", name: "12-week streak", rule: "Posted in the weekly numbers thread twelve weeks in a row." },
  { id: "first-pickup", name: "First pickup", rule: "Shared a pickup: what they found, where and what they paid." },
  { id: "first-sold", name: "First pickup sold", rule: "Added the sold price to one of their pickups." },
  { id: "sharp-eye", name: "Sharp eye", rule: `Sold a pickup for ${SHARP_EYE_MULTIPLE} times what they paid or more.` },
  { id: "team", name: "Team", rule: "Runs or moderates The Sellers Network." },
] as const;

export const badgeById = new Map(badges.map((b) => [b.id, b]));

export type BadgeFacts = {
  createdAt: string | null;
  isStaff: boolean;
  solutionCount: number;
  /* Longest run of consecutive weekly numbers threads posted in. */
  longestStreak: number;
  pickups: number;
  soldPickups: number;
  /* Best sold price divided by price paid, over pickups with a price paid above zero. */
  bestMultiple: number | null;
};

/* Joined on or before the founding date. Staff are left out: they have Team. Mirrors isFoundingMember in lib/format. */
export function isFounding(createdAt: string | null, isStaff: boolean, foundingUntil: string): boolean {
  if (!createdAt || isStaff) return false;
  return createdAt.slice(0, 10) <= foundingUntil;
}

export function earnedBadges(f: BadgeFacts, foundingUntil: string): BadgeId[] {
  const out: BadgeId[] = [];
  if (f.isStaff) out.push("team");
  if (isFounding(f.createdAt, f.isStaff, foundingUntil)) out.push("founding");
  if (f.solutionCount >= 1) out.push("first-solution");
  if (f.solutionCount >= HELPER_SOLUTIONS) out.push("helper");
  if (f.longestStreak >= 4) out.push("streak-4");
  if (f.longestStreak >= 12) out.push("streak-12");
  if (f.pickups >= 1) out.push("first-pickup");
  if (f.soldPickups >= 1) out.push("first-sold");
  if (f.bestMultiple !== null && f.bestMultiple >= SHARP_EYE_MULTIPLE) out.push("sharp-eye");
  // Keep the display order of the badges list.
  return badges.map((b) => b.id).filter((id) => out.includes(id));
}

/* Sold price over price paid, or null when either is missing or nothing was paid. */
export function pickupMultiple(paid: number | string | null, sold: number | string | null): number | null {
  if (paid === null || sold === null) return null;
  const p = Number(paid);
  const s = Number(sold);
  if (!(p > 0) || !Number.isFinite(s)) return null;
  return s / p;
}

/*
  Monday of the week an instant falls in, as YYYY-MM-DD in UTC. Matches
  date_trunc('week', created_at) in the numbers_streak database function.
*/
export function weekStartUTC(iso: string): string {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/* Longest run of consecutive weeks, given the Monday of each week posted in (any order, duplicates allowed). */
export function longestWeeklyStreak(weekStarts: string[]): number {
  const days = [...new Set(weekStarts)].map((w) => Date.parse(`${w}T00:00:00Z`) / 86_400_000).sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] - days[i - 1] === 7 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/* Pickup facts for one member from their pickup rows. */
export function pickupFacts(rows: { paid: number | string | null; sold_price: number | string | null }[]): Pick<BadgeFacts, "pickups" | "soldPickups" | "bestMultiple"> {
  let sold = 0;
  let best: number | null = null;
  for (const r of rows) {
    if (r.sold_price !== null) sold++;
    const m = pickupMultiple(r.paid, r.sold_price);
    if (m !== null && (best === null || m > best)) best = m;
  }
  return { pickups: rows.length, soldPickups: sold, bestMultiple: best };
}

/*
  How many members hold each pickup and streak badge, from every pickup row and
  every numbers thread reply. Profile-based badges are counted in the database.
*/
export function countActivityHolders(
  pickups: { user_id: string; paid: number | string | null; sold_price: number | string | null }[],
  numbersPosts: { author_id: string; created_at: string }[],
  exclude: ReadonlySet<string> = new Set(),
): Record<"first-pickup" | "first-sold" | "sharp-eye" | "streak-4" | "streak-12", number> {
  const byUser = new Map<string, typeof pickups>();
  for (const p of pickups) {
    if (exclude.has(p.user_id)) continue;
    const list = byUser.get(p.user_id) ?? [];
    list.push(p);
    byUser.set(p.user_id, list);
  }
  let first = 0;
  let sold = 0;
  let sharp = 0;
  for (const rows of byUser.values()) {
    const f = pickupFacts(rows);
    if (f.pickups >= 1) first++;
    if (f.soldPickups >= 1) sold++;
    if (f.bestMultiple !== null && f.bestMultiple >= SHARP_EYE_MULTIPLE) sharp++;
  }
  const weeks = new Map<string, string[]>();
  for (const p of numbersPosts) {
    if (exclude.has(p.author_id)) continue;
    const list = weeks.get(p.author_id) ?? [];
    list.push(weekStartUTC(p.created_at));
    weeks.set(p.author_id, list);
  }
  let s4 = 0;
  let s12 = 0;
  for (const list of weeks.values()) {
    const n = longestWeeklyStreak(list);
    if (n >= 4) s4++;
    if (n >= 12) s12++;
  }
  return { "first-pickup": first, "first-sold": sold, "sharp-eye": sharp, "streak-4": s4, "streak-12": s12 };
}

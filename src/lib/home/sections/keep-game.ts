/*
  "Where would you keep more?": the pure half of the home page game. A small
  list of example items (not real sales), a random round of four platforms
  that suit the item, and the reveal worked out with the site's fee engine.
  No React or server imports, so the unit tests can use it.
*/

import { calculate, feeData, platforms as allPlatforms, type PlatformId, type Result } from "@/lib/tools/fees";
import { sharedQuery } from "@/lib/og/calculator-share";

export type GamePlatform = Extract<PlatformId, "ebay_business" | "vinted" | "depop" | "etsy" | "whatnot" | "amazon_fbm">;

export const gamePlatformNames: Record<GamePlatform, string> = {
  ebay_business: "eBay",
  vinted: "Vinted",
  depop: "Depop",
  etsy: "Etsy",
  whatnot: "Whatnot",
  amazon_fbm: "Amazon (you post it)",
};

export type GameItem = {
  /* "a Barbour wax jacket", read in "You sell a Barbour wax jacket for £35". */
  phrase: string;
  price: number;
  cost: number;
  /* An id from content/fees.json ebayBusiness.categories. */
  ebayCategory: string;
  /* An id from content/fees.json amazon.referral, for items that have an Amazon listing. */
  amazonCategory?: string;
  /* Where the item would sensibly sell. Etsy only for vintage items (20 years or older). */
  platforms: GamePlatform[];
};

/* Example items. Every one lists at least four platforms. */
export const gameItems: GameItem[] = [
  { phrase: "a Barbour wax jacket", price: 35, cost: 6, ebayCategory: "clothing", platforms: ["ebay_business", "vinted", "depop", "whatnot"] },
  { phrase: "a 1980s Levi's denim jacket", price: 45, cost: 8, ebayCategory: "clothing", platforms: ["ebay_business", "vinted", "depop", "etsy", "whatnot"] },
  { phrase: "a pair of Nike Air Max 90 trainers", price: 60, cost: 15, ebayCategory: "trainers", platforms: ["ebay_business", "vinted", "depop", "whatnot"] },
  { phrase: "a sealed LEGO Star Wars set", price: 40, cost: 22, ebayCategory: "general", amazonCategory: "toys", platforms: ["ebay_business", "vinted", "whatnot", "amazon_fbm"] },
  { phrase: "a hardback cookbook", price: 8, cost: 1, ebayCategory: "media", amazonCategory: "books", platforms: ["ebay_business", "vinted", "amazon_fbm", "whatnot"] },
  { phrase: "a Nintendo Switch game", price: 25, cost: 10, ebayCategory: "media", amazonCategory: "games", platforms: ["ebay_business", "vinted", "amazon_fbm", "whatnot"] },
  { phrase: "a vintage Pyrex casserole dish", price: 22, cost: 3, ebayCategory: "home", platforms: ["ebay_business", "vinted", "etsy", "depop"] },
  { phrase: "a Coach leather handbag", price: 55, cost: 12, ebayCategory: "handbags", platforms: ["ebay_business", "vinted", "depop", "whatnot"] },
  { phrase: "a 1970s table lamp", price: 30, cost: 5, ebayCategory: "home", platforms: ["ebay_business", "vinted", "etsy", "depop"] },
  { phrase: "a single holo Pokémon card", price: 18, cost: 4, ebayCategory: "general", platforms: ["ebay_business", "vinted", "whatnot", "depop"] },
  { phrase: "a vintage silver charm bracelet", price: 28, cost: 6, ebayCategory: "jewellery", platforms: ["ebay_business", "vinted", "depop", "etsy", "whatnot"] },
  { phrase: "a Stone Island jumper", price: 70, cost: 20, ebayCategory: "clothing", platforms: ["ebay_business", "vinted", "depop", "whatnot"] },
  { phrase: "a pair of boxed Bluetooth headphones", price: 45, cost: 18, ebayCategory: "media", amazonCategory: "electronics", platforms: ["ebay_business", "vinted", "amazon_fbm", "depop"] },
  { phrase: "a 1990s football shirt", price: 40, cost: 7, ebayCategory: "clothing", platforms: ["ebay_business", "vinted", "depop", "etsy", "whatnot"] },
];

export type Round = { item: GameItem; options: GamePlatform[] };

/* A random rng-driven shuffle (Fisher-Yates), leaving the input alone. */
function shuffle<T>(list: readonly T[], rng: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* A random item and four of its platforms in random order. `avoid` skips the item just played. */
export function pickRound(rng: () => number = Math.random, avoid?: GameItem): Round {
  const pool = avoid && gameItems.length > 1 ? gameItems.filter((i) => i !== avoid) : gameItems;
  const item = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
  return { item, options: shuffle(item.platforms, rng).slice(0, 4) };
}

export type RevealRow = { platform: GamePlatform; name: string; fees: number; keep: number; profit: number; best: boolean };

/*
  Postage is left out: the buyer pays it, so it does not change the answer
  on most platforms. "You keep" is what reaches you after fees.
*/
export function resultFor(item: GameItem, platform: GamePlatform): Result {
  return calculate(platform, { price: item.price, postageCharged: 0, postageCost: 0, itemCost: item.cost, ebayCategory: item.ebayCategory, amazonCategory: item.amazonCategory });
}

/* Every option, most kept first. Ties for the top all count as best. */
export function reveal(round: Round): RevealRow[] {
  const rows = round.options.map((platform) => {
    const r = resultFor(round.item, platform);
    return { platform, name: gamePlatformNames[platform], fees: r.fees, keep: r.youReceive, profit: r.profit, best: false };
  });
  rows.sort((a, b) => b.keep - a.keep || a.name.localeCompare(b.name));
  const top = rows[0]?.keep ?? 0;
  return rows.map((r) => ({ ...r, best: r.keep === top }));
}

export const money = (n: number) => n.toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: n % 1 === 0 ? 0 : 2 });

/* One line on why the winner came out on top, from the fee figures. */
export function whyLine(rows: RevealRow[]): string {
  const winner = rows[0];
  if (!winner) return "";
  const runnerUp = rows.find((r) => !r.best);
  if (winner.platform === "vinted") return "Vinted charges the seller nothing; the buyer pays the fee.";
  if (winner.platform === "depop") return `Depop only charges payment processing (${feeData.depop.processingPercent}% plus ${Math.round(feeData.depop.processingFixed * 100)}p); buyers pay its marketplace fee.`;
  const lead = `${winner.name} takes ${money(winner.fees)} in fees on this sale`;
  return runnerUp ? `${lead}, leaving you ${money(Math.round((winner.keep - runnerUp.keep) * 100) / 100)} more than ${runnerUp.name}.` : `${lead}.`;
}

export function isCorrect(rows: RevealRow[], guess: GamePlatform): boolean {
  return rows.some((r) => r.platform === guess && r.best);
}

/* The calculator's "compare every platform" view with this item's figures. */
export function calculatorHref(item: GameItem): string {
  return `/tools/calculator?${sharedQuery({ price: item.price, postage: 0, postageCost: 0, cost: item.cost, category: item.ebayCategory === "general" ? null : item.ebayCategory, noVat: false })}`;
}

/* The platform's caveat from the fee engine (Vinted Pro, Etsy vintage only), if it has one. */
export function platformNote(platform: GamePlatform): string | null {
  return allPlatforms.find((p) => p.id === platform)?.note ?? null;
}

/* The stored streak. Anything that is not a positive whole number counts as 0. */
export function parseStreak(stored: string | null): number {
  const n = Number(stored);
  return Number.isInteger(n) && n > 0 ? n : 0;
}

/* The streak after a guess. */
export function nextStreak(stored: string | null, correct: boolean): number {
  return correct ? parseStreak(stored) + 1 : 0;
}

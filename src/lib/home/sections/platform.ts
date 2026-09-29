/*
  "I sell on..." for the home page. The visitor picks a platform once and the
  home page leads with it. The choice is kept in a first-party cookie: a
  functional preference, never used for tracking, so it needs no consent.

  Pure helpers only, so the client switcher and the unit tests can import
  this file. The server reader is getHomePlatform() in platform-server.ts.
*/

export const HOME_PLATFORMS = [
  { id: "all", label: "All" },
  { id: "ebay", label: "eBay" },
  { id: "vinted", label: "Vinted" },
  { id: "amazon", label: "Amazon" },
  { id: "sourcing", label: "Car boots" },
] as const;

export type HomePlatform = (typeof HOME_PLATFORMS)[number]["id"];
/* A real platform, not "all". */
export type ChosenPlatform = Exclude<HomePlatform, "all">;

export const HOME_PLATFORM_COOKIE = "tsn-home-platform";
export const HOME_PLATFORM_MAX_AGE = 60 * 60 * 24 * 365;

export function isHomePlatform(value: unknown): value is HomePlatform {
  return typeof value === "string" && HOME_PLATFORMS.some((p) => p.id === value);
}

/* Anything unknown or missing reads as "all". */
export function parseHomePlatform(value: string | null | undefined): HomePlatform {
  return isHomePlatform(value) ? value : "all";
}

export function homePlatformLabel(platform: HomePlatform): string {
  return HOME_PLATFORMS.find((p) => p.id === platform)?.label ?? "All";
}

/* The document.cookie string that stores the choice for a year. "all" clears it. */
export function homePlatformCookie(platform: HomePlatform, secure = false): string {
  const base = `${HOME_PLATFORM_COOKIE}=${platform === "all" ? "" : platform}; Path=/; SameSite=Lax`;
  const age = platform === "all" ? "; Max-Age=0" : `; Max-Age=${HOME_PLATFORM_MAX_AGE}`;
  return `${base}${age}${secure ? "; Secure" : ""}`;
}

/*
  Items for the chosen platform first, everything else after, each part in
  its original order. With "all" the list comes back unchanged.
*/
export function orderByPlatform<T>(items: readonly T[], platform: HomePlatform, getPlatforms: (item: T) => readonly string[]): T[] {
  if (platform === "all") return [...items];
  const first: T[] = [];
  const rest: T[] = [];
  for (const item of items) (getPlatforms(item).includes(platform) ? first : rest).push(item);
  return [...first, ...rest];
}

/* Only the items for the chosen platform. With "all", or when nothing matches, the whole list. */
export function filterByPlatform<T>(items: readonly T[], platform: HomePlatform, getPlatforms: (item: T) => readonly string[]): T[] {
  if (platform === "all") return [...items];
  const matched = items.filter((item) => getPlatforms(item).includes(platform));
  return matched.length > 0 ? matched : [...items];
}

/* The Start here tab to open first. Null means keep the default. */
export function startTabForPlatform(platform: HomePlatform): "ebay" | "amazon" | "vinted" | "sourcing" | null {
  return platform === "all" ? null : platform;
}

/*
  Forum categories for each platform. A root's children count too (eBay and
  Amazon have sub-forums), matched by parent when the category list is known
  and by slug prefix otherwise.
*/
const forumRoots: Record<ChosenPlatform, { roots: string[]; prefix: string | null; extra: string[] }> = {
  ebay: { roots: ["ebay"], prefix: "ebay-", extra: [] },
  vinted: { roots: ["vinted"], prefix: null, extra: [] },
  amazon: { roots: ["amazon"], prefix: "amazon-", extra: [] },
  sourcing: { roots: ["sourcing-and-stock"], prefix: null, extra: ["real-or-fake"] },
};

/* Does a forum category slug belong to the platform? Children are matched by prefix. */
export function categoryMatchesPlatform(slug: string, platform: HomePlatform): boolean {
  if (platform === "all") return true;
  const f = forumRoots[platform];
  return f.roots.includes(slug) || f.extra.includes(slug) || (f.prefix !== null && slug.startsWith(f.prefix));
}

type CategoryLike = { id: string; slug: string; parent_id: string | null };

/*
  Every forum slug for the platform. Pass the category list (getCategories)
  to include children by parent; without it, the slug rules alone apply.
  Empty for "all".
*/
export function platformCategorySlugs(platform: HomePlatform, categories: readonly CategoryLike[] = []): string[] {
  if (platform === "all") return [];
  const f = forumRoots[platform];
  const out = new Set<string>([...f.roots, ...f.extra]);
  const rootIds = new Set(categories.filter((c) => f.roots.includes(c.slug)).map((c) => c.id));
  for (const c of categories) {
    if ((c.parent_id && rootIds.has(c.parent_id)) || categoryMatchesPlatform(c.slug, platform)) out.add(c.slug);
  }
  return [...out];
}

/* Guides and posts that belong to "Car boots" whatever forum they are filed under. */
const sourcingGuideSlugs = ["car-boot-sales-for-resellers", "charity-shop-sourcing", "sourcing-for-resale", "spotting-fakes-before-you-buy", "returns-pallets-and-liquidation-stock"];

/*
  The platforms an item belongs to, from its forum category slugs (and its
  own slug, for the car boot and charity shop guides). Use as the
  getPlatforms callback for guides, topics and posts.
*/
export function platformsForCategories(categories: readonly string[], slug?: string): ChosenPlatform[] {
  const ids: ChosenPlatform[] = ["ebay", "vinted", "amazon", "sourcing"];
  const out = ids.filter((p) => categories.some((c) => categoryMatchesPlatform(c, p)));
  if (slug && sourcingGuideSlugs.includes(slug) && !out.includes("sourcing")) out.push("sourcing");
  return out;
}

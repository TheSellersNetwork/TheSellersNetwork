/*
  Pickups: what members found, what they paid and what it sold for.
  Labels and types are shared by the server pages and the client form.
*/

export const pickupCategories = {
  clothing: "Clothing",
  shoes: "Shoes and trainers",
  bags: "Bags",
  accessories: "Accessories",
  homeware: "Homeware",
  kitchen: "Kitchen",
  toys: "Toys",
  games: "Games and consoles",
  books: "Books",
  media: "CDs, DVDs and vinyl",
  electronics: "Electronics",
  collectables: "Collectables",
  jewellery: "Jewellery and watches",
  tools: "Tools and DIY",
  sports: "Sports and outdoors",
  other: "Other",
} as const;

export const pickupSources = {
  car_boot: "Car boot",
  charity_shop: "Charity shop",
  clearance: "Shop clearance",
  online: "Online",
  auction: "Auction",
  market: "Market",
  house_clearance: "House clearance",
  other: "Somewhere else",
} as const;

export const pickupPlatforms = {
  ebay: "eBay",
  vinted: "Vinted",
  amazon: "Amazon",
  depop: "Depop",
  facebook: "Facebook Marketplace",
  etsy: "Etsy",
  whatnot: "Whatnot",
  tiktok_shop: "TikTok Shop",
  other: "Other",
} as const;

export type PickupCategory = keyof typeof pickupCategories;
export type PickupSource = keyof typeof pickupSources;
export type PickupPlatform = keyof typeof pickupPlatforms;

export type Pickup = {
  id: string;
  user_id: string;
  title: string;
  brand: string | null;
  category: PickupCategory;
  source_type: PickupSource;
  area: string | null;
  paid: number;
  expected: number | null;
  sold_price: number | null;
  sold_platform: PickupPlatform | null;
  sold_at: string | null;
  photo_url: string | null;
  note: string | null;
  like_count: number;
  /* The next three exist once migration 20260930000200 is applied; undefined before then. */
  comment_count?: number;
  vote_yes_count?: number;
  vote_no_count?: number;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
  liked_by_me?: boolean;
};

export const gbp = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : Number(n).toLocaleString("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: Number(n) % 1 === 0 ? 0 : 2 });

/* "12x" style multiple of what was paid, if both numbers exist. */
export function multiple(paid: number, sold: number | null): string | null {
  if (sold === null || !paid) return null;
  const m = Number(sold) / Number(paid);
  return m >= 10 ? `${Math.round(m)}x` : `${m.toFixed(1).replace(/\.0$/, "")}x`;
}

/* First day of the current calendar month in the UK, as YYYY-MM-DD (sold_at is a plain date). */
export function ukMonthStart(now: Date = new Date()): string {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit" }).format(now);
  return `${ymd.slice(0, 7)}-01`;
}

/* The month's name in the UK, for headings: "September". */
export function ukMonthName(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", month: "long" }).format(now);
}

/*
  Sold pickups ranked by sold price over price paid, highest first. Pickups
  with nothing paid have no multiple and are left out. Ties go to the bigger
  sold price, then the newer pickup.
*/
export function rankByMultiple<T extends Pick<Pickup, "paid" | "sold_price" | "created_at">>(rows: T[], limit: number): T[] {
  const ratio = (r: T) => (r.sold_price !== null && Number(r.paid) > 0 ? Number(r.sold_price) / Number(r.paid) : null);
  return rows
    .filter((r) => ratio(r) !== null)
    .sort((a, b) => ratio(b)! - ratio(a)! || Number(b.sold_price) - Number(a.sold_price) || b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

/* Key for remembering that a viewer has already seen a pickup's sold stamp. Changes if the sold price is edited. */
export function soldStampKey(p: Pick<Pickup, "id" | "sold_price">): string {
  return `${p.id}:${p.sold_price}`;
}

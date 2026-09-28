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

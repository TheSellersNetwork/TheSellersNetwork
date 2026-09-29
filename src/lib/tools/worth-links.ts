/*
  "What's it worth?" search links. Nothing is fetched or scraped: we only build
  the search address for each site, and the seller opens it and reads the
  prices themselves.
*/

export type WorthCategory = "general" | "clothing" | "vinyl" | "lego" | "games" | "collectables" | "books";

export const worthCategories: { id: WorthCategory; label: string }[] = [
  { id: "general", label: "Anything else" },
  { id: "clothing", label: "Clothing, shoes and bags" },
  { id: "vinyl", label: "Records, CDs and music" },
  { id: "lego", label: "Lego" },
  { id: "games", label: "Video games and consoles" },
  { id: "collectables", label: "Antiques and collectables" },
  { id: "books", label: "Books" },
];

export type WorthCondition = "any" | "new" | "used";

export type WorthInput = { brand: string; item: string; size?: string; condition?: WorthCondition; category?: WorthCategory };

export type WorthLink = { id: string; site: string; label: string; href: string; note: string; paid?: boolean; kind: "sold" | "asking" | "guide" };

/* Brand, item and size as one search phrase, with runs of spaces tidied. */
export function searchPhrase(input: WorthInput): string {
  return [input.brand, input.item, input.size]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .slice(0, 200);
}

const q = (s: string) => encodeURIComponent(s);

/* eBay UK sold and completed listings. LH_ItemCondition narrows to new (1000) or used (3000) where the seller asked. */
export function ebaySoldUrl(phrase: string, condition: WorthCondition = "any"): string {
  const cond = condition === "new" ? "&LH_ItemCondition=1000" : condition === "used" ? "&LH_ItemCondition=3000" : "";
  return `https://www.ebay.co.uk/sch/i.html?_nkw=${q(phrase)}&LH_Sold=1&LH_Complete=1${cond}`;
}

export function worthLinks(input: WorthInput): WorthLink[] {
  const phrase = searchPhrase(input);
  if (!phrase) return [];
  const condition = input.condition ?? "any";
  const links: WorthLink[] = [
    {
      id: "ebay",
      site: "eBay UK",
      label: "Sold and completed listings",
      href: ebaySoldUrl(phrase, condition),
      note: "Items that sold, with the price they sold for. Only compare ones that match yours in model, size and condition, and note whether postage was on top.",
      kind: "sold",
    },
    {
      id: "vinted",
      site: "Vinted",
      label: "Search",
      href: `https://www.vinted.co.uk/catalog?search_text=${q(phrase)}`,
      note: "Vinted has no sold filter, so these are asking prices, not what things sold for. Treat them as the most you are likely to get.",
      kind: "asking",
    },
    {
      id: "depop",
      site: "Depop",
      label: "Search",
      href: `https://www.depop.com/search/?q=${q(phrase)}`,
      note: "Asking prices, not sold prices. Compare them with eBay sold prices before you decide.",
      kind: "asking",
    },
    {
      id: "facebook",
      site: "Facebook Marketplace",
      label: "Search",
      href: `https://www.facebook.com/marketplace/search/?query=${q(phrase)}`,
      note: "Asking prices near you, and you may need to be signed in. Buyers often offer less than the price shown.",
      kind: "asking",
    },
  ];

  switch (input.category) {
    case "vinyl":
      links.push({
        id: "discogs",
        site: "Discogs",
        label: "Release search",
        href: `https://www.discogs.com/search/?q=${q(phrase)}&type=all`,
        note: "Open the exact pressing (check the matrix numbers in the run-out groove) to see its sales history and recent sold prices.",
        kind: "guide",
      });
      break;
    case "lego":
      links.push(
        {
          id: "bricklink",
          site: "BrickLink",
          label: "Catalogue search",
          href: `https://www.bricklink.com/v2/search.page?q=${q(phrase)}`,
          note: "Open the set and choose the price guide to see the last six months of sales, new and used.",
          kind: "guide",
        },
        {
          id: "brickset",
          site: "Brickset",
          label: "Set search",
          href: `https://brickset.com/search?query=${q(phrase)}`,
          note: "Set numbers, piece counts, year and the original retail price, useful for checking a set is complete.",
          kind: "guide",
        },
      );
      break;
    case "games":
      links.push({
        id: "pricecharting",
        site: "PriceCharting",
        label: "Price search",
        href: `https://www.pricecharting.com/search-products?q=${q(phrase)}&type=prices`,
        note: "Loose, boxed and new prices from recent sales. Prices are mostly in US dollars and from US sales, so check eBay UK too.",
        kind: "guide",
      });
      break;
    case "collectables":
      links.push({
        id: "worthpoint",
        site: "WorthPoint",
        label: "Search",
        href: `https://www.worthpoint.com/inventory/search?query=${q(phrase)}`,
        note: "Past sales going back years, including auctions. It is a paid subscription: you can search, but most prices need a paid account.",
        paid: true,
        kind: "guide",
      });
      break;
    default:
      break;
  }
  return links;
}

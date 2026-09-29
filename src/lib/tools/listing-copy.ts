/*
  Per-platform copy for the listing builder. It only rearranges and trims the
  words the seller typed: no keyword data, no invented words, and nothing is
  ever posted anywhere.

  Limits and where they come from (checked 29 September 2026):
  - eBay title: 80 characters. eBay UK Seller Centre, "Listing best practices": "You've got 80
    characters to use".
  - Vinted title: 100 characters, description: 2,000 characters. Vinted's own
    Pro integrations documentation (https://pro-docs.svc.vinted.com/), item
    properties: "Must be between 5 and 100 characters" and "between 5 and
    2000 characters". Vinted's Help Centre page "Describing an item" gives no
    figure, so the app may differ.
  - Depop: up to 5 hashtags in the description. Depop Help Centre, "How to list
    an item". Depop does not publish a description length, so we only count.
  - Etsy title: 140 characters; 13 tags of up to 20 characters each, letters,
    numbers, spaces, apostrophes and hyphens only. Etsy Help, "How to Use Tags
    to Get Found in Search" and Etsy's listing form.
*/

export const limits = {
  ebayTitle: 80,
  vintedTitle: 100,
  vintedDescription: 2000,
  depopHashtags: 5,
  etsyTitle: 140,
  etsyTags: 13,
  etsyTagLength: 20,
} as const;

export const limitSources = {
  ebay: "https://www.ebay.co.uk/sellercentre/listings/create-listings/best-practices",
  vinted: "https://pro-docs.svc.vinted.com/",
  depop: "https://depophelp.zendesk.com/hc/en-gb/articles/360032716413-How-to-list-an-item",
  etsy: "https://help.etsy.com/hc/en-us/articles/360000336307-How-to-Use-Tags-to-Get-Found-in-Search",
} as const;

export type ListingFields = {
  brand: string;
  item: string;
  model: string;
  detail: string;
  size: string;
  colour: string;
  material: string;
  extra: string;
};

/* The order buyers tend to search: brand and item first, extra words last so they are trimmed first. */
export const titleOrder: (keyof ListingFields)[] = ["brand", "item", "model", "detail", "material", "size", "colour", "extra"];

/* Every word the seller typed, in title order, without repeats (case-insensitive). */
export function titleWords(f: ListingFields): string[] {
  const words: string[] = [];
  const seen = new Set<string>();
  for (const k of titleOrder) {
    for (const w of (f[k] ?? "").split(/[,\s]+/).filter(Boolean)) {
      if (!seen.has(w.toLowerCase())) {
        seen.add(w.toLowerCase());
        words.push(w);
      }
    }
  }
  return words;
}

/* Joins words up to the limit, dropping whole words from the end rather than cutting one in half. */
export function trimToWords(words: string[], max: number): { text: string; dropped: string[] } {
  const kept: string[] = [];
  let len = 0;
  let i = 0;
  for (; i < words.length; i += 1) {
    const add = (kept.length ? 1 : 0) + words[i].length;
    if (len + add > max) break;
    kept.push(words[i]);
    len += add;
  }
  return { text: kept.join(" "), dropped: words.slice(i) };
}

/* Etsy titles must start with a letter or number. */
export function etsyTitle(words: string[]): { text: string; dropped: string[] } {
  const w = [...words];
  while (w.length && !/^[\p{L}\p{N}]/u.test(w[0])) {
    const cleaned = w[0].replace(/^[^\p{L}\p{N}]+/u, "");
    if (cleaned) w[0] = cleaned;
    else w.shift();
  }
  return trimToWords(w, limits.etsyTitle);
}

/* Phrases as the seller typed them: each box, split on commas. */
function phrases(f: ListingFields, keys: (keyof ListingFields)[]): string[] {
  return keys.flatMap((k) => (f[k] ?? "").split(",").map((p) => p.trim().replace(/\s+/g, " ")).filter(Boolean));
}

/* Keeps only what Etsy allows in a tag, and no apostrophe or hyphen at the start. */
export function cleanEtsyTag(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^['-]+/, "")
    .trim();
}

/*
  Up to 13 Etsy tags from the seller's own words. Each phrase they typed is a
  tag if it fits in 20 characters; a longer phrase is split into its words.
  Brand plus item ("barbour wax jacket") is added when it fits, as it is still
  only their words.
*/
export function etsyTags(f: ListingFields): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (raw: string) => {
    const t = cleanEtsyTag(raw);
    if (!t || t.length > limits.etsyTagLength || seen.has(t) || out.length >= limits.etsyTags) return;
    seen.add(t);
    out.push(t);
  };
  const combined = [f.brand, f.item].map((x) => x.trim()).filter(Boolean).join(" ");
  if (f.brand.trim() && f.item.trim() && !f.brand.includes(",") && !f.item.includes(",")) add(combined);
  for (const p of phrases(f, titleOrder)) {
    const t = cleanEtsyTag(p);
    if (t.length <= limits.etsyTagLength) add(t);
    else t.split(" ").forEach(add);
  }
  return out;
}

/* Depop hashtags: one per phrase, letters and numbers only, up to 5, in title order. */
export function depopHashtags(f: ListingFields): string[] {
  const out: string[] = [];
  for (const p of phrases(f, ["brand", "item", "model", "detail", "material", "colour", "extra"])) {
    const tag = p.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    if (!tag || /^\d+$/.test(tag) || out.includes(`#${tag}`)) continue;
    out.push(`#${tag}`);
    if (out.length >= limits.depopHashtags) break;
  }
  return out;
}

/* Depop search matches the first words of the description, so the title words lead, then the description, then the hashtags. */
export function depopDescription(title: string, description: string, hashtags: string[]): string {
  const body = description.split("\n");
  if (title && body[0] !== title) body.unshift(title, "");
  return [...body, ...(hashtags.length ? ["", hashtags.join(" ")] : [])].join("\n");
}

export function countHashtags(text: string): number {
  return (text.match(/(^|\s)#[\p{L}\p{N}_]+/gu) ?? []).length;
}

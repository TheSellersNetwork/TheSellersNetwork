/*
  Bylines for blog posts. Kept deliberately plain: a name and what they cover,
  no invented credentials, photos or forum accounts.
*/

export type AuthorId = "jamie-callaghan" | "rachel-doyle";

export type Author = { id: AuthorId; name: string; initials: string; covers: string };

export const authors: Record<AuthorId, Author> = {
  "jamie-callaghan": {
    id: "jamie-callaghan",
    name: "Jamie Callaghan",
    initials: "JC",
    covers: "eBay, Depop, Royal Mail and Evri",
  },
  "rachel-doyle": {
    id: "rachel-doyle",
    name: "Rachel Doyle",
    initials: "RD",
    covers: "Amazon, Vinted, TikTok Shop, Etsy and tax",
  },
};

/* Who writes about what, used when a post does not name its author. */
export function defaultAuthor(platform: string): AuthorId {
  return ["ebay", "depop", "royal-mail", "evri"].includes(platform) ? "jamie-callaghan" : "rachel-doyle";
}

export function getAuthor(id: string | null | undefined, platform = "general"): Author {
  return authors[(id as AuthorId) in authors ? (id as AuthorId) : defaultAuthor(platform)];
}

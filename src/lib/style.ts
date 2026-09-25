/* Visual styles a member can choose. The site default comes from NEXT_PUBLIC_STYLE. */
export const styles = [
  { id: "publication", name: "Publication", note: "White cards, light borders, Inter throughout. Calm and professional." },
  { id: "editorial", name: "Editorial", note: "Serif headings and ruled lines instead of cards. Reads like a newspaper site." },
  { id: "compact", name: "Compact", note: "Denser rows, a dark category sidebar, sharp corners. For members who live here." },
  { id: "warm", name: "Warm", note: "Rounder and softer, with warm-tinted surfaces. Friendlier for newcomers." },
] as const;

export type StyleId = (typeof styles)[number]["id"];

export const STYLE_COOKIE = "tsn-style";

export function isStyleId(value: unknown): value is StyleId {
  return styles.some((s) => s.id === value);
}

export function defaultStyle(): StyleId {
  const env = process.env.NEXT_PUBLIC_STYLE;
  return isStyleId(env) ? env : "publication";
}

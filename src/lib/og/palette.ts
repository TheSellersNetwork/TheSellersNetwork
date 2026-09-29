/*
  Colours for the share cards (Open Graph images). CSS variables do not exist
  inside an ImageResponse, so these are literals copied from the dark slate
  palette in src/styles/tokens.css, the same navy the home hero uses.
  palette.test.ts fails if tokens.css changes and these drift from it.
*/
export const ogPalette = {
  /* --background, dark slate */
  background: "#0b1220",
  /* --card, dark slate */
  card: "#111a2b",
  /* --border, dark slate */
  border: "#223047",
  /* --foreground, dark slate */
  foreground: "#e2e8f0",
  /* --muted-foreground, dark slate */
  muted: "#94a3b8",
  /* --brand, dark slate */
  brand: "#3b82f6",
  /* --brand-deep, dark slate: the lighter blue used for text on dark */
  brandText: "#60a5fa",
  /* --brand-soft, dark slate */
  brandSoft: "#172033",
} as const;

/* Which custom property in the dark slate block each colour comes from. */
export const ogPaletteSource: Record<keyof typeof ogPalette, string> = {
  background: "--background",
  card: "--card",
  border: "--border",
  foreground: "--foreground",
  muted: "--muted-foreground",
  brand: "--brand",
  brandText: "--brand-deep",
  brandSoft: "--brand-soft",
};

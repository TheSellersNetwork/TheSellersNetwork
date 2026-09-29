import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ogPalette, ogPaletteSource } from "@/lib/og/palette";

/* The block that starts ":root.dark," and sets the dark slate palette. */
function darkSlateBlock(): string {
  const css = readFileSync(path.join(process.cwd(), "src", "styles", "tokens.css"), "utf8");
  const start = css.indexOf(':root[data-brand="slate"].dark');
  expect(start).toBeGreaterThan(-1);
  return css.slice(start, css.indexOf("}", start));
}

describe("share card palette", () => {
  it("matches the dark slate tokens", () => {
    const block = darkSlateBlock();
    for (const [key, variable] of Object.entries(ogPaletteSource)) {
      const match = block.match(new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{6})`));
      expect(match, `${variable} in tokens.css`).not.toBeNull();
      expect(ogPalette[key as keyof typeof ogPalette].toLowerCase()).toBe(match![1].toLowerCase());
    }
  });
});

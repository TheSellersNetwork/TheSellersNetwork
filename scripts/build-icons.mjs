/*
  Builds the app icons (home screen, notifications) from the nodes mark.
  Run with `node scripts/build-icons.mjs` after changing the mark or colours.
  Colours match the slate palette's dark navy and brand blue in tokens.css.
*/

import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve(import.meta.dirname, "..", "public", "icons");
await mkdir(out, { recursive: true });

const NAVY = "#0b1220";
const BRAND = "#3b82f6";
const INK = "#f8fafc";

function mark({ size, padding, background, ink = INK, top = BRAND, radius = 0 }) {
  const inner = size - padding * 2;
  const scale = inner / 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${background ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${background}"/>` : ""}
    <g transform="translate(${padding} ${padding}) scale(${scale})" fill="none">
      <path d="M9 22.5 16 9.5m0 0 7 13M9 22.5h14" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="16" cy="9.5" r="3.5" fill="${top}"/>
      <circle cx="9" cy="22.5" r="3.5" fill="${ink}"/>
      <circle cx="23" cy="22.5" r="3.5" fill="${ink}"/>
    </g>
  </svg>`;
}

const icons = [
  { file: "icon-192.png", size: 192, padding: 28, background: NAVY, radius: 40 },
  { file: "icon-512.png", size: 512, padding: 72, background: NAVY, radius: 108 },
  // Maskable icons get cropped to a circle or squircle, so keep the mark inside the middle 80%.
  { file: "maskable-512.png", size: 512, padding: 120, background: NAVY },
  { file: "apple-touch-icon.png", size: 180, padding: 26, background: NAVY },
  // Android shows the notification badge as a white silhouette.
  { file: "badge-96.png", size: 96, padding: 8, background: null, ink: "#ffffff", top: "#ffffff" },
];

for (const icon of icons) {
  await sharp(Buffer.from(mark(icon))).png().toFile(path.join(out, icon.file));
  console.log(`wrote public/icons/${icon.file}`);
}

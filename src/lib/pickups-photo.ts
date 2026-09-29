/*
  Gentle checks on a pickup photo before it is posted. Nothing here blocks
  posting: the form shows the hints and the member decides.
*/

/* Below this average brightness (0 black to 1 white) a photo reads as dark. */
export const DARK_LUMINANCE = 0.22;
/* Photos smaller than this on their long side look soft on the wall. */
export const MIN_LONG_EDGE = 800;

export type PhotoFacts = { width: number; height: number; luminance: number | null };

export function photoHints({ width, height, luminance }: PhotoFacts): string[] {
  const hints: string[] = [];
  if (luminance !== null && luminance < DARK_LUMINANCE) {
    hints.push("This photo looks quite dark. Daylight near a window, or a lamp behind you, makes colours and flaws easier to see.");
  }
  if (width > 0 && height > 0 && Math.max(width, height) < MIN_LONG_EDGE) {
    hints.push(`This photo is quite small (${Math.max(width, height)}px on the long side), so it may look soft. The original from your camera is usually sharper.`);
  }
  return hints;
}

/* Average relative luminance of RGBA pixel data, 0 to 1. Transparent pixels are skipped. */
export function averageLuminance(data: ArrayLike<number>): number | null {
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    n += 1;
  }
  return n === 0 ? null : sum / n / 255;
}

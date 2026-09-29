/*
  The bullets under a "## The short version" heading, as markdown, for the
  "Key facts" box beside a post or guide. Empty when the section is missing.
  Continuation lines of a wrapped bullet are joined onto it. Pure.
*/
export function extractShortVersion(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+The short version\s*#*\s*$/i.test(l.trim()));
  if (start === -1) return [];
  const bullets: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,6}\s/.test(line)) break;
    const bullet = /^\s{0,3}[-*+]\s+(.*)$/.exec(line);
    if (bullet) {
      bullets.push(bullet[1].trim());
    } else if (line.trim() && bullets.length > 0 && /^\s+\S/.test(line)) {
      bullets[bullets.length - 1] += ` ${line.trim()}`;
    } else if (line.trim() && bullets.length > 0) {
      break;
    }
  }
  return bullets.filter(Boolean);
}

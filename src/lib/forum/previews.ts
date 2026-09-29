/*
  Topic list previews: a short plain-text excerpt and the first image of the
  opening post. Pure functions so they are cheap to run on every row and easy
  to test.
*/

export type TopicPreview = { excerpt: string; image: string | null };

const IMAGE_RE = /!\[[^\]]*\]\((https:\/\/[^)\s]+)(?:\s+"[^"]*")?\)/;

/*
  First image in the Markdown, only when it is served from our Supabase
  Storage. The Content Security Policy blocks every other image host, and
  next/image only optimises *.supabase.co.
*/
export function firstImageUrl(markdown: string, storageOrigin: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  const match = IMAGE_RE.exec(markdown);
  if (!match) return null;
  try {
    const url = new URL(match[1]);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")) return null;
    if (storageOrigin && new URL(storageOrigin).origin !== url.origin) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/* Plain text from Markdown: no images, code, headings, list markers or link syntax. */
export function plainExcerpt(markdown: string, length = 220): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length).replace(/\s+\S*$/, "").trimEnd()}…`;
}

export function topicPreview(markdown: string | null | undefined): TopicPreview | null {
  if (!markdown) return null;
  const excerpt = plainExcerpt(markdown);
  const image = firstImageUrl(markdown);
  if (!excerpt && !image) return null;
  return { excerpt, image };
}

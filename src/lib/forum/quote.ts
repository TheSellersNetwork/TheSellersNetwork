/*
  Quote to reply. Builds the Markdown a quote inserts into the reply composer:
  a link back to the quoted post, then the quoted text as a blockquote.
  Anonymous posts are credited to "Anonymous member", never the real author.
  Pure and dependency free so it can run in the browser.
*/

export const QUOTE_MAX_CHARS = 1500;
export const QUOTE_MAX_LINES = 12;

export type QuoteSource = {
  /* The quoted text: a selection (plain text) or the post's Markdown. */
  text: string;
  postNumber: number;
  /* Username of a named author. Null for anonymous or deleted authors. */
  username: string | null;
  anonymous?: boolean;
};

export function quoteAttribution({ postNumber, username, anonymous }: Omit<QuoteSource, "text">): string {
  const who = anonymous ? "Anonymous member" : username ? `@${username}` : "A member";
  return `[${who}](#post-${postNumber}) wrote:`;
}

/* Trims, drops runs of blank lines and caps the length so a quote stays a quote. */
export function tidyQuoteText(text: string, maxLines = QUOTE_MAX_LINES, maxChars = QUOTE_MAX_CHARS): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/\s+$/, ""));
  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && (out.length === 0 || out[out.length - 1] === "")) continue;
    out.push(line);
  }
  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  let clipped = out.length > maxLines;
  let joined = out.slice(0, maxLines).join("\n");
  if (joined.length > maxChars) {
    joined = joined.slice(0, maxChars).replace(/\s+\S*$/, "");
    clipped = true;
  }
  return clipped ? `${joined} …` : joined;
}

export function buildQuoteMarkdown(source: QuoteSource): string {
  const body = tidyQuoteText(source.text);
  if (!body) return "";
  const quoted = body
    .split("\n")
    .map((l) => (l ? `> ${l}` : ">"))
    .join("\n");
  return `${quoteAttribution(source)}\n${quoted}`;
}

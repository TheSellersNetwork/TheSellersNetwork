/*
  Pickup comments and "Would you have bought it?" votes: the pure parts,
  shared by the server action, the page and the tests.

  Comments are plain text with a little markdown: **bold**, *italic*,
  `code`, links for established members and @mentions. Everything is
  escaped first and only these few tags are ever added, so a comment can
  never carry its own HTML.
*/

export const COMMENT_MAX = 2000;

export type PickupComment = {
  id: string;
  pickup_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

const LINK = /(https?:\/\/|www\.)/i;

/* The same link rule as forum posts: members at trust level 0 cannot post links. */
export function validateComment(body: string, trustLevel: number, isStaff = false): string | null {
  const text = body.trim();
  if (text.length === 0) return "Write something first.";
  if (text.length > COMMENT_MAX) return `Comments are at most ${COMMENT_MAX.toLocaleString("en-GB")} characters.`;
  if (!isStaff && trustLevel <= 0 && LINK.test(text)) return "New members cannot post links yet. Describe it in words for now.";
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const MENTION = /(^|[^a-z0-9_/@&#])@([a-z0-9][a-z0-9_]{2,29})\b/gi;

/* Inline formatting on already escaped text. Code spans are kept apart so nothing inside them is formatted. */
function inline(escaped: string): string {
  const parts = escaped.split(/(`[^`\n]+`)/g);
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return `<code>${part.slice(1, -1)}</code>`;
      const links: string[] = [];
      const keep = (html: string) => {
        links.push(html);
        return `\u0000${links.length - 1}\u0000`;
      };
      let out = part
        // [text](https://...)
        .replace(/\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g, (_m, text: string, href: string) =>
          keep(`<a href="${href}" rel="nofollow ugc noopener" class="external">${text}</a>`),
        )
        // Bare https:// links. Trailing punctuation stays outside the link.
        .replace(/(^|[\s(])(https?:\/\/[^\s<]+?)([.,;:!?)]*)(?=\s|$)/g, (_m, pre: string, href: string, post: string) =>
          `${pre}${keep(`<a href="${href}" rel="nofollow ugc noopener" class="external">${href}</a>`)}${post}`,
        )
        .replace(MENTION, (_m, pre: string, name: string) => `${pre}${keep(`<a href="/community/u/${name.toLowerCase()}" class="mention">@${name.toLowerCase()}</a>`)}`);
      out = out
        .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*\w])\*([^*\n]+)\*(?![*\w])/g, "$1<em>$2</em>")
        .replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, "$1<em>$2</em>");
      return out.replace(/\u0000(\d+)\u0000/g, (_m, n: string) => links[Number(n)]);
    })
    .join("");
}

/* Comment text to safe HTML: paragraphs on blank lines, line breaks within them. */
export function renderComment(body: string): string {
  return body
    .trim()
    .split(/\n\s*\n/)
    .map((para) => `<p>${para.split("\n").map((line) => inline(escapeHtml(line))).join("<br>")}</p>`)
    .join("");
}

/* Yes and no as whole percentages that add up to 100. Null with no votes. */
export function voteShare(yes: number, no: number): { yes: number; no: number; total: number } | null {
  const total = Math.max(0, yes) + Math.max(0, no);
  if (total === 0) return null;
  const y = Math.round((Math.max(0, yes) / total) * 100);
  return { yes: y, no: 100 - y, total };
}

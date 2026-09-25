import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import type { Root, Element, Text } from "hast";

/*
  Markdown to sanitised HTML for posts. Runs on the server only; the result
  is cached in posts.body_html. Mentions become profile links, external links
  get nofollow and open in the same tab, images are constrained to https.
*/

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "img"],
  attributes: {
    ...defaultSchema.attributes,
    a: [...(defaultSchema.attributes?.a ?? []), "href", "rel", "className"],
    img: ["src", "alt", "width", "height", "loading"],
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["https"],
  },
};

const MENTION = /(^|[^a-z0-9_/@])@([a-z0-9][a-z0-9_]{2,29})\b/gi;

function isElement(node: unknown): node is Element {
  return typeof node === "object" && node !== null && (node as Element).type === "element";
}

/* Turns @username text into a link and tidies external anchors and images. */
function rehypeForum() {
  return (tree: Root) => {
    const visit = (node: Root | Element, parent: Element | Root | null, inLink: boolean) => {
      const children = node.children ?? [];
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (isElement(child)) {
          if (child.tagName === "a") {
            const href = String(child.properties?.href ?? "");
            child.properties = { ...child.properties, rel: ["nofollow", "ugc", "noopener"] };
            if (/^https?:\/\//i.test(href)) child.properties.className = ["external"];
          }
          if (child.tagName === "img") {
            child.properties = { ...child.properties, loading: "lazy" };
          }
          visit(child, node, inLink || child.tagName === "a" || child.tagName === "code" || child.tagName === "pre");
          continue;
        }
        if (child.type === "text" && !inLink && MENTION.test(child.value)) {
          MENTION.lastIndex = 0;
          const parts: (Text | Element)[] = [];
          let last = 0;
          for (const match of child.value.matchAll(MENTION)) {
            const start = (match.index ?? 0) + match[1].length;
            if (start > last) parts.push({ type: "text", value: child.value.slice(last, start) });
            const username = match[2].toLowerCase();
            parts.push({
              type: "element",
              tagName: "a",
              properties: { href: `/community/u/${username}`, className: ["mention"] },
              children: [{ type: "text", value: `@${username}` }],
            });
            last = start + match[2].length + 1;
          }
          if (last < child.value.length) parts.push({ type: "text", value: child.value.slice(last) });
          children.splice(i, 1, ...parts);
          i += parts.length - 1;
        }
        MENTION.lastIndex = 0;
      }
      void parent;
    };
    visit(tree, null, false);
  };
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeSanitize, schema)
  .use(rehypeForum)
  .use(rehypeStringify);

export async function renderMarkdown(markdown: string): Promise<string> {
  const file = await processor.process(markdown);
  return String(file);
}

/* Plain-text excerpt for meta descriptions and search snippets. */
export function excerpt(markdown: string, length = 160): string {
  const text = markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1).trimEnd()}…`;
}

export type BodyStats = { images: number; links: number; mentions: number; words: number };

export function bodyStats(markdown: string): BodyStats {
  const images = (markdown.match(/!\[[^\]]*\]\([^)]*\)/g) ?? []).length;
  const withoutImages = markdown.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  const mdLinks = (withoutImages.match(/\[[^\]]*\]\((https?:)?\/\/[^)]*\)/g) ?? []).length;
  const bareLinks = (withoutImages.replace(/\[[^\]]*\]\([^)]*\)/g, "").match(/https?:\/\/\S+/g) ?? []).length;
  const mentions = new Set(Array.from(markdown.matchAll(MENTION), (m) => m[2].toLowerCase())).size;
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return { images, links: mdLinks + bareLinks, mentions, words };
}

/*
  Trust caps from the brief. Returns a message the member can read, or null.
  TL0: no links, 1 image, 2 mentions. TL1: 5 images. TL2 and above: no caps.
*/
export function validateBody(markdown: string, trustLevel: number, isStaff = false): string | null {
  if (isStaff) return null;
  const stats = bodyStats(markdown);
  if (trustLevel <= 0) {
    if (stats.links > 0) return "New members cannot post links yet. Describe it in words for now.";
    if (stats.images > 1) return "New members can attach one image per post.";
    if (stats.mentions > 2) return "New members can mention up to two people per post.";
  }
  if (trustLevel <= 1 && stats.images > 5) return "Up to five images per post at this trust level.";
  return null;
}

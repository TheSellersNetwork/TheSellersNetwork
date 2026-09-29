import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import { findTerm, glossaryPatterns } from "@/lib/glossary";

/*
  Marks the first use of each glossary term in a forum post as
  <abbr class="gloss" data-term="..." title="..." tabindex="0">. It runs after
  rehype-sanitize and only ever adds abbr elements built here from the
  glossary's own fixed text, so nothing a member types can reach the output
  through it (a member's own <abbr> is raw HTML, which is never parsed).
  Nothing inside links, code, pre, headings or an existing abbr is touched.
  The browser script in glossary-terms.tsx turns these into the same tap and
  focus pop-ups as guides and does not mark the same term twice.
*/

const SKIP = new Set(["a", "code", "pre", "abbr", "h1", "h2", "h3", "h4", "h5", "h6", "button", "script", "style"]);
const { pattern, lookup } = glossaryPatterns();

function isElement(node: unknown): node is Element {
  return typeof node === "object" && node !== null && (node as Element).type === "element";
}

export default function rehypeGlossary() {
  return (tree: Root) => {
    const used = new Set<string>();

    const splitText = (node: Text): ElementContent[] | null => {
      const text = node.value;
      const re = new RegExp(pattern.source, pattern.flags);
      const out: ElementContent[] = [];
      let last = 0;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        const entry = findTerm(lookup, match[1]);
        if (!entry || used.has(entry.term)) continue;
        used.add(entry.term);
        if (match.index > last) out.push({ type: "text", value: text.slice(last, match.index) });
        out.push({
          type: "element",
          tagName: "abbr",
          properties: { className: ["gloss"], dataTerm: entry.term, title: entry.definition, tabIndex: 0 },
          children: [{ type: "text", value: match[1] }],
        });
        last = match.index + match[1].length;
      }
      if (out.length === 0) return null;
      if (last < text.length) out.push({ type: "text", value: text.slice(last) });
      return out;
    };

    const visit = (node: Root | Element) => {
      const children = node.children as (RootContent | ElementContent)[];
      for (let i = 0; i < children.length; i += 1) {
        const child = children[i];
        if (isElement(child)) {
          if (!SKIP.has(child.tagName)) visit(child);
          continue;
        }
        if (child.type === "text" && child.value.trim()) {
          const parts = splitText(child);
          if (parts) {
            children.splice(i, 1, ...parts);
            i += parts.length - 1;
          }
        }
      }
    };
    visit(tree);
  };
}

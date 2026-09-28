/*
  Our MDX can be written by an automated agent from outside sources (the
  daily change monitor), so raw HTML is never rendered. MDX passes lowercase
  tags such as <script> or <iframe> straight through to the page, and our
  CSP allows inline scripts, so they are removed here. Only markdown and the
  capitalised components the renderer provides survive; imports and exports
  are removed too.
*/

type Node = { type: string; name?: string | null; children?: Node[] };

export function isAllowedNode(node: Node): boolean {
  if (node.type === "mdxjsEsm" || node.type === "html") return false;
  if (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") {
    return !!node.name && /^[A-Z]/.test(node.name);
  }
  return true;
}

export function stripRawHtml(node: Node) {
  if (!node.children) return;
  node.children = node.children.filter(isAllowedNode);
  node.children.forEach(stripRawHtml);
}

export default function remarkNoRawHtml() {
  return (tree: Node) => stripRawHtml(tree);
}

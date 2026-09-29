"use client";

import { buildQuoteMarkdown } from "@/lib/forum/quote";

/* Text selected inside this post's body, or null when the selection is elsewhere. */
export function selectedTextIn(article: Element | null): string | null {
  if (!article || typeof window === "undefined") return null;
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;
  const body = article.querySelector("[data-quote-body]");
  if (!body) return null;
  const range = selection.getRangeAt(0);
  if (!body.contains(range.commonAncestorContainer)) return null;
  const text = selection.toString().trim();
  return text || null;
}

/* The post article that holds a node, with the attribution data the quote needs. */
export function postArticleFor(node: Node | null): HTMLElement | null {
  const el = node instanceof Element ? node : (node?.parentElement ?? null);
  return (el?.closest("article[data-post-number]") as HTMLElement | null) ?? null;
}

export function quoteMarkdownFor(article: HTMLElement, text: string): string {
  const anonymous = article.dataset.quoteAnonymous === "true";
  return buildQuoteMarkdown({
    text,
    postNumber: Number(article.dataset.postNumber),
    username: anonymous ? null : article.dataset.quoteAuthor || null,
    anonymous,
  });
}

/* Hands the quote to the reply composer, which inserts it and takes focus. */
export function sendQuote(markdown: string) {
  if (!markdown) return;
  window.dispatchEvent(new CustomEvent("forum:quote", { detail: markdown }));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("reply")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
}

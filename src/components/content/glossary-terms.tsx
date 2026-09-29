"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { findTerm, glossaryPatterns, type GlossaryTerm } from "@/lib/glossary";

/*
  Underlines seller shorthand in posts and guides and explains it on hover,
  focus or tap. Works on the rendered page, so cached post HTML needs no
  rebuild. Only the first use of each term in each block is marked, and
  nothing inside links, code or headings is touched.
*/

const SKIP = new Set(["A", "CODE", "PRE", "ABBR", "H1", "H2", "H3", "H4", "BUTTON", "SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);
const { pattern, lookup } = glossaryPatterns();

function markContainer(container: HTMLElement) {
  if (container.dataset.glossaryDone) return;
  container.dataset.glossaryDone = "1";
  // Forum posts arrive with terms already marked on the server: count those as used, and drop
  // their title so the browser's own tooltip does not appear on top of ours.
  const used = new Set<string>();
  container.querySelectorAll<HTMLElement>("abbr.gloss[data-term]").forEach((el) => {
    const entry = glossaryEntry(el.dataset.term);
    if (entry) used.add(entry.term);
    el.removeAttribute("title");
    el.tabIndex = 0;
  });
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (let el = node.parentElement; el && el !== container; el = el.parentElement) {
        if (SKIP.has(el.tagName) || el.isContentEditable) return NodeFilter.FILTER_REJECT;
      }
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  for (const node of nodes) {
    const text = node.nodeValue ?? "";
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    let last = 0;
    const frag = document.createDocumentFragment();
    let changed = false;
    while ((match = pattern.exec(text))) {
      const entry = findTerm(lookup, match[1]);
      if (!entry || used.has(entry.term)) continue;
      used.add(entry.term);
      changed = true;
      frag.append(text.slice(last, match.index));
      const abbr = document.createElement("abbr");
      abbr.className = "gloss";
      abbr.tabIndex = 0;
      abbr.dataset.term = entry.term;
      abbr.textContent = match[1];
      frag.append(abbr);
      last = match.index + match[1].length;
    }
    if (changed) {
      frag.append(text.slice(last));
      node.replaceWith(frag);
    }
  }
}

function markAll() {
  document.querySelectorAll<HTMLElement>("[data-glossary]:not([data-glossary-done])").forEach(markContainer);
}

type Tip = { entry: GlossaryTerm; top: number; left: number; below: boolean };

export function GlossaryTerms() {
  const [tip, setTip] = useState<Tip | null>(null);
  const hideTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    markAll();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        markAll();
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const show = (target: EventTarget | null) => {
      const el = target instanceof Element ? target.closest<HTMLElement>("abbr.gloss") : null;
      if (!el) return false;
      const entry = glossaryEntry(el.dataset.term);
      if (!entry) return false;
      window.clearTimeout(hideTimer.current);
      const rect = el.getBoundingClientRect();
      const below = rect.top < 160;
      setTip({ entry, top: below ? rect.bottom + 8 : rect.top - 8, left: Math.min(Math.max(rect.left + rect.width / 2, 170), window.innerWidth - 170), below });
      el.setAttribute("aria-describedby", "glossary-tip");
      return true;
    };
    const hide = () => {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setTip(null), 120);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "mouse") show(e.target);
    };
    const onOut = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.target instanceof Element && e.target.closest("abbr.gloss")) hide();
    };
    const onFocus = (e: FocusEvent) => show(e.target);
    const onBlur = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.closest("abbr.gloss")) hide();
    };
    // Taps toggle; a tap elsewhere closes.
    const onClick = (e: MouseEvent) => {
      if (!show(e.target)) setTip(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTip(null);
    };
    const onScroll = () => setTip(null);

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!tip) return null;
  return (
    <div
      id="glossary-tip"
      role="tooltip"
      className="glossary-tip fixed z-50 w-80 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border bg-popover p-3 text-sm text-popover-foreground shadow-lg"
      style={{ top: tip.top, left: tip.left, transform: `translate(-50%, ${tip.below ? "0" : "-100%"})` }}
      onPointerEnter={() => window.clearTimeout(hideTimer.current)}
      onPointerLeave={() => setTip(null)}
    >
      <p className="font-semibold">
        {tip.entry.term}
        {tip.entry.platform ? <span className="ml-2 text-xs font-normal text-muted-foreground">{tip.entry.platform}</span> : null}
      </p>
      <p className="mt-1 text-muted-foreground">{tip.entry.definition}</p>
      <Link href="/tools/glossary" className="mt-2 inline-block text-xs underline">
        All terms
      </Link>
    </div>
  );
}

function glossaryEntry(term: string | undefined): GlossaryTerm | undefined {
  return term ? findTerm(lookup, term) : undefined;
}

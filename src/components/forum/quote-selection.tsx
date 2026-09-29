"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Quote } from "lucide-react";
import { postArticleFor, quoteMarkdownFor, selectedTextIn, sendQuote } from "@/components/forum/quote-client";

type Spot = { top: number; left: number; article: HTMLElement; text: string };

/*
  A small Quote button that appears above text selected inside a post. The
  keyboard route is the Quote action under each post, which also quotes the
  current selection.
*/
export function QuoteSelection() {
  const [spot, setSpot] = useState<Spot | null>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    function measure() {
      frame.current = null;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setSpot(null);
        return;
      }
      const range = selection.getRangeAt(0);
      const article = postArticleFor(range.commonAncestorContainer);
      const text = selectedTextIn(article);
      if (!article || !text) {
        setSpot(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSpot(null);
        return;
      }
      const half = 44;
      const left = Math.min(Math.max(rect.left + rect.width / 2, half + 8), window.innerWidth - half - 8);
      // Touch screens show their own copy menu above a selection, so go below it there.
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const top = !coarse && rect.top > 56 ? rect.top - 44 : rect.bottom + 8;
      setSpot({ top, left, article, text });
    }
    function schedule() {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSpot(null);
    }
    document.addEventListener("selectionchange", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("selectionchange", schedule);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("keydown", onKey);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);

  if (!spot) return null;

  return createPortal(
    <button
      type="button"
      data-testid="quote-selection"
      className="fixed z-50 inline-flex min-h-11 -translate-x-1/2 sm:min-h-9 items-center gap-1.5 rounded-md border bg-popover px-3 text-sm font-medium text-popover-foreground shadow-md hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      style={{ top: spot.top, left: spot.left }}
      // Keep the selection alive while the button is pressed.
      onPointerDown={(e) => e.preventDefault()}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        sendQuote(quoteMarkdownFor(spot.article, spot.text));
        window.getSelection()?.removeAllRanges();
        setSpot(null);
      }}
    >
      <Quote className="size-4" aria-hidden="true" /> Quote
    </button>,
    document.body,
  );
}

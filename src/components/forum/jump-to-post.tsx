"use client";

import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/*
  Scrolls to a post, moves focus to it and outlines it for a moment so the
  eye lands in the right place. Instant scroll and no fade for reduced motion.
*/
export function JumpToPost({ postNumber, children = "Jump to answer" }: { postNumber: number; children?: React.ReactNode }) {
  const anchor = `post-${postNumber}`;
  function jump(e: React.MouseEvent<HTMLAnchorElement>) {
    const target = document.getElementById(anchor);
    if (!target) return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    target.focus({ preventScroll: true });
    history.replaceState(null, "", `#${anchor}`);
    // Inline so no theme style can override it; colour from the success token.
    target.dataset.flash = "true";
    target.style.outline = "2px solid var(--success)";
    target.style.outlineOffset = "2px";
    if (!reduce) target.style.transition = "outline-color 600ms ease-out";
    window.setTimeout(() => {
      target.style.outlineColor = "transparent";
      window.setTimeout(
        () => {
          delete target.dataset.flash;
          target.style.removeProperty("outline");
          target.style.removeProperty("outline-offset");
          target.style.removeProperty("outline-color");
          target.style.removeProperty("transition");
        },
        reduce ? 0 : 600,
      );
    }, 1600);
  }
  return (
    <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
      <a href={`#${anchor}`} onClick={jump}>
        <ArrowDown className="size-4" aria-hidden="true" />
        {children}
      </a>
    </Button>
  );
}

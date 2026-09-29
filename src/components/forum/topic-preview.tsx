"use client";

import { useId } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { isMousePointer, useHoverIntent } from "@/components/forum/use-hover-intent";

/*
  Desktop only: hovering or keyboard-focusing a topic title shows the first
  lines of the opening post. Touch screens skip it and just follow the link.
*/
export function TopicPreview({
  excerpt,
  className,
  children,
}: {
  excerpt: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen, openSoon, closeSoon, cancel } = useHoverIntent({
    openDelay: 500,
    closeDelay: 120,
  });
  const id = useId();

  const desktop = () => window.matchMedia("(min-width: 768px)").matches;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <span
          className={className}
          onPointerEnter={(e: React.PointerEvent) => {
            if (isMousePointer(e) && desktop()) openSoon();
          }}
          onPointerLeave={(e: React.PointerEvent) => {
            if (isMousePointer(e)) closeSoon();
          }}
          onFocus={(e: React.FocusEvent) => {
            if (e.target instanceof Element && e.target.matches(":focus-visible") && desktop())
              openSoon(300);
          }}
          onBlur={() => closeSoon()}
          onClick={() => cancel()}
        >
          {children}
        </span>
      </PopoverAnchor>
      <PopoverContent
        id={id}
        role="tooltip"
        side="bottom"
        align="start"
        className="w-96 max-w-[calc(100vw-2rem)] motion-reduce:animate-none"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={(e) => {
          if (isMousePointer(e)) cancel();
        }}
        onPointerLeave={(e) => {
          if (isMousePointer(e)) closeSoon();
        }}
        data-testid="topic-preview"
      >
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{excerpt}</p>
      </PopoverContent>
    </Popover>
  );
}

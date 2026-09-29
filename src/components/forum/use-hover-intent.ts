"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  Open state for hover cards: opens after a short delay on mouse hover or
  keyboard focus, closes a little after the pointer or focus leaves, and stays
  open while the pointer is over the card itself.
*/
export function useHoverIntent({ openDelay = 400, closeDelay = 150 }: { openDelay?: number; closeDelay?: number } = {}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const openSoon = useCallback(
    (delay = openDelay) => {
      clear();
      timer.current = setTimeout(() => setOpen(true), delay);
    },
    [clear, openDelay],
  );

  const closeSoon = useCallback(() => {
    clear();
    timer.current = setTimeout(() => setOpen(false), closeDelay);
  }, [clear, closeDelay]);

  const openNow = useCallback(() => {
    clear();
    setOpen(true);
  }, [clear]);

  const closeNow = useCallback(() => {
    clear();
    setOpen(false);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { open, setOpen, openSoon, closeSoon, openNow, closeNow, cancel: clear };
}

/* True for a mouse or trackpad. Touch and pen get tap behaviour instead. */
export function isMousePointer(e: { pointerType?: string }) {
  return e.pointerType === "mouse";
}

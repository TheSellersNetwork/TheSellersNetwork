"use client";

import { ViewTransition } from "react";
import { usePathname } from "next/navigation";

/*
  A short cross-fade between pages, using the browser's View Transitions API
  through React's <ViewTransition>. Keyed by path, so moving to another page
  fades the old one out and the new one in; changing only the query string
  (a tab, a filter) or a router refresh does not animate. The timing and the
  reduced-motion switch-off live in globals.css. Browsers without the API
  just change page as before.
*/
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} enter="page-fade" exit="page-fade" default="none">
      {children}
    </ViewTransition>
  );
}

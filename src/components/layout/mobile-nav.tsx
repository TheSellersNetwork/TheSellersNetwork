"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { urls } from "@/lib/forum/urls";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>
            <Logo size={20} />
          </SheetTitle>
        </SheetHeader>
        <nav aria-label="Primary" className="flex flex-col gap-1 px-4">
          {items.map((item) => (
            <Button key={item.href} asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Button asChild className="mt-2 justify-start" onClick={() => setOpen(false)}>
            <Link href={urls.newTopic()}>New topic</Link>
          </Button>
          <form action={urls.search()} role="search" className="mt-2">
            <label htmlFor="mobile-search" className="sr-only">
              Search the community
            </label>
            <input
              id="mobile-search"
              name="q"
              type="search"
              placeholder="Search"
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            />
          </form>
        </nav>
      </SheetContent>
    </Sheet>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { LogOut, Menu, Moon, Search, Settings, Shield, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/brand/logo";
import { openSearch } from "@/components/search/open-search";
import { urls } from "@/lib/forum/urls";
import { createClient } from "@/lib/supabase/client";

/*
  The phone menu: site sections, search, the theme switch and, for members,
  account links and sign out (the header drops its account menu below 640px).
*/
export function MobileNav({ items, user }: { items: { href: string; label: string }[]; user?: { is_staff: boolean } | null }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function signOut() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="-ml-2 size-11 md:hidden" aria-label="Open menu">
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
          {/* New post, notifications and your profile are in the bar along the bottom of the screen. */}
          <Button
            variant="outline"
            className="mt-2 justify-start"
            onClick={() => {
              setOpen(false);
              openSearch();
            }}
          >
            <Search data-icon="inline-start" />
            Search
          </Button>
          <ThemeButton />
          {user ? (
            <div className="mt-2 flex flex-col gap-1 border-t pt-2">
              <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
                <Link href={urls.account()}>
                  <Settings data-icon="inline-start" />
                  Account and notifications
                </Link>
              </Button>
              {user.is_staff ? (
                <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
                  <Link href="/admin">
                    <Shield data-icon="inline-start" />
                    Staff home
                  </Link>
                </Button>
              ) : null}
              <Button variant="ghost" className="justify-start" onClick={signOut}>
                <LogOut data-icon="inline-start" />
                Sign out
              </Button>
            </div>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

/* The light and dark switch, which on phones lives here rather than in the header. */
function ThemeButton() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;
  const dark = resolvedTheme === "dark";
  return (
    <Button variant="ghost" className="justify-start" onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun data-icon="inline-start" /> : <Moon data-icon="inline-start" />}
      {dark ? "Light mode" : "Dark mode"}
    </Button>
  );
}

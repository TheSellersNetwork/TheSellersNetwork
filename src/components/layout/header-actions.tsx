"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { LogOut, Moon, Plus, Search, Settings, Shield, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/forum/user-avatar";
import { displayName } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { createClient } from "@/lib/supabase/client";
import { openSearch } from "@/components/search/open-search";

type HeaderUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_staff: boolean;
};

/*
  Below 768px the header keeps only search (and the account menu from 640px):
  the bar along the bottom of the screen has New post, Notifications, Sign in
  and Join, and the menu has the theme switch and account links, so the header
  fits a 320px screen.
*/
export function HeaderActions({ user, children }: { user: HeaderUser | null; children?: React.ReactNode }) {
  return (
    <>
      <SearchForm />
      <Button variant="ghost" size="icon" className="size-11 md:hidden" aria-label="Search" aria-haspopup="dialog" onClick={() => openSearch()}>
        <Search />
      </Button>
      <Button asChild size="sm" className="hidden md:inline-flex">
        <Link href={urls.newTopic()}>
          <Plus data-icon="inline-start" />
          New topic
        </Link>
      </Button>
      <span className="hidden md:contents">
        <ThemeToggle />
      </span>
      {user ? (
        <>
          <span className="hidden md:contents">{children}</span>
          <span className="hidden sm:contents">
            <UserMenu user={user} />
          </span>
        </>
      ) : (
        <Button asChild variant="outline" size="sm" className="hidden md:inline-flex">
          <Link href={urls.login()}>Sign in</Link>
        </Button>
      )}
    </>
  );
}

/* True on Apple devices, where the search shortcut is Cmd+K. False on the server. */
function useIsApple() {
  return useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

/*
  The header search box. A click opens the search palette; typing into it
  with the keyboard and pressing Enter still goes to the full search page.
*/
function SearchForm() {
  const apple = useIsApple();
  return (
    <form action={urls.search()} role="search" className="hidden items-center md:flex">
      <label htmlFor="header-search" className="sr-only">
        Search the community
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          id="header-search"
          name="q"
          type="search"
          placeholder="Search"
          aria-keyshortcuts="Control+K Meta+K"
          onMouseDown={(e) => {
            e.preventDefault();
            openSearch(e.currentTarget.value);
          }}
          className="h-9 w-44 rounded-md border bg-background pl-8 pr-14 text-sm outline-none transition-[width] focus:w-64 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:w-56"
        />
        <kbd aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-secondary px-1.5 font-sans text-[11px] leading-5 text-muted-foreground">
          {apple ? "⌘K" : "Ctrl K"}
        </kbd>
      </div>
    </form>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return <span className="size-8" aria-hidden="true" />;
  const dark = resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {dark ? <Sun /> : <Moon />}
    </Button>
  );
}

function UserMenu({ user }: { user: HeaderUser }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-full" aria-label="Account menu">
          <UserAvatar profile={user} size="sm" link={false} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="truncate font-medium">{displayName(user)}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">@{user.username}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={urls.profile(user.username)}>
            <User />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={urls.account()}>
            <Settings />
            Account and notifications
          </Link>
        </DropdownMenuItem>
        {user.is_staff ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <Shield />
                Staff home
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={urls.adminFlags()}>
                <Shield />
                Moderation queue
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

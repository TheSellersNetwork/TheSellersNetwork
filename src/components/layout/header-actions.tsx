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

type HeaderUser = {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  is_staff: boolean;
};

export function HeaderActions({ user, children }: { user: HeaderUser | null; children?: React.ReactNode }) {
  return (
    <>
      <SearchForm />
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href={urls.newTopic()}>
          <Plus data-icon="inline-start" />
          New topic
        </Link>
      </Button>
      <ThemeToggle />
      {user ? (
        <>
          {children}
          <UserMenu user={user} />
        </>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link href={urls.login()}>Sign in</Link>
        </Button>
      )}
    </>
  );
}

function SearchForm() {
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
          className="h-9 w-44 rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition-[width] focus:w-64 focus-visible:ring-2 focus-visible:ring-ring lg:w-56"
        />
      </div>
    </form>
  );
}

function ThemeToggle() {
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
          <DropdownMenuItem asChild>
            <Link href={urls.adminFlags()}>
              <Shield />
              Moderation queue
            </Link>
          </DropdownMenuItem>
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

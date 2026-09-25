import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { HeaderActions } from "@/components/layout/header-actions";
import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Heartbeat } from "@/components/forum/heartbeat";
import { getCurrentUser } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";

const nav = [
  { href: urls.community(), label: "Community" },
  { href: urls.blog(), label: "Blog" },
  { href: urls.guides(), label: "Guides" },
  { href: "/partners", label: "Partners" },
];

/* Sticky header: wordmark, primary nav, search, New topic, bell, avatar. */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await getUnreadNotificationCount(user.id) : 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {user ? <Heartbeat /> : null}
      <div className="mx-auto flex h-(--header-height) max-w-7xl items-center gap-4 px-4 sm:px-6">
        <MobileNav items={nav} />
        <Link href="/" className="shrink-0 rounded-sm" aria-label="The Sellers Network home">
          <Logo size={22} />
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <HeaderActions
            user={
              user
                ? {
                    username: user.profile.username,
                    display_name: user.profile.display_name,
                    avatar_url: user.profile.avatar_url,
                    is_staff: user.profile.is_staff,
                  }
                : null
            }
          >
            {user ? <NotificationBell initialUnread={unread} /> : null}
          </HeaderActions>
        </div>
      </div>
    </header>
  );
}

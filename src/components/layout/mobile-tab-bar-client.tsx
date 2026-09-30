"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, LogIn, MessagesSquare, Plus, ShoppingBag, User, UserPlus } from "lucide-react";
import { activeTab, tabBarHidden, type TabKey } from "@/components/layout/mobile-tabs";
import { urls } from "@/lib/forum/urls";
import { cn } from "@/lib/utils";

/* Text fields that bring up the on-screen keyboard. */
function opensKeyboard(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable || el.tagName === "TEXTAREA") return true;
  if (el.tagName !== "INPUT") return false;
  return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image", "hidden"].includes((el as HTMLInputElement).type);
}

/*
  True while a text field has focus on a touch screen, which is when the
  on-screen keyboard is up. The bar steps aside so it does not sit on top of
  the keyboard or the field being typed in.
*/
function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const touch = window.matchMedia("(pointer: coarse)");
    const onIn = (e: FocusEvent) => setOpen(touch.matches && opensKeyboard(e.target));
    const onOut = () => window.setTimeout(() => setOpen(touch.matches && opensKeyboard(document.activeElement)), 0);
    document.addEventListener("focusin", onIn);
    document.addEventListener("focusout", onOut);
    return () => {
      document.removeEventListener("focusin", onIn);
      document.removeEventListener("focusout", onOut);
    };
  }, []);
  return open;
}

type Tab = { key: TabKey; href: string; label: string; icon: typeof Bell; badge?: number; primary?: boolean };

export function MobileTabBarClient({ username, unread }: { username: string | null; unread: number }) {
  const pathname = usePathname() ?? "/";
  const keyboard = useKeyboardOpen();
  if (tabBarHidden(pathname)) return null;

  const current = activeTab(pathname, username);
  const tabs: Tab[] = [
    { key: "forum", href: urls.community(), label: "Forum", icon: MessagesSquare },
    { key: "pickups", href: "/community/pickups", label: "Pickups", icon: ShoppingBag },
    { key: "new", href: urls.newTopic(), label: "New post", icon: Plus, primary: true },
    username
      ? { key: "notifications", href: urls.notifications(), label: "Notifications", icon: Bell, badge: unread }
      : { key: "signin", href: urls.login(pathname === "/" || pathname.startsWith("/login") ? undefined : pathname), label: "Sign in", icon: LogIn },
    username ? { key: "you", href: urls.profile(username), label: "You", icon: User } : { key: "join", href: urls.signup(), label: "Join", icon: UserPlus },
  ];

  return (
    <nav aria-label="Quick links" className={cn("mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden", keyboard && "hidden")}>
      <ul className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {tabs.map((t) => {
          const here = current === t.key;
          const Icon = t.icon;
          const label = t.key === "notifications" ? (unread > 0 ? `Notifications, ${unread} unread` : "Notifications") : undefined;
          return (
            <li key={t.key}>
              <Link
                href={t.href}
                aria-current={here ? "page" : undefined}
                aria-label={label}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                  here ? "text-brand" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.primary ? (
                  <span className={cn("grid size-8 place-items-center rounded-full bg-primary text-primary-foreground", here && "ring-2 ring-brand/30 ring-offset-2 ring-offset-background")}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                ) : (
                  <span className="relative grid size-8 place-items-center">
                    <Icon className="size-5" aria-hidden="true" />
                    {t.badge && t.badge > 0 ? (
                      <span className="absolute -right-1 top-0 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground" aria-hidden="true">
                        {t.badge > 99 ? "99+" : t.badge}
                      </span>
                    ) : null}
                  </span>
                )}
                <span className={cn("max-w-full truncate px-0.5", t.primary && "text-foreground", here && "text-brand")}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

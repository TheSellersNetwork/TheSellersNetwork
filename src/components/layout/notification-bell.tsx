"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { urls } from "@/lib/forum/urls";

/*
  Phase A: a link to the notifications page with an unread count. The dropdown
  and Realtime updates arrive in Phase B and C.
*/
export function NotificationBell({ initialUnread }: { initialUnread: number }) {
  const label = initialUnread > 0 ? `Notifications, ${initialUnread} unread` : "Notifications";
  return (
    <Button asChild variant="ghost" size="icon-sm" className="relative" aria-label={label}>
      <Link href={urls.notifications()}>
        <Bell />
        {initialUnread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {initialUnread > 99 ? "99+" : initialUnread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

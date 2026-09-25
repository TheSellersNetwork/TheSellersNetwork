import type { Metadata } from "next";
import Link from "next/link";
import { ForumShell } from "@/components/layout/forum-shell";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getNotifications } from "@/lib/forum/queries";
import { markNotificationsRead } from "@/app/community/actions";
import { timeAgo } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import type { Notification } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

function describe(n: Notification): string {
  const title = n.payload.topic_title ?? "a topic";
  switch (n.type) {
    case "reply":
      return `New reply in ${title}`;
    case "mention":
      return `You were mentioned in ${title}`;
    case "solution":
      return `Your reply in ${title} was marked as the solution`;
    case "like":
      return `Someone liked your post in ${title}`;
    case "moderation":
      return n.payload.message ?? "A moderation update on your account";
    default:
      return title;
  }
}

function href(n: Notification): string {
  if (n.payload.topic_slug && n.payload.topic_short_id) {
    return urls.topic({ slug: n.payload.topic_slug, short_id: n.payload.topic_short_id }, n.payload.post_number);
  }
  return urls.community();
}

export default async function NotificationsPage() {
  const user = await requireUser(urls.notifications());
  const notifications = await getNotifications(user.id);
  const unread = notifications.filter((n) => !n.read_at);

  return (
    <ForumShell source={urls.notifications()}>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        {unread.length > 0 ? (
          <form
            action={async () => {
              "use server";
              await markNotificationsRead();
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nothing yet. Replies to your topics and mentions will show up here.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {notifications.map((n) => (
            <li key={n.id} className={cn("flex items-center gap-3 p-4 text-sm", !n.read_at && "bg-brand-soft/40")}>
              <span className={cn("size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-brand")} aria-hidden="true" />
              <Link href={href(n)} className="min-w-0 flex-1 hover:underline">
                {describe(n)}
              </Link>
              <time dateTime={n.created_at} className="shrink-0 text-xs text-muted-foreground">
                {timeAgo(n.created_at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </ForumShell>
  );
}

import "server-only";
import { getBlogPosts } from "@/lib/content/blog";
import { isLive, ukDate } from "@/lib/content/schedule";
import { getOnlineMembers, type OnlineMember } from "@/lib/forum/live-queries";
import { urls } from "@/lib/forum/urls";
import { getCalendar } from "@/lib/tools/calendar";
import { countdown, eventsFrom, formatDay } from "@/lib/tools/calendar-dates";

export type ComingUpItem = { id: string; title: string; day: string; when: string; href: string };
export type LiveDebate = { question: string; title: string; href: string; options: number };
export type SidebarData = { comingUp: ComingUpItem[]; debate: LiveDebate | null; online: OnlineMember[] };

/*
  Everything the home sidebar shows. Each part fails on its own: a feed or
  database hiccup hides that block rather than the whole column.
*/
export async function getSidebarData(now: Date = new Date()): Promise<SidebarData> {
  const today = ukDate(now);
  const [calendar, posts, online] = await Promise.all([getCalendar(now).catch(() => []), getBlogPosts().catch(() => []), getOnlineMembers(12).catch(() => [])]);

  const comingUp = eventsFrom(calendar, today)
    .slice(0, 3)
    .map((e) => ({
      id: e.id,
      title: e.title,
      day: formatDay(e.date),
      when: countdown(e, today),
      // Site pages link straight there; anything else goes to the calendar, which carries the source.
      href: e.url && e.url.startsWith("/") ? e.url : "/tools/calendar",
    }));

  // The newest debate post that is actually live (drafts show in development, so check the date).
  const d = posts.find((p) => p.debate && isLive(p.published, now));
  const debate = d?.debate ? { question: d.debate.question, title: d.title, href: urls.blogPost(d.slug), options: d.debate.options.length } : null;

  return { comingUp, debate, online };
}

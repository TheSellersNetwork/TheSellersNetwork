import "server-only";
import { getBlogPosts, type Debate } from "@/lib/content/blog";
import { isLive } from "@/lib/content/schedule";
import { getPoll } from "@/lib/forum/polls";
import { urls } from "@/lib/forum/urls";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Poll } from "@/lib/db/types";

export type DebateOfTheWeek = {
  slug: string;
  title: string;
  debate: Debate;
  /* The forum thread, once scripts/sync-blog.ts (the daily cron) has opened it. */
  topicUrl: string | null;
  /* The thread's poll with the viewer's vote, when the thread exists. */
  poll: Poll | null;
  signedIn: boolean;
};

/*
  The newest debate post whose UK publish date has arrived. Scheduled debates
  are left out even outside production, so the home page never shows one
  early. Null when no debate is live.
*/
export async function getDebateOfTheWeek(now = new Date()): Promise<DebateOfTheWeek | null> {
  const posts = await getBlogPosts();
  const post = posts.find((p) => p.debate && isLive(p.published, now));
  if (!post?.debate) return null;

  const supabase = await createClient();
  const { data: row } = await supabase.from("blog_posts").select("topic:topics (id, slug, short_id)").eq("slug", post.slug).maybeSingle();
  const thread = (row?.topic as unknown as { id: string; slug: string; short_id: string } | null) ?? null;
  const viewer = await getCurrentUser();
  const poll = thread ? await getPoll(thread.id, viewer?.id) : null;

  return { slug: post.slug, title: post.title, debate: post.debate, topicUrl: thread ? urls.topic(thread) : null, poll, signedIn: !!viewer };
}

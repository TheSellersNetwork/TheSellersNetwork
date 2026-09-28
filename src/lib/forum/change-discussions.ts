import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getTopicByShortId } from "@/lib/forum/queries";
import { getPoll } from "@/lib/forum/polls";
import type { Poll, PostRow, TopicRow } from "@/lib/db/types";

/*
  Each change breakdown has a forum topic for discussion, created by
  `npm run changes:sync` and linked by its short id in the MDX frontmatter.
*/

export type ChangeDiscussion = { topic: TopicRow; poll: Poll | null; latest: PostRow[]; replies: number };

export async function getChangeDiscussion(shortId: string | null, viewerId?: string | null): Promise<ChangeDiscussion | null> {
  if (!shortId) return null;
  const data = await getTopicByShortId(shortId, viewerId);
  if (!data || data.topic.deleted_at) return null;
  const poll = await getPoll(data.topic.id, viewerId);
  const visible = data.posts.slice(1).filter((p) => !p.is_deleted && !p.is_hidden);
  return { topic: data.topic, poll, latest: visible.slice(-3).reverse(), replies: data.topic.reply_count };
}

/* Reply counts for the index page, keyed by short id. */
export async function getChangeReplyCounts(shortIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (shortIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase.from("topics").select("short_id, reply_count").in("short_id", shortIds).is("deleted_at", null);
  for (const t of data ?? []) map.set(t.short_id as string, t.reply_count as number);
  return map;
}

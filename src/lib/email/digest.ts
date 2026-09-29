/*
  Weekly digest contents for one member. Pure, so the rules are unit tested
  and the cron (src/lib/email/digest-run.tsx) only fetches and sends.

  A member gets:
    - new topics from the last seven days in forums they follow (a followed
      forum includes its subforums) or carrying a tag they follow, never their
      own, never in a muted forum, never in a private forum they cannot see;
    - replies to their own topics they have not seen yet (reply notifications
      still unread);
    - this week's numbers thread, when it has gone up.
  No email when there are no topics and no replies: the numbers thread alone
  is not worth an email.
*/

export type DigestCategory = { id: string; parent_id: string | null; is_private: boolean; allowed_group_id: string | null };

export type DigestTopicInput = {
  id: string;
  title: string;
  slug: string;
  short_id: string;
  category_id: string;
  author_id: string;
  created_at: string;
  reply_count: number;
  tag_ids: string[];
};

export type DigestMember = {
  id: string;
  is_staff: boolean;
  group_ids: string[];
  following_category_ids: string[];
  muted_category_ids: string[];
  followed_tag_ids: string[];
};

export type UnseenReply = { topic_id: string; topic_title: string; topic_slug: string; topic_short_id: string };

export type DigestTopic = Pick<DigestTopicInput, "id" | "title" | "slug" | "short_id" | "reply_count">;
export type DigestReplies = { topic_id: string; title: string; slug: string; short_id: string; count: number };

export type Digest = {
  topics: DigestTopic[];
  replies: DigestReplies[];
  numbers: { title: string; slug: string; short_id: string } | null;
  send: boolean;
};

export const DIGEST_TOPIC_LIMIT = 8;
export const DIGEST_REPLY_LIMIT = 8;

/* A followed or muted forum covers its subforums too. */
function withChildren(ids: string[], categories: DigestCategory[]): Set<string> {
  const set = new Set(ids);
  for (const c of categories) if (c.parent_id && set.has(c.parent_id)) set.add(c.id);
  return set;
}

export function canSee(member: Pick<DigestMember, "is_staff" | "group_ids">, category: DigestCategory | undefined): boolean {
  if (!category) return false;
  if (!category.is_private || member.is_staff) return true;
  return !!category.allowed_group_id && member.group_ids.includes(category.allowed_group_id);
}

export function buildDigest(args: {
  member: DigestMember;
  categories: DigestCategory[];
  topics: DigestTopicInput[];
  unseenReplies: UnseenReply[];
  numbers: Digest["numbers"];
}): Digest {
  const { member, categories, topics, unseenReplies, numbers } = args;
  const byId = new Map(categories.map((c) => [c.id, c]));
  const following = withChildren(member.following_category_ids, categories);
  const muted = withChildren(member.muted_category_ids, categories);
  const tags = new Set(member.followed_tag_ids);

  const picked = topics
    .filter((t) => t.author_id !== member.id)
    .filter((t) => !muted.has(t.category_id))
    .filter((t) => canSee(member, byId.get(t.category_id)))
    .filter((t) => following.has(t.category_id) || t.tag_ids.some((id) => tags.has(id)))
    // Busiest first, then newest, so the email leads with what people are talking about.
    .sort((a, b) => b.reply_count - a.reply_count || b.created_at.localeCompare(a.created_at))
    .slice(0, DIGEST_TOPIC_LIMIT)
    .map(({ id, title, slug, short_id, reply_count }) => ({ id, title, slug, short_id, reply_count }));

  const grouped = new Map<string, DigestReplies>();
  for (const r of unseenReplies) {
    const g = grouped.get(r.topic_id) ?? { topic_id: r.topic_id, title: r.topic_title, slug: r.topic_slug, short_id: r.topic_short_id, count: 0 };
    g.count += 1;
    grouped.set(r.topic_id, g);
  }
  const replies = Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, DIGEST_REPLY_LIMIT);

  return { topics: picked, replies, numbers, send: picked.length > 0 || replies.length > 0 };
}

/* The Monday (UTC) of the week an instant falls in, as YYYY-MM-DD. One digest per member per value. */
export function digestWeek(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

export function digestSubject(d: Digest): string {
  const parts: string[] = [];
  if (d.replies.length > 0) {
    const total = d.replies.reduce((n, r) => n + r.count, 0);
    parts.push(total === 1 ? "1 new reply to your topics" : `${total} new replies to your topics`);
  }
  if (d.topics.length > 0) parts.push(d.topics.length === 1 ? "1 new topic you follow" : `${d.topics.length} new topics you follow`);
  return `Your week on The Sellers Network: ${parts.join(", ")}`;
}

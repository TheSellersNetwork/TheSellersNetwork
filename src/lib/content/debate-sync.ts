import type { SupabaseClient } from "@supabase/supabase-js";
import { renderMarkdown } from "../markdown/render";
import { DEBATE_DEFAULT_FORUM, type BlogMeta, type Debate } from "./blog-meta";
import { isLive } from "./schedule";

/*
  Opens a forum thread with a poll for each debate blog post once its UK
  publish date has arrived. Shared by the daily cron (/api/cron/rituals) and
  `npm run debates:sync`. Needs a service-role client.

  The thread is recorded in blog_posts.discussion_topic_id (keyed by the post
  slug), which /blog/[slug] already reads. A thread with the post's exact title
  in the debate's forum also counts, so a lost link is repaired rather than
  posted twice.
*/

export type DebatePost = Pick<BlogMeta, "slug" | "title" | "excerpt" | "published" | "category" | "platforms" | "cover"> & { debate: Debate };

/* The opening post: the excerpt, a link to the article and a call to vote. */
export function debateOpeningPost(post: Pick<BlogMeta, "slug" | "title" | "excerpt">): string {
  return [post.excerpt.trim(), `Read the full post: [${post.title}](/blog/${post.slug})`, "Vote in the poll and tell us why below."].filter(Boolean).join("\n\n");
}

/* Debate posts whose thread is due: live today (UK date) or earlier. */
export function dueDebates(posts: BlogMeta[], now: Date = new Date()): DebatePost[] {
  return posts.filter((p): p is BlogMeta & DebatePost => !!p.debate && isLive(p.published, now));
}

export async function syncDebates(
  admin: SupabaseClient,
  authorId: string,
  posts: DebatePost[],
  options: { dry?: boolean } = {},
): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  if (posts.length === 0) return results;

  const { error: pollsMissing } = await admin.from("polls").select("id").limit(1);
  if (pollsMissing) return Object.fromEntries(posts.map((p) => [p.slug, "skipped: the polls table is missing"]));

  const { data: categories } = await admin.from("categories").select("id, slug");
  const bySlug = new Map((categories ?? []).map((c) => [c.slug as string, c.id as string]));

  for (const post of posts) {
    try {
      results[post.slug] = await syncOne(admin, authorId, post, bySlug, !!options.dry);
    } catch (error) {
      results[post.slug] = `failed: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  return results;
}

async function syncOne(admin: SupabaseClient, authorId: string, post: DebatePost, bySlug: Map<string, string>, dry: boolean): Promise<string> {
  const forum = bySlug.has(post.debate.forum) ? post.debate.forum : DEBATE_DEFAULT_FORUM;
  const categoryId = bySlug.get(forum);
  if (!categoryId) return `skipped: no forum ${post.debate.forum} or ${DEBATE_DEFAULT_FORUM}`;

  // 1. Already linked from blog_posts to a live thread that has a poll.
  const { data: row } = await admin.from("blog_posts").select("discussion_topic_id").eq("slug", post.slug).maybeSingle();
  const linkedId = (row?.discussion_topic_id as string | null | undefined) ?? null;
  if (linkedId) {
    const { data: linked } = await admin.from("topics").select("id, slug, short_id").eq("id", linkedId).is("deleted_at", null).maybeSingle();
    if (linked && (await hasPoll(admin, linked.id as string))) return `already open: /community/t/${linked.slug}/${linked.short_id}`;
  }

  // 2. A thread with the exact title in that forum: link it rather than post again.
  const { data: byTitle } = await admin
    .from("topics")
    .select("id, slug, short_id")
    .eq("category_id", categoryId)
    .eq("title", post.title)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (byTitle) {
    if (dry) return `would link existing thread /community/t/${byTitle.slug}/${byTitle.short_id}`;
    // A run that stopped part way may have left the thread without its poll.
    if (!(await hasPoll(admin, byTitle.id as string))) await addPoll(admin, byTitle.id as string, post.debate);
    await linkPost(admin, authorId, post, byTitle.id as string);
    return `already open, linked: /community/t/${byTitle.slug}/${byTitle.short_id}`;
  }

  if (dry) return `would create in ${forum}: ${post.title}`;

  // 3. Create the thread, its opening post and the poll.
  const { data: topic, error } = await admin.from("topics").insert({ title: post.title, category_id: categoryId, author_id: authorId }).select("id, slug, short_id").single();
  if (error || !topic) return `failed: ${error?.message ?? "topic insert failed"}`;
  const body_md = debateOpeningPost(post);
  const { error: postError } = await admin.from("posts").insert({ topic_id: topic.id, author_id: authorId, body_md, body_html: await renderMarkdown(body_md) });
  if (postError) return `failed: ${postError.message}`;
  await addPoll(admin, topic.id as string, post.debate);
  await linkPost(admin, authorId, post, topic.id as string);
  return `created: /community/t/${topic.slug}/${topic.short_id}`;
}

async function hasPoll(admin: SupabaseClient, topicId: string): Promise<boolean> {
  const { data } = await admin.from("polls").select("id").eq("topic_id", topicId).maybeSingle();
  return !!data;
}

async function addPoll(admin: SupabaseClient, topicId: string, debate: Debate) {
  const { data: poll, error } = await admin.from("polls").insert({ topic_id: topicId, question: debate.question }).select("id").single();
  if (error || !poll) throw new Error(`poll not created: ${error?.message ?? "insert failed"}`);
  const { error: optionsError } = await admin.from("poll_options").insert(debate.options.map((label, position) => ({ poll_id: poll.id, position, label })));
  if (optionsError) throw new Error(`poll options not created: ${optionsError.message}`);
}

/* Records the thread against the post, creating the blog_posts row if sync-blog has not. */
async function linkPost(admin: SupabaseClient, authorId: string, post: DebatePost, topicId: string) {
  const { data: existing } = await admin.from("blog_posts").select("slug").eq("slug", post.slug).maybeSingle();
  const { error } = existing
    ? await admin.from("blog_posts").update({ discussion_topic_id: topicId }).eq("slug", post.slug)
    : await admin.from("blog_posts").insert({
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt || null,
        author_id: authorId,
        published_at: post.published,
        category: post.category,
        platforms: post.platforms,
        discussion_topic_id: topicId,
        cover: post.cover,
      });
  if (error) throw new Error(`thread made but not linked to blog_posts: ${error.message}`);
}

import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/*
  Anonymous posting. The post is written by the server as the shared
  "Anonymous member" account, so nothing in the public API names the real
  author. The real author is kept in anonymous_authors, which only staff and
  the author can read. Permission checks run as the real member first.
*/

export const getAnonymousAccountId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.from("site_accounts").select("profile_id").eq("key", "anonymous").maybeSingle();
  return (data?.profile_id as string | undefined) ?? null;
});

/* Post ids in this list that the viewer wrote anonymously, or all of them with their authors for staff. */
export async function getAnonymousAuthors(postIds: string[]): Promise<Map<string, { user_id: string; username: string }>> {
  const map = new Map<string, { user_id: string; username: string }>();
  if (postIds.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("anonymous_authors")
    .select("post_id, user_id, profile:profiles!anonymous_authors_user_id_fkey (username)")
    .in("post_id", postIds);
  for (const row of data ?? []) {
    const profile = row.profile as unknown as { username: string } | null;
    map.set(row.post_id as string, { user_id: row.user_id as string, username: profile?.username ?? "unknown" });
  }
  return map;
}

export async function isAnonymousAuthor(postId: string, userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.from("anonymous_authors").select("post_id").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  return !!data;
}

type Result<T> = { ok: true; value: T } | { ok: false; message: string };

async function prepare(): Promise<Result<{ admin: ReturnType<typeof createAdminClient>; anonId: string }>> {
  const anonId = await getAnonymousAccountId();
  if (!anonId) return { ok: false, message: "Anonymous posting is not set up yet. Post normally or try later." };
  try {
    return { ok: true, value: { admin: createAdminClient(), anonId } };
  } catch {
    return { ok: false, message: "Anonymous posting is not available right now." };
  }
}

/* The real author watches the topic so replies still reach them, and never gets notified about their own post. */
async function afterInsert(admin: ReturnType<typeof createAdminClient>, userId: string, topicId: string, postId: string) {
  await admin.from("anonymous_authors").insert({ post_id: postId, user_id: userId });
  await admin.from("topic_subscriptions").upsert({ user_id: userId, topic_id: topicId, level: "watching" }, { onConflict: "user_id,topic_id", ignoreDuplicates: true });
  await admin.from("notifications").delete().eq("user_id", userId).filter("payload->>post_id", "eq", postId);
}

export async function createAnonymousTopic(input: {
  userId: string;
  categoryId: string;
  title: string;
  bodyMd: string;
  bodyHtml: string;
}): Promise<Result<{ id: string; slug: string; short_id: string }>> {
  const supabase = await createClient();
  const [{ data: allowed }, { data: category }] = await Promise.all([
    supabase.rpc("can_post", { p_category_id: input.categoryId, p_is_topic: true }),
    supabase.from("categories").select("allow_anonymous").eq("id", input.categoryId).maybeSingle(),
  ]);
  if (!allowed) return { ok: false, message: "You cannot start a topic in this category yet." };
  if (!category?.allow_anonymous) return { ok: false, message: "This category does not allow anonymous posts." };

  const ready = await prepare();
  if (!ready.ok) return ready;
  const { admin, anonId } = ready.value;

  const { data: topic, error } = await admin
    .from("topics")
    .insert({ title: input.title, category_id: input.categoryId, author_id: anonId, is_anonymous: true })
    .select("id, slug, short_id")
    .single();
  if (error || !topic) return { ok: false, message: "Could not post that. Try again." };

  const { data: post, error: postError } = await admin
    .from("posts")
    .insert({ topic_id: topic.id, author_id: anonId, body_md: input.bodyMd, body_html: input.bodyHtml, is_anonymous: true })
    .select("id")
    .single();
  if (postError || !post) {
    await admin.from("topics").delete().eq("id", topic.id);
    return { ok: false, message: "Could not post that. Try again." };
  }
  await afterInsert(admin, input.userId, topic.id, post.id);
  return { ok: true, value: topic as { id: string; slug: string; short_id: string } };
}

export async function createAnonymousReply(input: {
  userId: string;
  topicId: string;
  bodyMd: string;
  bodyHtml: string;
  replyToPostId: string | null;
}): Promise<Result<{ id: string; post_number: number; topic: { slug: string; short_id: string } }>> {
  const supabase = await createClient();
  const [{ data: allowed }, { data: topic }] = await Promise.all([
    supabase.rpc("can_reply", { p_topic_id: input.topicId }),
    supabase.from("topics").select("id, category:categories (allow_anonymous)").eq("id", input.topicId).maybeSingle(),
  ]);
  if (!allowed) return { ok: false, message: "You cannot reply to this topic." };
  const category = topic?.category as unknown as { allow_anonymous: boolean } | null;
  if (!category?.allow_anonymous) return { ok: false, message: "This category does not allow anonymous posts." };

  const ready = await prepare();
  if (!ready.ok) return ready;
  const { admin, anonId } = ready.value;

  const { data: post, error } = await admin
    .from("posts")
    .insert({
      topic_id: input.topicId,
      author_id: anonId,
      body_md: input.bodyMd,
      body_html: input.bodyHtml,
      reply_to_post_id: input.replyToPostId,
      is_anonymous: true,
    })
    .select("id, post_number, topic:topics (slug, short_id)")
    .single();
  if (error || !post) return { ok: false, message: "Could not post that. Try again." };
  await afterInsert(admin, input.userId, input.topicId, post.id);
  return {
    ok: true,
    value: { id: post.id as string, post_number: post.post_number as number, topic: post.topic as unknown as { slug: string; short_id: string } },
  };
}

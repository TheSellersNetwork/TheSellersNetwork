"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser, requireOnboardedUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderMarkdown, validateBody } from "@/lib/markdown/render";
import { friendlyError } from "@/lib/errors";
import { urls } from "@/lib/forum/urls";
import { dispatchEmailsForPost } from "@/lib/email/notify";
import { trackServer } from "@/lib/analytics/server";
import type { Topic } from "@/lib/db/types";

export type ActionState = { ok: boolean; message: string; redirectTo?: string };

const bodySchema = z.string().trim().min(1, "Write something first.").max(40000);

async function rateLimited(key: string, limit: number, window: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("check_rate_limit", { p_key: key, p_limit: limit, p_window: window });
  return data === false;
}

/* Members must have a verified email before their first post. */
async function assertCanWrite(next: string) {
  const user = await requireOnboardedUser(next);
  if (!user.emailConfirmed) {
    return { user, error: "Confirm your email address before posting. Check your inbox for the link." };
  }
  if (user.profile.is_suspended) {
    return { user, error: `Your account is suspended. ${user.profile.suspension_reason ?? ""}`.trim() };
  }
  return { user, error: null };
}

export async function createTopic(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    title: z.string().trim().min(3, "Titles need at least 3 characters.").max(200, "Titles are at most 200 characters."),
    category_id: z.string().uuid("Pick a category."),
    body_md: bodySchema,
    expires_at: z.string().optional(),
  });
  const parsed = schema.safeParse({
    title: formData.get("title"),
    category_id: formData.get("category_id"),
    body_md: formData.get("body_md"),
    expires_at: formData.get("expires_at") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { user, error } = await assertCanWrite(urls.newTopic());
  if (error) return { ok: false, message: error };

  const capMessage = validateBody(parsed.data.body_md, user.profile.trust_level, user.profile.is_staff);
  if (capMessage) return { ok: false, message: capMessage };

  if (await rateLimited(`topic:${user.id}`, 10, "1 hour")) {
    return { ok: false, message: "You are posting quickly. Wait a few minutes." };
  }

  const supabase = await createClient();
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({
      title: parsed.data.title,
      category_id: parsed.data.category_id,
      author_id: user.id,
      expires_at: parsed.data.expires_at ? new Date(`${parsed.data.expires_at}T23:59:59`).toISOString() : null,
    })
    .select("id, slug, short_id")
    .single();
  if (topicError || !topic) return { ok: false, message: friendlyError(topicError) };

  const body_html = await renderMarkdown(parsed.data.body_md);
  const { error: postError } = await supabase
    .from("posts")
    .insert({ topic_id: topic.id, author_id: user.id, body_md: parsed.data.body_md, body_html });
  if (postError) {
    // The topic exists without a body; remove it so nothing dangles.
    await supabase.from("topics").delete().eq("id", topic.id);
    return { ok: false, message: friendlyError(postError) };
  }

  if (user.profile.post_count === 0) {
    await trackServer("first_post", { kind: "topic" }, user.id);
  }

  revalidatePath(urls.community());
  redirect(urls.topic(topic as Pick<Topic, "slug" | "short_id">));
}

export async function createReply(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    topic_id: z.string().uuid(),
    body_md: bodySchema,
    reply_to_post_id: z.string().uuid().nullable(),
  });
  const parsed = schema.safeParse({
    topic_id: formData.get("topic_id"),
    body_md: formData.get("body_md"),
    reply_to_post_id: formData.get("reply_to_post_id") || null,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { user, error } = await assertCanWrite(urls.community());
  if (error) return { ok: false, message: error };

  const capMessage = validateBody(parsed.data.body_md, user.profile.trust_level, user.profile.is_staff);
  if (capMessage) return { ok: false, message: capMessage };

  if (await rateLimited(`reply:${user.id}`, 30, "1 hour")) {
    return { ok: false, message: "You are posting quickly. Wait a few minutes." };
  }

  const supabase = await createClient();
  const body_html = await renderMarkdown(parsed.data.body_md);
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      topic_id: parsed.data.topic_id,
      author_id: user.id,
      body_md: parsed.data.body_md,
      body_html,
      reply_to_post_id: parsed.data.reply_to_post_id,
    })
    .select("id, post_number, topic:topics (slug, short_id)")
    .single();
  if (postError || !post) return { ok: false, message: friendlyError(postError) };

  if (user.profile.post_count === 0) {
    await trackServer("first_post", { kind: "reply" }, user.id);
  }

  await dispatchEmailsForPost(post.id);

  const topic = post.topic as unknown as Pick<Topic, "slug" | "short_id">;
  revalidatePath(urls.topic(topic));
  return { ok: true, message: "", redirectTo: urls.topic(topic, post.post_number) };
}

export async function editPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({ post_id: z.string().uuid(), body_md: bodySchema });
  const parsed = schema.safeParse({ post_id: formData.get("post_id"), body_md: formData.get("body_md") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };

  const { user, error } = await assertCanWrite(urls.community());
  if (error) return { ok: false, message: error };

  const capMessage = validateBody(parsed.data.body_md, user.profile.trust_level, user.profile.is_staff);
  if (capMessage) return { ok: false, message: capMessage };

  const supabase = await createClient();
  const body_html = await renderMarkdown(parsed.data.body_md);
  const { data, error: updateError } = await supabase
    .from("posts")
    .update({ body_md: parsed.data.body_md, body_html })
    .eq("id", parsed.data.post_id)
    .select("post_number, topic:topics (slug, short_id)")
    .single();
  if (updateError || !data) return { ok: false, message: friendlyError(updateError) };

  const topic = data.topic as unknown as Pick<Topic, "slug" | "short_id">;
  revalidatePath(urls.topic(topic));
  return { ok: true, message: "Saved.", redirectTo: urls.topic(topic, data.post_number) };
}

export async function deletePost(postId: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .update({ is_deleted: true })
    .eq("id", postId)
    .select("topic:topics (slug, short_id)")
    .single();
  if (error || !data) return { ok: false, message: friendlyError(error) };
  if (user.profile.is_staff) await logModeration("delete_post", "post", postId, null);
  revalidatePath(urls.topic(data.topic as unknown as Pick<Topic, "slug" | "short_id">));
  return { ok: true, message: "Post deleted." };
}

export async function toggleLike(postId: string): Promise<ActionState & { liked?: boolean; count?: number }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to like posts." };
  const supabase = await createClient();

  const { data: existing } = await supabase.from("likes").select("post_id").eq("user_id", user.id).eq("post_id", postId).maybeSingle();
  if (existing) {
    const { error } = await supabase.from("likes").delete().eq("user_id", user.id).eq("post_id", postId);
    if (error) return { ok: false, message: friendlyError(error) };
  } else {
    const { error } = await supabase.from("likes").insert({ user_id: user.id, post_id: postId });
    if (error) return { ok: false, message: friendlyError(error) };
    await supabase.rpc("record_activity", { p_likes_given: 1 });
  }

  const { data: post } = await supabase.from("posts").select("like_count").eq("id", postId).single();
  return { ok: true, message: "", liked: !existing, count: post?.like_count ?? 0 };
}

export async function flagPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const schema = z.object({
    post_id: z.string().uuid(),
    reason: z.enum(["spam", "selling", "off_topic", "abuse", "policy_evasion", "other"]),
    note: z.string().trim().max(1000).optional(),
  });
  const parsed = schema.safeParse({ post_id: formData.get("post_id"), reason: formData.get("reason"), note: formData.get("note") ?? "" });
  if (!parsed.success) return { ok: false, message: "Pick a reason." };

  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in to flag posts." };
  if (user.profile.trust_level < 1 && !user.profile.is_staff) {
    return { ok: false, message: "Flagging opens once you have read around a little. Until then, reply and let staff know." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("flags").insert({
    post_id: parsed.data.post_id,
    reporter_id: user.id,
    reason: parsed.data.reason,
    note: parsed.data.note || null,
  });
  if (error) {
    if (error.message.includes("flags_one_per_reporter")) return { ok: true, message: "You have already flagged this post." };
    return { ok: false, message: friendlyError(error) };
  }
  return { ok: true, message: "Thanks. Staff will take a look." };
}

export async function markSolved(topicId: string, postId: string | null): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in first." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("topics")
    .update({ is_solved: postId !== null, solution_post_id: postId })
    .eq("id", topicId)
    .select("slug, short_id, author_id")
    .single();
  if (error || !data) return { ok: false, message: friendlyError(error) };
  if (postId) {
    await trackServer("solution_marked", { topic_id: topicId, by_author: data.author_id === user.id }, user.id);
    await dispatchEmailsForPost(postId, "solution");
  }
  revalidatePath(urls.topic(data));
  return { ok: true, message: postId ? "Marked as the solution." : "Solution removed." };
}

async function logModeration(action: string, targetType: string, targetId: string, reason: string | null) {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("moderation_log").insert({ actor_id: user.id, action, target_type: targetType, target_id: targetId, reason });
}

export async function setTopicFlags(topicId: string, patch: { is_pinned?: boolean; is_locked?: boolean }, reason?: string): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user?.profile.is_staff) return { ok: false, message: "Staff only." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("topics").update(patch).eq("id", topicId).select("slug, short_id").single();
  if (error || !data) return { ok: false, message: friendlyError(error) };
  const action = patch.is_pinned !== undefined ? (patch.is_pinned ? "pin" : "unpin") : patch.is_locked ? "lock" : "unlock";
  await logModeration(action, "topic", topicId, reason ?? null);
  revalidatePath(urls.topic(data));
  return { ok: true, message: "Updated." };
}

export async function markNotificationsRead(ids?: string[]): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  let query = supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null);
  if (ids && ids.length > 0) query = query.in("id", ids);
  await query;
  revalidatePath(urls.notifications());
}

/* Preview for the composer. Runs the same renderer as publishing. */
export async function previewMarkdown(markdown: string): Promise<string> {
  return renderMarkdown(markdown.slice(0, 40000));
}

/* Reading stats for the trust cron. Called from the topic page after a short dwell. */
export async function recordRead(topicsRead: number, postsRead: number, seconds: number): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.rpc("record_activity", {
    p_topics_read: topicsRead,
    p_posts_read: postsRead,
    p_time_read_secs: Math.min(seconds, 600),
  });
}

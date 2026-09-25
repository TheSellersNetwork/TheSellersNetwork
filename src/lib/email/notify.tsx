import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { ReplyEmail } from "@/emails/reply-email";
import { MentionEmail } from "@/emails/mention-email";
import { SolutionEmail } from "@/emails/solution-email";
import { excerpt } from "@/lib/markdown/render";
import { displayName } from "@/lib/format";
import { siteConfig } from "@/lib/site";
import type { Notification } from "@/lib/db/types";

/*
  Emails the members who were notified about a post, respecting their
  preferences, then stamps emailed_at so a retry never sends twice. Needs the
  service role because notifications belong to other members. Runs after the
  reply is saved, so a mail failure never loses a post.
*/
export async function dispatchEmailsForPost(postId: string, only?: "solution"): Promise<void> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return; // No service key locally.
  }

  const { data: post } = await admin
    .from("posts")
    .select("id, body_md, post_number, author:profiles!posts_author_id_fkey (username, display_name), topic:topics (title, slug, short_id)")
    .eq("id", postId)
    .single();
  if (!post) return;

  const types = only === "solution" ? ["solution"] : ["reply", "mention"];
  const { data: pending } = await admin
    .from("notifications")
    .select("*")
    .in("type", types)
    .is("emailed_at", null)
    .filter("payload->>post_id", "eq", postId);
  if (!pending || pending.length === 0) return;

  const userIds = Array.from(new Set(pending.map((n) => n.user_id as string)));
  const [{ data: profiles }, { data: users }] = await Promise.all([
    admin.from("profiles").select("id, email_on_reply, email_on_mention").in("id", userIds),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const prefs = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const emails = new Map((users?.users ?? []).map((u) => [u.id, u.email]));

  const author = post.author as unknown as { username: string; display_name: string | null } | null;
  const topic = post.topic as unknown as { title: string; slug: string; short_id: string };
  const topicUrl = `${siteConfig.url}/community/t/${topic.slug}/${topic.short_id}#post-${post.post_number}`;
  const snippet = excerpt(post.body_md, 240);
  const actorName = displayName(author);

  for (const n of pending as Notification[]) {
    const pref = prefs.get(n.user_id);
    const to = emails.get(n.user_id);
    const wants = n.type === "reply" ? pref?.email_on_reply : n.type === "mention" ? pref?.email_on_mention : true;
    if (to && wants) {
      const react =
        n.type === "reply" ? (
          <ReplyEmail actorName={actorName} topicTitle={topic.title} snippet={snippet} url={topicUrl} />
        ) : n.type === "mention" ? (
          <MentionEmail actorName={actorName} topicTitle={topic.title} snippet={snippet} url={topicUrl} />
        ) : (
          <SolutionEmail topicTitle={topic.title} url={topicUrl} />
        );
      const subject =
        n.type === "reply"
          ? `${actorName} replied in "${topic.title}"`
          : n.type === "mention"
            ? `${actorName} mentioned you in "${topic.title}"`
            : `Your reply was marked as the solution`;
      await sendEmail({ to, subject, react });
    }
    await admin.from("notifications").update({ emailed_at: new Date().toISOString() }).eq("id", n.id);
  }
}

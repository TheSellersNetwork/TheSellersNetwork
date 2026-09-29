import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailsFor } from "@/lib/supabase/find-user";
import { sendEmail } from "@/lib/email/send";
import { chunk, isMissingTable, pause } from "@/lib/email/cron-auth";
import { buildDigest, digestSubject, digestWeek, type DigestCategory, type DigestMember, type DigestTopicInput, type UnseenReply } from "@/lib/email/digest";
import { emailTokenSecret, unsubscribeFor } from "@/lib/email/tokens";
import { WeeklyDigestEmail } from "@/emails/weekly-digest-email";
import { rituals, WEEKLY_THREADS_SLUG } from "@/lib/rituals";
import { plural } from "@/lib/format";
import { urls } from "@/lib/forum/urls";
import { siteConfig } from "@/lib/site";

type Admin = ReturnType<typeof createAdminClient>;

const DAY = 86_400_000;
const NUMBERS_PREFIX = rituals.find((r) => r.id === "numbers")?.titlePrefix ?? "What did you sell this week?";

/*
  Sends the weekly digest to every member who switched it on. Safe to rerun:
  digest_sends records each member's week, so a second run the same week
  sends nothing to those already done. Returns a summary for the cron log.
*/
export async function runWeeklyDigest(now = new Date()): Promise<Record<string, unknown>> {
  const secret = emailTokenSecret();
  if (!secret) return { message: "EMAIL_TOKEN_SECRET is not set, so no digest was sent" };
  const admin = createAdminClient();
  const week = digestWeek(now);

  const { data: prefs, error } = await admin.from("member_email_prefs").select("user_id").eq("weekly_digest", true);
  if (error) return { message: isMissingTable(error) ? "Migration 20260930000100 is not applied yet" : error.message };
  const optedIn = (prefs ?? []).map((p) => p.user_id as string);
  if (optedIn.length === 0) return { message: "Nobody has the digest switched on", week };

  const { data: done } = await admin.from("digest_sends").select("user_id").eq("week_start", week);
  const already = new Set((done ?? []).map((d) => d.user_id as string));
  const due = optedIn.filter((id) => !already.has(id));
  if (due.length === 0) return { message: "Everyone has had this week's digest", week };

  const since = new Date(now.getTime() - 7 * DAY).toISOString();
  const [categories, topics, numbers] = await Promise.all([loadCategories(admin), loadRecentTopics(admin, since), loadNumbersThread(admin, since)]);

  let sent = 0;
  let empty = 0;
  let failed = 0;
  for (const ids of chunk(due, 100)) {
    const [members, unseen, emails] = await Promise.all([loadMembers(admin, ids), loadUnseenReplies(admin, ids, since), emailsFor(admin, ids)]);
    for (const member of members) {
      const to = emails.get(member.id);
      if (!to) continue;
      const digest = buildDigest({ member, categories, topics, unseenReplies: unseen.get(member.id) ?? [], numbers });
      if (!digest.send) {
        empty += 1;
        continue;
      }
      const unsubscribe = unsubscribeFor(siteConfig.url, secret, member.id, "digest");
      const ok = await sendEmail({
        to,
        subject: digestSubject(digest),
        headers: unsubscribe.headers,
        react: (
          <WeeklyDigestEmail
            replies={digest.replies.map((r) => ({ title: r.title, url: `${siteConfig.url}${urls.topic(r)}`, note: plural(r.count, "new reply", "new replies") }))}
            topics={digest.topics.map((t) => ({ title: t.title, url: `${siteConfig.url}${urls.topic(t)}`, note: t.reply_count > 0 ? plural(t.reply_count, "reply", "replies") : undefined }))}
            numbers={digest.numbers ? { title: digest.numbers.title, url: `${siteConfig.url}${urls.topic(digest.numbers)}` } : null}
            unsubscribeUrl={unsubscribe.url}
            settingsUrl={`${siteConfig.url}${urls.account()}#email-preferences`}
          />
        ),
      });
      if (ok) {
        sent += 1;
        await admin.from("digest_sends").insert({ user_id: member.id, week_start: week });
      } else {
        failed += 1;
      }
      await pause(550);
    }
  }
  return { week, due: due.length, sent, empty, failed };
}

async function loadCategories(admin: Admin): Promise<DigestCategory[]> {
  const { data } = await admin.from("categories").select("id, parent_id, is_private, allowed_group_id");
  return (data ?? []) as DigestCategory[];
}

async function loadRecentTopics(admin: Admin, since: string): Promise<DigestTopicInput[]> {
  const { data } = await admin
    .from("topics")
    .select("id, title, slug, short_id, category_id, author_id, created_at, reply_count, topic_tags (tag_id)")
    .gte("created_at", since)
    .is("deleted_at", null)
    .eq("is_unlisted", false)
    .order("created_at", { ascending: false })
    .limit(1000);
  return (data ?? []).map((t) => {
    const { topic_tags, ...rest } = t as typeof t & { topic_tags: { tag_id: string }[] | null };
    return { ...rest, tag_ids: (topic_tags ?? []).map((x) => x.tag_id) } as DigestTopicInput;
  });
}

async function loadNumbersThread(admin: Admin, since: string) {
  const { data: category } = await admin.from("categories").select("id").eq("slug", WEEKLY_THREADS_SLUG).maybeSingle();
  if (!category) return null;
  const { data } = await admin
    .from("topics")
    .select("title, slug, short_id")
    .eq("category_id", category.id)
    .ilike("title", `${NUMBERS_PREFIX}%`)
    .gte("created_at", since)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { title: string; slug: string; short_id: string } | null) ?? null;
}

async function loadMembers(admin: Admin, ids: string[]): Promise<DigestMember[]> {
  const nowIso = new Date().toISOString();
  const [{ data: profiles }, { data: follows }, { data: tagFollows }, { data: groups }] = await Promise.all([
    admin.from("profiles").select("id, is_staff").in("id", ids),
    admin.from("category_follows").select("user_id, category_id, level").in("user_id", ids),
    admin.from("tag_follows").select("user_id, tag_id").in("user_id", ids),
    admin.from("group_members").select("user_id, group_id, expires_at").in("user_id", ids),
  ]);
  return (profiles ?? []).map((p) => {
    const mine = (follows ?? []).filter((f) => f.user_id === p.id);
    return {
      id: p.id as string,
      is_staff: !!p.is_staff,
      group_ids: (groups ?? []).filter((g) => g.user_id === p.id && (!g.expires_at || g.expires_at > nowIso)).map((g) => g.group_id as string),
      following_category_ids: mine.filter((f) => f.level === "following").map((f) => f.category_id as string),
      muted_category_ids: mine.filter((f) => f.level === "muted").map((f) => f.category_id as string),
      followed_tag_ids: (tagFollows ?? []).filter((f) => f.user_id === p.id).map((f) => f.tag_id as string),
    };
  });
}

/*
  Replies to a member's own topics that they have not opened: reply
  notifications from the last week that are still unread, on topics they wrote.
*/
async function loadUnseenReplies(admin: Admin, ids: string[], since: string): Promise<Map<string, UnseenReply[]>> {
  const { data } = await admin
    .from("notifications")
    .select("user_id, payload")
    .in("user_id", ids)
    .eq("type", "reply")
    .is("read_at", null)
    .gte("created_at", since)
    .limit(5000);
  const rows = (data ?? []) as { user_id: string; payload: Record<string, string | undefined> }[];
  const topicIds = Array.from(new Set(rows.map((r) => r.payload.topic_id).filter((x): x is string => !!x)));
  const authors = new Map<string, string>();
  for (const batch of chunk(topicIds, 200)) {
    const { data: topics } = await admin.from("topics").select("id, author_id").in("id", batch).is("deleted_at", null);
    for (const t of topics ?? []) authors.set(t.id as string, t.author_id as string);
  }
  const out = new Map<string, UnseenReply[]>();
  for (const r of rows) {
    const p = r.payload;
    if (!p.topic_id || !p.topic_slug || !p.topic_short_id || authors.get(p.topic_id) !== r.user_id) continue;
    const list = out.get(r.user_id) ?? [];
    list.push({ topic_id: p.topic_id, topic_title: p.topic_title ?? "Your topic", topic_slug: p.topic_slug, topic_short_id: p.topic_short_id });
    out.set(r.user_id, list);
  }
  return out;
}

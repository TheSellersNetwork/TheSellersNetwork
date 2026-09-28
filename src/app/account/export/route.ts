import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { allowAction } from "@/lib/rate-limit";

/*
  "Download my data" (UK GDPR access and portability). Everything the member
  can see about themselves, as one JSON file. Uses their own session, so the
  database rules decide what is included.
*/
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Sign in first." }, { status: 401 });
  if (!(await allowAction(`export:${user.id}`, 5, "1 day"))) return NextResponse.json({ message: "Try again tomorrow." }, { status: 429 });

  const supabase = await createClient();
  const own = (table: string, column = "user_id") => supabase.from(table).select("*").eq(column, user.id);
  const [profile, topics, posts, anonymous, likes, bookmarks, subscriptions, follows, notifications, pollVotes, dealVotes, kits, flags, push] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("topics").select("id, title, slug, short_id, category_id, created_at").eq("author_id", user.id),
    supabase.from("posts").select("id, topic_id, post_number, body_md, created_at, edited_at, is_deleted").eq("author_id", user.id),
    own("anonymous_authors"),
    own("likes"),
    own("bookmarks"),
    own("topic_subscriptions"),
    own("category_follows"),
    own("notifications"),
    own("poll_votes"),
    own("deal_votes"),
    supabase.from("kits").select("*, kit_items (*)").eq("user_id", user.id),
    own("flags", "reporter_id"),
    supabase.from("push_subscriptions").select("created_at, user_agent").eq("user_id", user.id),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile.data,
    topics: topics.data ?? [],
    posts: posts.data ?? [],
    anonymous_posts: anonymous.data ?? [],
    likes: likes.data ?? [],
    bookmarks: bookmarks.data ?? [],
    watched_topics: subscriptions.data ?? [],
    followed_forums: follows.data ?? [],
    notifications: notifications.data ?? [],
    poll_votes: pollVotes.data ?? [],
    deal_votes: dealVotes.data ?? [],
    setups: kits.data ?? [],
    reports_you_made: flags.data ?? [],
    push_devices: push.data ?? [],
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="sellers-network-${user.profile.username}.json"`,
      "cache-control": "no-store",
    },
  });
}

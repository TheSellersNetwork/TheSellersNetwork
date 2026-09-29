import { NextResponse } from "next/server";
import { searchTopics } from "@/lib/forum/queries";
import { urls } from "@/lib/forum/urls";
import { allowAction, clientIp } from "@/lib/rate-limit";
import type { ForumHit } from "@/components/search/search-index";

/*
  Forum threads for instant search, from the same full-text search as
  /community/search. Row-level security decides what the caller can see, so
  the response is private to them and cached only briefly by their browser.
*/
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ results: [] });
  if (!(await allowAction(`search:${clientIp(request.headers)}`, 120, "10 minutes"))) {
    return NextResponse.json({ results: [], message: "Too many searches. Wait a minute and try again." }, { status: 429 });
  }
  const topics = await searchTopics(q, 6);
  const results: ForumHit[] = topics.map((t) => ({
    title: t.title,
    href: urls.topic(t),
    forum: t.category?.name ?? null,
    replies: t.reply_count ?? 0,
    solved: t.is_solved,
  }));
  return NextResponse.json({ results }, { headers: { "cache-control": "private, max-age=30" } });
}

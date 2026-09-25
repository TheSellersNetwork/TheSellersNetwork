import { NextResponse } from "next/server";
import { searchTopics } from "@/lib/forum/queries";

/* Similar topics for the composer, solved ones first. Public: the data is public anyway. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 8) return NextResponse.json([]);
  const topics = await searchTopics(q, 5);
  return NextResponse.json(
    topics.map((t) => ({ id: t.id, title: t.title, slug: t.slug, short_id: t.short_id, is_solved: t.is_solved, reply_count: t.reply_count })),
    { headers: { "cache-control": "public, max-age=60" } },
  );
}

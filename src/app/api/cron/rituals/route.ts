import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { postingAuthorId } from "@/lib/supabase/house-account";
import { renderMarkdown } from "@/lib/markdown/render";
import { getBlogPosts } from "@/lib/content/blog";
import { dueDebates, syncDebates } from "@/lib/content/debate-sync";
import { pickStarter, rituals, ritualDue, ritualTitle, type Starter } from "@/lib/rituals";

/*
  Posts today's ritual thread, if there is one. Runs every morning from
  vercel.json, protected by CRON_SECRET. ?force=<id> posts a given ritual
  regardless of the day, for testing. Templates live in
  content/templates/rituals and are the only thing staff need to edit.
  Afterwards it opens the forum thread and poll for any debate blog post
  whose UK publish date has arrived (src/lib/content/debate-sync.ts).
*/
/* Compares the bearer token in constant time, so its value cannot be guessed from response timing. */
function cronAuthorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!cronAuthorised(request)) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force");
  const today = new Date();
  const due = rituals.filter((r) => (force ? r.id === force : ritualDue(r, today)));

  const admin = createAdminClient();
  // Posted as the house account, The Sellers Network, falling back to SEED_AUTHOR_EMAIL.
  const authorId = await postingAuthorId(admin);
  const author = authorId ? { id: authorId } : null;
  if (!author) return NextResponse.json({ message: "No house account and SEED_AUTHOR_EMAIL is not set or missing" }, { status: 500 });

  const results: Record<string, string | Record<string, string>> = {};
  if (due.length === 0) results.message = "No rituals due today";
  for (const ritual of due) {
    if (ritual.starter) {
      results[ritual.id] = await postStarter(admin, author.id, today);
      continue;
    }
    const { data: category } = await admin.from("categories").select("id").eq("slug", ritual.categorySlug).maybeSingle();
    if (!category) {
      results[ritual.id] = "category missing, run the seed script";
      continue;
    }
    const title = ritualTitle(ritual, today);
    const { data: existing } = await admin.from("topics").select("id").eq("category_id", category.id).eq("title", title).maybeSingle();
    if (existing) {
      results[ritual.id] = "already posted";
      continue;
    }
    const template = await readFile(path.join(process.cwd(), "content", "templates", "rituals", ritual.template), "utf8");
    const body_md = template.replace(/\{\{week\}\}/g, today.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

    if (ritual.pin) {
      await admin.from("topics").update({ is_pinned: false }).eq("category_id", category.id).eq("is_pinned", true).ilike("title", `${ritual.titlePrefix}%`);
    }
    const { data: topic, error } = await admin.from("topics").insert({ title, category_id: category.id, author_id: author.id, is_pinned: ritual.pin }).select("id, slug, short_id").single();
    if (error || !topic) {
      results[ritual.id] = error?.message ?? "insert failed";
      continue;
    }
    await admin.from("posts").insert({ topic_id: topic.id, author_id: author.id, body_md, body_html: await renderMarkdown(body_md) });
    results[ritual.id] = `/community/t/${topic.slug}/${topic.short_id}`;
  }

  // Debate posts that are live today or earlier and have no thread yet.
  const debates = dueDebates(await getBlogPosts(), today);
  results.debates = debates.length === 0 ? { message: "No debates due" } : await syncDebates(admin, author.id, debates);
  return NextResponse.json(results);
}

/*
  A discussion starter: an open question from the team, from
  content/templates/rituals/starters.json, in the forum it belongs to. The
  list repeats, so a title is only skipped if it went up in the last 60 days.
*/
async function postStarter(admin: ReturnType<typeof createAdminClient>, authorId: string, today: Date): Promise<string> {
  const starters = JSON.parse(await readFile(path.join(process.cwd(), "content", "templates", "rituals", "starters.json"), "utf8")) as Starter[];
  const starter = pickStarter(starters, today);
  if (!starter) return "no starters";
  const { data: category } = await admin.from("categories").select("id").eq("slug", starter.forum).maybeSingle();
  if (!category) return `category ${starter.forum} missing`;
  const since = new Date(today.getTime() - 60 * 86_400_000).toISOString();
  const { data: recent } = await admin.from("topics").select("id").eq("title", starter.title).gte("created_at", since).limit(1);
  if (recent && recent.length > 0) return "already posted";
  const body_md = `${starter.body}

*A discussion starter from the team. Reply with your own experience.*`;
  const { data: topic, error } = await admin.from("topics").insert({ title: starter.title, category_id: category.id, author_id: authorId }).select("id, slug, short_id").single();
  if (error || !topic) return error?.message ?? "insert failed";
  await admin.from("posts").insert({ topic_id: topic.id, author_id: authorId, body_md, body_html: await renderMarkdown(body_md) });
  return `/community/t/${topic.slug}/${topic.short_id}`;
}

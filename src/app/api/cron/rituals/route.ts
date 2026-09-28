import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { findUserIdByEmail } from "@/lib/supabase/find-user";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMarkdown } from "@/lib/markdown/render";
import { rituals, ritualDue, ritualTitle } from "@/lib/rituals";

/*
  Posts today's ritual thread, if there is one. Runs every morning from
  vercel.json, protected by CRON_SECRET. ?force=<id> posts a given ritual
  regardless of the day, for testing. Templates live in
  content/templates/rituals and are the only thing staff need to edit.
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
  if (due.length === 0) return NextResponse.json({ message: "Nothing due today" });

  const admin = createAdminClient();
  const authorEmail = process.env.SEED_AUTHOR_EMAIL;
  if (!authorEmail) return NextResponse.json({ message: "SEED_AUTHOR_EMAIL is not set" }, { status: 500 });
  const authorId = await findUserIdByEmail(admin, authorEmail);
  const author = authorId ? { id: authorId } : null;
  if (!author) return NextResponse.json({ message: "Author account missing" }, { status: 500 });

  const results: Record<string, string> = {};
  for (const ritual of due) {
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
  return NextResponse.json(results);
}

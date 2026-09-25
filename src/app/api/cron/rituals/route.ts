import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderMarkdown } from "@/lib/markdown/render";
import { rituals, ritualTitle } from "@/lib/rituals";

/*
  Posts today's ritual thread, if there is one. Runs every morning from
  vercel.json, protected by CRON_SECRET. ?force=<id> posts a given ritual
  regardless of the day, for testing. Templates live in
  content/templates/rituals and are the only thing staff need to edit.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorised" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("force");
  const today = new Date();
  const due = rituals.filter((r) => (force ? r.id === force : r.weekday === today.getUTCDay()));
  if (due.length === 0) return NextResponse.json({ message: "Nothing due today" });

  const admin = createAdminClient();
  const authorEmail = process.env.SEED_AUTHOR_EMAIL;
  if (!authorEmail) return NextResponse.json({ message: "SEED_AUTHOR_EMAIL is not set" }, { status: 500 });
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const author = users?.users.find((u) => u.email?.toLowerCase() === authorEmail.toLowerCase());
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
